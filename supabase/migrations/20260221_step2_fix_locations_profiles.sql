-- STEP 2: Fix user_locations and profiles

-- ── user_locations ──
-- Drop ALL existing policies first (they reference user_id)
DROP POLICY IF EXISTS "Users can manage own location" ON public.user_locations;
DROP POLICY IF EXISTS "Users can manage their own location" ON public.user_locations;
DROP POLICY IF EXISTS "Admins can view all locations" ON public.user_locations;
DROP POLICY IF EXISTS "Anyone can manage locations" ON public.user_locations;

-- Now safe to drop FK and change type
ALTER TABLE public.user_locations DROP CONSTRAINT IF EXISTS user_locations_user_id_fkey;
ALTER TABLE public.user_locations ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Add unique constraint on user_id for upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_locations_user_id_key'
  ) THEN
    ALTER TABLE public.user_locations ADD CONSTRAINT user_locations_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Recreate open policy
CREATE POLICY "Anyone can manage locations" ON public.user_locations
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── profiles ──
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON public.profiles FOR UPDATE USING (true);
