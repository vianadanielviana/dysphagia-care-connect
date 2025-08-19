-- Fix RLS policies for profiles table to ensure admin can access
-- First, remove problematic policies that might be blocking admin access
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;

-- Create proper admin policies with explicit email check
CREATE POLICY "Admin can view all profiles" ON public.profiles
FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email') = 'viana.vianadaniel@outlook.com');

CREATE POLICY "Admin can update all profiles" ON public.profiles
FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'viana.vianadaniel@outlook.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'viana.vianadaniel@outlook.com');

-- Ensure admin can delete profiles (for deny functionality)
CREATE POLICY "Admin can delete profiles" ON public.profiles
FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'viana.vianadaniel@outlook.com');

-- Ensure users can still view and update their own profiles
-- Drop and recreate user policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);