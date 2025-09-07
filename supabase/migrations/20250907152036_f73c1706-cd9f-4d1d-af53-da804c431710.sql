-- Add is_admin column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Set admin status for the main admin user
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'viana.vianadaniel@outlook.com';

-- Create index for better performance
CREATE INDEX idx_profiles_is_admin ON public.profiles(is_admin) 
WHERE is_admin = true;