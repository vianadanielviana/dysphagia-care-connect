-- Fix critical security issue: documents table public read access
-- Remove public read access and restrict to authenticated users only

-- Drop the existing public read policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.documents;

-- Create secure policy for authenticated users only
CREATE POLICY "Enable read access for authenticated users only" 
ON public.documents 
FOR SELECT 
TO authenticated
USING (true);

-- Update insert policy to be more explicit about authentication requirement
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.documents;

CREATE POLICY "Enable insert for authenticated users only" 
ON public.documents 
FOR INSERT 
TO authenticated
WITH CHECK (true);