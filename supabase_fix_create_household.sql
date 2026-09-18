-- Corrección puntual: ejecutar en SQL Editor. Conserva datos y permisos existentes.
BEGIN;

CREATE OR REPLACE FUNCTION public.create_household(p_name text)
RETURNS TABLE (
  id uuid,
  name text,
  invite_code text,
  created_by uuid,
  created_at timestamptz,
  user_role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_name, ''));
  v_email text;
  v_code text;
  v_household public.households%ROWTYPE;
  v_attempt integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para crear un hogar.' USING ERRCODE = '42501';
  END IF;

  IF char_length(v_name) < 1 OR char_length(v_name) > 80 THEN
    RAISE EXCEPTION 'El nombre del hogar debe tener entre 1 y 80 caracteres.' USING ERRCODE = '22023';
  END IF;

  -- Evita carreras entre dos pestañas/dispositivos de la misma cuenta.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_user_id::text));

  IF EXISTS (
    SELECT 1 FROM public.household_members AS hm WHERE hm.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Tu cuenta ya pertenece a un hogar.' USING ERRCODE = '23505';
  END IF;

  SELECT u.email INTO v_email FROM auth.users AS u WHERE u.id = v_user_id;

  FOR v_attempt IN 1..5 LOOP
    v_code := 'MH-' || upper(replace(pg_catalog.gen_random_uuid()::text, '-', ''));

    INSERT INTO public.households (name, invite_code, created_by)
    VALUES (v_name, v_code, v_user_id)
    ON CONFLICT ON CONSTRAINT households_invite_code_key DO NOTHING
    RETURNING * INTO v_household;

    EXIT WHEN FOUND;
  END LOOP;

  IF v_household.id IS NULL THEN
    RAISE EXCEPTION 'No se pudo generar un código de invitación. Intenta nuevamente.';
  END IF;

  INSERT INTO public.household_members (household_id, user_id, user_email, role)
  VALUES (v_household.id, v_user_id, v_email, 'admin');

  RETURN QUERY
  SELECT v_household.id, v_household.name, v_household.invite_code,
         v_household.created_by, v_household.created_at, 'admin'::text;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;

