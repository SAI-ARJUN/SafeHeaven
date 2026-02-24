-- Final fix: add unique constraint on tourist_id column so upserts work
-- Run in Supabase SQL Editor (tourist-safety-system project)

-- profiles: add unique on tourist_id
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tourist_id_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_tourist_id_key UNIQUE (tourist_id);

-- profiles: enable realtime so admin sees new tourists instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- user_locations: ensure realtime is enabled
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;
