-- STEP 3: Create admin_notifications table
DROP TABLE IF EXISTS public.admin_notifications;

CREATE TABLE public.admin_notifications (
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
CREATE POLICY "Anyone can view notifications" ON public.admin_notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can insert notifications" ON public.admin_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update notifications" ON public.admin_notifications FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
