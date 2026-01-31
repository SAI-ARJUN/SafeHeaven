-- Remove the foreign key constraint from profiles.user_id
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Enable realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;