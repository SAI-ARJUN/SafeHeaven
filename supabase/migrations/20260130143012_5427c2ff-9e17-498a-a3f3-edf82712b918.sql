-- Fix security: Add policies to block anonymous/public access to sensitive tables

-- Block public access to profiles table
CREATE POLICY "No public access to profiles" 
ON public.profiles 
FOR SELECT 
TO anon
USING (false);

-- Block public access to user_locations table
CREATE POLICY "No public access to user_locations" 
ON public.user_locations 
FOR SELECT 
TO anon
USING (false);

-- Add unique constraint on wallet_address to prevent multiple accounts with same wallet
ALTER TABLE public.profiles 
ADD CONSTRAINT unique_wallet_address UNIQUE (wallet_address);

-- Add unique constraint on email to prevent duplicate accounts
ALTER TABLE public.profiles 
ADD CONSTRAINT unique_email UNIQUE (email);