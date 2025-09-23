-- Let's strengthen the contatos RLS policies to eliminate any potential vulnerabilities
-- First, let's clean up conflicting policies and make the security more explicit

-- Drop the conflicting deny_anonymous policy that might be causing confusion
DROP POLICY IF EXISTS "contatos_deny_anonymous" ON public.contatos;

-- Drop the generic authenticated_only policy as it's redundant with owner-specific policies  
DROP POLICY IF EXISTS "contatos_authenticated_only" ON public.contatos;

-- Ensure we have strict owner-only access policies that are crystal clear
DROP POLICY IF EXISTS "contatos_owner_select" ON public.contatos;
DROP POLICY IF EXISTS "contatos_owner_insert" ON public.contatos; 
DROP POLICY IF EXISTS "contatos_owner_update" ON public.contatos;
DROP POLICY IF EXISTS "contatos_owner_delete" ON public.contatos;

-- Create new, more secure and explicit policies
CREATE POLICY "contatos_strict_owner_select" 
ON public.contatos 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.is_approved = true
  )
);

CREATE POLICY "contatos_strict_owner_insert" 
ON public.contatos 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.is_approved = true
  )
);

CREATE POLICY "contatos_strict_owner_update" 
ON public.contatos 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.is_approved = true
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

CREATE POLICY "contatos_strict_owner_delete" 
ON public.contatos 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.is_approved = true
  )
);

-- Add an explicit deny-all policy for any edge cases
CREATE POLICY "contatos_deny_all_others" 
ON public.contatos 
FOR ALL 
USING (false);

-- Ensure RLS is enabled (should already be, but let's be explicit)
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos FORCE ROW LEVEL SECURITY;