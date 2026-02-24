-- ═══════════════════════════════════════════════════════
-- Fix alerts table
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_user_id_fkey;
-- Add missing columns if they don't exist yet
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS alert_type TEXT DEFAULT 'status_change';
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS lat  DOUBLE PRECISION;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS lng  DOUBLE PRECISION;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS zone_name  TEXT;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS zone_level TEXT;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS dismissed  BOOLEAN DEFAULT false;
-- Drop old check constraint then recreate with 'emergency' included
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_alert_type_check;
ALTER TABLE public.alerts ADD CONSTRAINT alerts_alert_type_check
  CHECK (alert_type IN ('status_change', 'danger_zone_entry', 'emergency'));

DROP POLICY IF EXISTS "Users can create their own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Admins can view all alerts"       ON public.alerts;
DROP POLICY IF EXISTS "Admins can update alerts"         ON public.alerts;
CREATE POLICY "Anyone can insert alerts" ON public.alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view alerts"   ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Anyone can update alerts" ON public.alerts FOR UPDATE USING (true);

-- ═══════════════════════════════════════════════════════
-- Fix user_locations table
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.user_locations DROP CONSTRAINT IF EXISTS user_locations_user_id_fkey;

DROP POLICY IF EXISTS "Users can manage their own location" ON public.user_locations;
DROP POLICY IF EXISTS "Admins can view all locations"       ON public.user_locations;
CREATE POLICY "Anyone can manage locations" ON public.user_locations
  FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════
-- Fix profiles table
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

DROP POLICY IF EXISTS "Users can view their own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"       ON public.profiles;
CREATE POLICY "Anyone can view profiles"   ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON public.profiles FOR UPDATE USING (true);

-- ═══════════════════════════════════════════════════════
-- Create admin_notifications table
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  admin_wallet TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT DEFAULT 'warning'
    CHECK (notification_type IN ('info', 'warning', 'evacuation', 'danger')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view notifications"   ON public.admin_notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Anyone can update notifications" ON public.admin_notifications;
CREATE POLICY "Anyone can view notifications"   ON public.admin_notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can insert notifications" ON public.admin_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update notifications" ON public.admin_notifications FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
