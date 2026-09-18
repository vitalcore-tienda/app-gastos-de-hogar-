-- =============================================================================
-- MI HOGAR: refuerzo de acceso a hogares e invitaciones
-- Ejecutar UNA VEZ después de supabase_schema.sql en el SQL Editor de Supabase.
-- No contiene credenciales ni debe ejecutarse desde el navegador.
-- =============================================================================

BEGIN;

-- Los códigos antiguos, cortos y fáciles de adivinar se reemplazan una sola vez
-- por códigos de 122 bits de entropía (un UUID v4 sin guiones).
UPDATE public.households
SET invite_code = 'MH-' || upper(replace(gen_random_uuid()::text, '-', ''))
WHERE invite_code !~ '^MH-[A-F0-9]{32}$';

-- Función auxiliar usada únicamente por las políticas RLS. El esquema private
-- no se expone por la API y el search_path vacío evita objetos manipulados por
-- el cliente.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_household_member(p_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (select auth.uid()) IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.household_members AS hm
       WHERE hm.household_id = p_household_id
         AND hm.user_id = (select auth.uid())
     );
$$;

REVOKE ALL ON FUNCTION private.is_household_member(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_household_member(uuid) TO authenticated;

-- Un usuario puede leer sólo su propio hogar. No hay SELECT público por código.
DROP POLICY IF EXISTS "Ver hogares donde soy miembro" ON public.households;
DROP POLICY IF EXISTS "Buscar o ver hogares" ON public.households;
DROP POLICY IF EXISTS "Crear nuevo hogar" ON public.households;
DROP POLICY IF EXISTS "Actualizar mi hogar" ON public.households;
DROP POLICY IF EXISTS "Los integrantes ven su hogar" ON public.households;
CREATE POLICY "Los integrantes ven su hogar"
  ON public.households
  FOR SELECT TO authenticated
  USING ((select private.is_household_member(id)));

-- La membresía sólo se crea desde los RPC de abajo; no mediante inserts directos.
DROP POLICY IF EXISTS "Ver miembros de mi hogar" ON public.household_members;
DROP POLICY IF EXISTS "Unirse o agregar miembros" ON public.household_members;
DROP POLICY IF EXISTS "Actualizar miembros" ON public.household_members;
DROP POLICY IF EXISTS "Los integrantes ven los miembros de su hogar" ON public.household_members;
CREATE POLICY "Los integrantes ven los miembros de su hogar"
  ON public.household_members
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR (select private.is_household_member(household_id))
  );

-- Reemplazar también las políticas de datos para mantener una validación
-- explícita al insertar o actualizar filas.
DROP POLICY IF EXISTS "Acceso total a servicios de mi hogar" ON public.services;
DROP POLICY IF EXISTS "Acceso total a pagos de mi hogar" ON public.payments;
DROP POLICY IF EXISTS "Acceso total a gastos de mi hogar" ON public.expenses;
DROP POLICY IF EXISTS "Acceso total a tarjetas de mi hogar" ON public.cards;
DROP POLICY IF EXISTS "Acceso total a pagos de tarjetas de mi hogar" ON public.card_payments;
DROP POLICY IF EXISTS "Acceso total a presupuestos de mi hogar" ON public.budgets;

DROP FUNCTION IF EXISTS public.is_household_member(uuid);

CREATE POLICY "Datos del hogar: servicios"
  ON public.services FOR ALL TO authenticated
  USING ((select private.is_household_member(household_id)))
  WITH CHECK ((select private.is_household_member(household_id)));

CREATE POLICY "Datos del hogar: pagos"
  ON public.payments FOR ALL TO authenticated
  USING ((select private.is_household_member(household_id)))
  WITH CHECK ((select private.is_household_member(household_id)));

CREATE POLICY "Datos del hogar: gastos"
  ON public.expenses FOR ALL TO authenticated
  USING ((select private.is_household_member(household_id)))
  WITH CHECK ((select private.is_household_member(household_id)));

CREATE POLICY "Datos del hogar: tarjetas"
  ON public.cards FOR ALL TO authenticated
  USING ((select private.is_household_member(household_id)))
  WITH CHECK ((select private.is_household_member(household_id)));

CREATE POLICY "Datos del hogar: pagos de tarjetas"
  ON public.card_payments FOR ALL TO authenticated
  USING ((select private.is_household_member(household_id)))
  WITH CHECK ((select private.is_household_member(household_id)));

CREATE POLICY "Datos del hogar: presupuestos"
  ON public.budgets FOR ALL TO authenticated
  USING ((select private.is_household_member(household_id)))
  WITH CHECK ((select private.is_household_member(household_id)));

-- Crea el hogar y su primera membresía dentro de la misma transacción.
-- La función está expuesta intencionalmente sólo a usuarios autenticados: valida
-- auth.uid(), limita la entrada y nunca acepta IDs, roles ni códigos del cliente.
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

-- Une a la cuenta autenticada con el hogar que posee el código. Primero se
-- comprueba la membresía propia, así que los mensajes no sirven para enumerar
-- códigos. Sólo se acepta el formato fuerte emitido por create_household.
CREATE OR REPLACE FUNCTION public.join_household_by_invite_code(p_invite_code text)
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
  v_code text := upper(btrim(coalesce(p_invite_code, '')));
  v_email text;
  v_household public.households%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para unirte a un hogar.' USING ERRCODE = '42501';
  END IF;

  -- Serializa también crear/unirse desde varias pestañas de una misma cuenta.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_user_id::text));

  IF EXISTS (
    SELECT 1 FROM public.household_members AS hm WHERE hm.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Tu cuenta ya pertenece a un hogar.' USING ERRCODE = '23505';
  END IF;

  IF v_code !~ '^MH-[A-F0-9]{32}$' THEN
    RAISE EXCEPTION 'No se pudo unir al hogar con ese código.' USING ERRCODE = '22023';
  END IF;

  SELECT h.* INTO v_household
  FROM public.households AS h
  WHERE h.invite_code = v_code;

  IF NOT FOUND THEN
    -- Mismo mensaje para un código inexistente: no expone qué hogares existen.
    RAISE EXCEPTION 'No se pudo unir al hogar con ese código.' USING ERRCODE = '22023';
  END IF;

  SELECT u.email INTO v_email FROM auth.users AS u WHERE u.id = v_user_id;

  INSERT INTO public.household_members (household_id, user_id, user_email, role)
  VALUES (v_household.id, v_user_id, v_email, 'member');

  RETURN QUERY
  SELECT v_household.id, v_household.name, v_household.invite_code,
         v_household.created_by, v_household.created_at, 'member'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.create_household(text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.join_household_by_invite_code(text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_household(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household_by_invite_code(text) TO authenticated;

-- La Data API puede conservar el esquema anterior durante unos segundos.
NOTIFY pgrst, 'reload schema';

COMMIT;
