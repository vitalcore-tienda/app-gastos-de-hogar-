-- ==============================================================================
-- ESQUEMA DE BASE DE DATOS SUPABASE - MI HOGAR (SERVICIOS Y GASTOS FAMILIARES)
-- ==============================================================================
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto de Supabase (https://supabase.com/dashboard)
-- 2. Entra en "SQL Editor" en el menú lateral izquierdo.
-- 3. Crea una "New Query", pega todo este código y presiona "RUN".
-- ==============================================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: HOGARES (HOUSEHOLDS)
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA: INTEGRANTES DEL HOGAR (HOUSEHOLD MEMBERS)
CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  role TEXT DEFAULT 'admin',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, user_id)
);

-- 3. TABLA: SERVICIOS DEL HOGAR (SERVICES)
CREATE TABLE IF NOT EXISTS public.services (
  id TEXT PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  provider TEXT,
  due_day INTEGER NOT NULL,
  default_amount NUMERIC DEFAULT 0,
  client_code TEXT,
  notes TEXT,
  auto_debit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABLA: PAGOS DE SERVICIOS (PAYMENTS)
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  service_id TEXT NOT NULL,
  year_month TEXT NOT NULL,
  paid_amount NUMERIC NOT NULL,
  paid_date TEXT NOT NULL,
  method TEXT,
  receipt_note TEXT,
  paid_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABLA: GASTOS DIARIOS / COTIDIANOS (EXPENSES)
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABLA: TARJETAS Y COMPRAS EN CUOTAS (CARDS)
CREATE TABLE IF NOT EXISTS public.cards (
  id TEXT PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  card_name TEXT NOT NULL,
  card_brand TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  total_installments INTEGER NOT NULL,
  installment_amount NUMERIC NOT NULL,
  start_year_month TEXT NOT NULL,
  due_day INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABLA: PAGOS DE CUOTAS DE TARJETAS (CARD PAYMENTS)
CREATE TABLE IF NOT EXISTS public.card_payments (
  id TEXT PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  card_id TEXT NOT NULL,
  year_month TEXT NOT NULL,
  paid_amount NUMERIC NOT NULL,
  paid_date TEXT NOT NULL,
  method TEXT,
  receipt_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TABLA: PRESUPUESTOS MENSUALES (BUDGETS)
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  year_month TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  is_default BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, year_month)
);

-- ==============================================================================
-- ÍNDICES PARA ALTO RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_members_user ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_household ON public.household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_services_household ON public.services(household_id);
CREATE INDEX IF NOT EXISTS idx_payments_household ON public.payments(household_id);
CREATE INDEX IF NOT EXISTS idx_expenses_household ON public.expenses(household_id);
CREATE INDEX IF NOT EXISTS idx_cards_household ON public.cards(household_id);
CREATE INDEX IF NOT EXISTS idx_card_payments_household ON public.card_payments(household_id);
CREATE INDEX IF NOT EXISTS idx_budgets_household ON public.budgets(household_id);

-- ==============================================================================
-- FUNCIÓN DE SEGURIDAD AUXILIAR (EVITA RECURSIÓN INFINITA EN RLS)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_household_member(h_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = h_id AND user_id = auth.uid()
  );
$$;

-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 1. Households: Buscar, Ver y Crear
DROP POLICY IF EXISTS "Ver hogares donde soy miembro" ON public.households;
DROP POLICY IF EXISTS "Buscar o ver hogares" ON public.households;
CREATE POLICY "Buscar o ver hogares" ON public.households
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Crear nuevo hogar" ON public.households;
CREATE POLICY "Crear nuevo hogar" ON public.households
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Actualizar mi hogar" ON public.households;
CREATE POLICY "Actualizar mi hogar" ON public.households
  FOR UPDATE TO authenticated USING (public.is_household_member(id));

-- 2. Household Members: Ver mis membresías y unirme
DROP POLICY IF EXISTS "Ver miembros de mi hogar" ON public.household_members;
CREATE POLICY "Ver miembros de mi hogar" ON public.household_members
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.is_household_member(household_id)
  );

DROP POLICY IF EXISTS "Unirse o agregar miembros" ON public.household_members;
CREATE POLICY "Unirse o agregar miembros" ON public.household_members
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Actualizar miembros" ON public.household_members;
CREATE POLICY "Actualizar miembros" ON public.household_members
  FOR UPDATE TO authenticated USING (
    user_id = auth.uid() OR public.is_household_member(household_id)
  );

-- 3. Tablas de datos (Services, Payments, Expenses, Cards, Card Payments, Budgets)
-- Permite todas las operaciones (SELECT, INSERT, UPDATE, DELETE) si el usuario pertenece al hogar

DROP POLICY IF EXISTS "Acceso total a servicios de mi hogar" ON public.services;
CREATE POLICY "Acceso total a servicios de mi hogar" ON public.services
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Acceso total a pagos de mi hogar" ON public.payments;
CREATE POLICY "Acceso total a pagos de mi hogar" ON public.payments
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Acceso total a gastos de mi hogar" ON public.expenses;
CREATE POLICY "Acceso total a gastos de mi hogar" ON public.expenses
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Acceso total a tarjetas de mi hogar" ON public.cards;
CREATE POLICY "Acceso total a tarjetas de mi hogar" ON public.cards
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Acceso total a pagos de tarjetas de mi hogar" ON public.card_payments;
CREATE POLICY "Acceso total a pagos de tarjetas de mi hogar" ON public.card_payments
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Acceso total a presupuestos de mi hogar" ON public.budgets;
CREATE POLICY "Acceso total a presupuestos de mi hogar" ON public.budgets
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

-- ==============================================================================
-- HABILITAR SUPABASE REALTIME (ACTUALIZACIONES EN VIVO PARA TODOS LOS DISPOSITIVOS)
-- ==============================================================================

DO $$
BEGIN
  -- Intentar agregar las tablas a la publicación de realtime si no están ya agregadas
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.card_payments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.household_members;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
