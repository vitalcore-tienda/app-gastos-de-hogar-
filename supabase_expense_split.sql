-- Ejecutar una vez en SQL Editor antes de publicar esta versión.
-- No cambia gastos existentes ni sus permisos.
BEGIN;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS paid_by text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS split jsonb;
NOTIFY pgrst, 'reload schema';
COMMIT;
