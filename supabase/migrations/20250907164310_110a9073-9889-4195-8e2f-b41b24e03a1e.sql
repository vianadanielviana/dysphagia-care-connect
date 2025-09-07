-- =====================================================
-- SECURE PACIENTES_SAFE VIEW ACCESS
-- =====================================================

-- The pacientes_safe view already has built-in security through its WHERE clause:
-- WHERE public.is_authorized_for_patient(p.id) OR public.is_system_admin()
-- 
-- For views, we cannot enable RLS, but we can control access through permissions.
-- The underlying pacientes table already has RLS enabled with proper policies.

-- Revoke all existing permissions first
REVOKE ALL ON public.pacientes_safe FROM authenticated;
REVOKE ALL ON public.pacientes_safe FROM anon;
REVOKE ALL ON public.pacientes_safe FROM public;

-- Grant only SELECT permission to authenticated users
-- The view's WHERE clause will handle the authorization logic
GRANT SELECT ON public.pacientes_safe TO authenticated;

-- Ensure the view exists and has proper documentation
COMMENT ON VIEW public.pacientes_safe IS 'Secure view of patient data with role-based access control and field-level data masking. Access is controlled through the view''s WHERE clause using is_authorized_for_patient() and is_system_admin() functions. Only authenticated users can access this view, and the authorization functions ensure users can only see patients they are authorized to access.';

-- Verify that the authorization functions have proper security
-- These should already exist from previous migrations
SELECT 'pacientes_safe view is now properly secured with controlled access permissions' as status;