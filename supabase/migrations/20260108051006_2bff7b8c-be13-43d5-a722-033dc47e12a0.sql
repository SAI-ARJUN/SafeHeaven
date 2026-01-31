-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  dob DATE,
  wallet_address TEXT,
  status TEXT DEFAULT 'safe' CHECK (status IN ('safe', 'alert', 'danger')),
  tourist_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table for admin management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create danger_zones table
CREATE TABLE public.danger_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius DOUBLE PRECISION NOT NULL,
  level TEXT DEFAULT 'medium' CHECK (level IN ('low', 'medium', 'high')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tourist_id TEXT NOT NULL,
  username TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('safe', 'alert', 'danger')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  zone_name TEXT,
  zone_level TEXT,
  alert_type TEXT DEFAULT 'status_change' CHECK (alert_type IN ('status_change', 'danger_zone_entry')),
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_locations table for live tracking
CREATE TABLE public.user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tourist_id TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.danger_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Generate unique tourist ID function
CREATE OR REPLACE FUNCTION public.generate_tourist_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_id TEXT;
BEGIN
  new_id := 'TID-' || upper(to_hex(extract(epoch from now())::bigint)) || '-' || upper(substr(md5(random()::text), 1, 4));
  RETURN new_id;
END;
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Danger zones policies (public read, admin write)
CREATE POLICY "Anyone can view danger zones"
ON public.danger_zones FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage danger zones"
ON public.danger_zones FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Alerts policies
CREATE POLICY "Users can create their own alerts"
ON public.alerts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all alerts"
ON public.alerts FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update alerts"
ON public.alerts FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- User locations policies
CREATE POLICY "Users can manage their own location"
ON public.user_locations FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all locations"
ON public.user_locations FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for alerts and locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_locations_updated_at
BEFORE UPDATE ON public.user_locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();