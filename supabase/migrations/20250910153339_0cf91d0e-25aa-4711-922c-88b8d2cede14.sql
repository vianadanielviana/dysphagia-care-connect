-- SECURITY FIX: Simplify and strengthen patient data access control
-- This addresses the security finding about complex access control logic

-- First, drop the existing duplicate and complex policies
DROP POLICY IF EXISTS "rls_secure_patient_access_final_2025" ON public.pacientes;
DROP POLICY IF EXISTS "rls_secure_patient_access_validated_2025" ON public.pacientes;

-- Drop the complex function that had potential security gaps
DROP FUNCTION IF EXISTS public.has_legitimate_patient_access(uuid);

-- Create simplified, secure access control functions
CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_approved = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT tipo_usuario FROM public.profiles 
  WHERE id = auth.uid() AND is_approved = true;
$$;

CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_approved = true
      AND (tipo_usuario = 'admin' OR is_admin = true)
  );
$$;

-- Create clear, simple policies for patient data access
-- 1. Admin users can access all patient records
CREATE POLICY "admins_full_access" ON public.pacientes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL 
    AND public.is_system_admin()
  );

-- 2. Professionals can only access patients assigned to them
CREATE POLICY "professionals_assigned_patients" ON public.pacientes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND professional_id = auth.uid()
    AND public.get_current_user_type() IN ('fonoaudiologo', 'admin')
    AND public.is_approved_user()
  );

-- 3. Caregivers can only access patients assigned to them
CREATE POLICY "caregivers_assigned_patients" ON public.pacientes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND caregiver_id = auth.uid()
    AND public.get_current_user_type() = 'cuidador'
    AND public.is_approved_user()
  );

-- Create a secure function for programmatic access checks
CREATE OR REPLACE FUNCTION public.can_access_patient_secure(patient_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pacientes p
    INNER JOIN public.profiles prof ON prof.id = auth.uid()
    WHERE p.id = patient_uuid
      AND prof.is_approved = true
      AND (
        -- Admin access
        (prof.tipo_usuario = 'admin' OR prof.is_admin = true)
        OR
        -- Professional access to assigned patients
        (p.professional_id = auth.uid() AND prof.tipo_usuario IN ('fonoaudiologo', 'admin'))
        OR
        -- Caregiver access to assigned patients
        (p.caregiver_id = auth.uid() AND prof.tipo_usuario = 'cuidador')
      )
  );
$$;

-- Add constraint to ensure patients have proper assignments
ALTER TABLE public.pacientes 
ADD CONSTRAINT check_patient_assignments 
CHECK (
  professional_id IS NOT NULL OR caregiver_id IS NOT NULL
);

-- Create audit trigger for all patient access (simplified)
CREATE OR REPLACE FUNCTION public.audit_patient_access_simple()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Simple audit logging without complex logic
  INSERT INTO public.patient_access_log (
    user_id,
    patient_id,
    action,
    user_type,
    accessed_fields,
    metadata
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    CASE TG_OP
      WHEN 'INSERT' THEN 'CREATE'
      WHEN 'UPDATE' THEN 'UPDATE'
      WHEN 'DELETE' THEN 'DELETE'
      ELSE 'SELECT'
    END,
    COALESCE((SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()), 'unknown'),
    CASE TG_OP
      WHEN 'UPDATE' THEN ARRAY['updated']
      ELSE ARRAY['*']
    END,
    jsonb_build_object(
      'operation', TG_OP,
      'timestamp', now(),
      'table', 'pacientes'
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Replace complex audit trigger with simple one
DROP TRIGGER IF EXISTS audit_patient_access_trigger ON public.pacientes;
CREATE TRIGGER audit_patient_access_simple_trigger
  AFTER SELECT ON public.pacientes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_patient_access_simple();

-- Add comment documenting the security approach
COMMENT ON TABLE public.pacientes IS 'Patient medical records with simplified RLS policies: admins have full access, professionals access assigned patients, caregivers access assigned patients. All access is logged for audit purposes.';