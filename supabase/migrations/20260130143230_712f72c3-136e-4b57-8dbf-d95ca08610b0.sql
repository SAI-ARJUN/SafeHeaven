-- Allow users to view their own alerts
CREATE POLICY "Users can view their own alerts" 
ON public.alerts 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to dismiss their own alerts
CREATE POLICY "Users can update their own alerts" 
ON public.alerts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Fix function search_path for generate_tourist_id
CREATE OR REPLACE FUNCTION public.generate_tourist_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  new_id TEXT;
BEGIN
  new_id := 'TID-' || upper(to_hex(extract(epoch from now())::bigint)) || '-' || upper(substr(md5(random()::text), 1, 4));
  RETURN new_id;
END;
$function$;

-- Fix function search_path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;