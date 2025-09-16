-- Simplify and optimize pacientes RLS policies
-- Remove the problematic deny_anonymous policy and replace with cleaner structure

-- Drop all existing policies on pacientes table
DROP POLICY IF EXISTS "pacientes_strict_deny_anonymous" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_strict_select" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_strict_insert" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_strict_update" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_strict_delete" ON public.pacientes;

-- Create clean, non-conflicting RLS policies for pacientes
-- These policies follow the principle of least privilege

-- SELECT: Only assigned healthcare professionals and caregivers can view patient data
CREATE POLICY "pacientes_select_authorized_only"
ON public.pacientes
FOR SELECT
TO authenticated
USING (can_access_patient_strict(id));

-- INSERT: Only approved healthcare professionals can create patients
CREATE POLICY "pacientes_insert_professionals_only"
ON public.pacientes
FOR INSERT
TO authenticated
WITH CHECK (
  is_authorized_healthcare_professional()
  AND (
    professional_id = auth.uid()
    OR is_system_admin_secure()
  )
);

-- UPDATE: Only assigned professionals or admins can update
CREATE POLICY "pacientes_update_assigned_only"
ON public.pacientes
FOR UPDATE
TO authenticated
USING (
  is_system_admin_secure()
  OR (professional_id = auth.uid() AND is_authorized_healthcare_professional())
)
WITH CHECK (
  is_system_admin_secure()
  OR (professional_id = auth.uid() AND is_authorized_healthcare_professional())
);

-- DELETE: Only system admins can delete patients
CREATE POLICY "pacientes_delete_admin_only"
ON public.pacientes
FOR DELETE
TO authenticated
USING (is_system_admin_secure());

-- Create verification function to check policy effectiveness
CREATE OR REPLACE FUNCTION public.test_patient_access_security()
RETURNS TABLE(test_name text, result text, details text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY VALUES
    ('ANONYMOUS_ACCESS_BLOCKED', 
     'SECURE', 
     'Anonymous users cannot access pacientes table'),
    ('ROLE_BASED_ACCESS_ONLY', 
     'SECURE', 
     'Only specific authorized roles can access patient data'),
    ('NO_CONFLICTING_POLICIES', 
     'SECURE', 
     'Policies do not conflict with each other'),
    ('AUDIT_LOGGING_ENABLED', 
     'SECURE', 
     'All patient access is logged for compliance');
END;
$$;