-- ═══════════════════════════════════════════════════════
-- Enable Realtime for all tables
-- Run this in Supabase SQL Editor to enable real-time updates
-- ═══════════════════════════════════════════════════════

-- Enable realtime for profiles table (for status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Enable realtime for user_locations table (for live tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;

-- Enable realtime for alerts table (for emergency alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- Verify realtime is enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
