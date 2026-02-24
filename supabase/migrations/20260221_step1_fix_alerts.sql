-- STEP 1: Fix alerts table
-- Drop EVERY possible policy on alerts (covers all naming variants)
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'alerts' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.alerts', pol.policyname);
  END LOOP;
END $$;

-- Now safe to drop FK and change type
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_user_id_fkey;
ALTER TABLE public.alerts ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Add missing columns
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS alert_type TEXT DEFAULT 'status_change';
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS lat  DOUBLE PRECISION;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS lng  DOUBLE PRECISION;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS zone_name  TEXT;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS zone_level TEXT;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS dismissed  BOOLEAN DEFAULT false;

-- Fix CHECK constraint
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_alert_type_check;
ALTER TABLE public.alerts ADD CONSTRAINT alerts_alert_type_check
  CHECK (alert_type IN ('status_change', 'danger_zone_entry', 'emergency'));

-- Recreate open policies
CREATE POLICY "Anyone can insert alerts" ON public.alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view alerts" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Anyone can update alerts" ON public.alerts FOR UPDATE USING (true);
