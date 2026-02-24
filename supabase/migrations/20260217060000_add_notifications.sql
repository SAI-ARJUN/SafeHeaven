-- Add status column to user_locations table
ALTER TABLE public.user_locations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'safe';

-- Create admin_notifications table for admin-to-tourist alerts
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  admin_wallet TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT DEFAULT 'warning' CHECK (notification_type IN ('info', 'warning', 'evacuation', 'danger')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Everyone can read notifications (tourists need to see their own)
CREATE POLICY "Anyone can view notifications"
ON public.admin_notifications FOR SELECT
USING (true);

-- Anyone can insert notifications (admin inserts via anon key)
CREATE POLICY "Anyone can insert notifications"
ON public.admin_notifications FOR INSERT
WITH CHECK (true);

-- Anyone can update notifications (tourist marks as read)
CREATE POLICY "Anyone can update notifications"
ON public.admin_notifications FOR UPDATE
USING (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
