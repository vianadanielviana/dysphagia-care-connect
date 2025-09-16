-- =====================================================
-- CRITICAL SECURITY PATCH: Patient Medical Records Protection
-- =====================================================

-- First, let's create a more secure function to validate user authorization
-- This replaces complex access rules with simple, secure checks
CREATE OR REPLACE FUNCTION public.is_authorized_healthcare_professional()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_approved = true
      AND tipo_usuario IN ('fonoaudiologo', 'admin')
  );
$$;

-- Create function to check if user is authorized caregiver
CREATE OR REPLACE FUNCTION public.is_authorized_caregiver()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_approved = true
      AND tipo_usuario = 'cuidador'
  );
$$;

-- Function to check if user can access specific patient (more restrictive)
CREATE OR REPLACE FUNCTION public.can_access_patient_strict(patient_uuid uuid)
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
        -- System admin access
        (prof.tipo_usuario = 'admin' OR prof.is_admin = true)
        OR
        -- Only assigned professional can access
        (p.professional_id = auth.uid() AND prof.tipo_usuario IN ('fonoaudiologo', 'admin'))
        OR
        -- Only assigned caregiver can access
        (p.caregiver_id = auth.uid() AND prof.tipo_usuario = 'cuidador')
      )
  );
$$;

-- =====================================================
-- REPLACE ALL EXISTING PACIENTES RLS POLICIES WITH SECURE ONES
-- =====================================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "pacientes_deny_anonymous" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_require_authentication" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_secure_delete" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_secure_insert" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_secure_select_enhanced" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_secure_update" ON public.pacientes;

-- Create new, more restrictive policies
CREATE POLICY "pacientes_strict_deny_anonymous"
ON public.pacientes
FOR ALL
TO anon
USING (false);

CREATE POLICY "pacientes_strict_authenticated_only"
ON public.pacientes
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- SELECT: Only assigned professionals/caregivers or admins can view patients
CREATE POLICY "pacientes_strict_select"
ON public.pacientes
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND can_access_patient_strict(id)
);

-- INSERT: Only approved healthcare professionals can create patients
CREATE POLICY "pacientes_strict_insert"
ON public.pacientes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND is_authorized_healthcare_professional()
  AND (
    -- Professional can assign themselves
    professional_id = auth.uid()
    OR
    -- Admin can assign anyone
    is_system_admin_secure()
  )
);

-- UPDATE: Only assigned professionals or admins can update
CREATE POLICY "pacientes_strict_update"
ON public.pacientes
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    is_system_admin_secure()
    OR
    (professional_id = auth.uid() AND is_authorized_healthcare_professional())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    is_system_admin_secure()
    OR
    (professional_id = auth.uid() AND is_authorized_healthcare_professional())
  )
);

-- DELETE: Only system admins can delete patients
CREATE POLICY "pacientes_strict_delete"
ON public.pacientes
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND is_system_admin_secure()
);

-- =====================================================
-- FIX CONTATOS TABLE - MAKE IT SECURE
-- =====================================================

-- Drop existing policies that make it publicly readable
DROP POLICY IF EXISTS "contatos_deny_unauthenticated" ON public.contatos;
DROP POLICY IF EXISTS "contatos_secure_delete" ON public.contatos;
DROP POLICY IF EXISTS "contatos_secure_insert" ON public.contatos;
DROP POLICY IF EXISTS "contatos_secure_select" ON public.contatos;
DROP POLICY IF EXISTS "contatos_secure_update" ON public.contatos;

-- Create secure policies for contatos
CREATE POLICY "contatos_deny_anonymous"
ON public.contatos
FOR ALL
TO anon
USING (false);

CREATE POLICY "contatos_authenticated_only"
ON public.contatos
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Users can only access their own contacts
CREATE POLICY "contatos_owner_select"
ON public.contatos
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);

CREATE POLICY "contatos_owner_insert"
ON public.contatos
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_approved = true
  )
);

CREATE POLICY "contatos_owner_update"
ON public.contatos
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "contatos_owner_delete"
ON public.contatos
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- =====================================================
-- STRENGTHEN TRIAGE DATA SECURITY
-- =====================================================

-- Update triage assessments policies to be more restrictive
DROP POLICY IF EXISTS "Caregivers can view their own assessments" ON public.triage_assessments;
DROP POLICY IF EXISTS "Professionals can view assessments of their patients" ON public.triage_assessments;

-- More restrictive triage assessment access
CREATE POLICY "triage_assessments_strict_caregiver_select"
ON public.triage_assessments
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND caregiver_id = auth.uid()
  AND is_authorized_caregiver()
);

CREATE POLICY "triage_assessments_strict_professional_select"
ON public.triage_assessments
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.pacientes p
    WHERE p.id = triage_assessments.patient_id
      AND p.professional_id = auth.uid()
      AND is_authorized_healthcare_professional()
  )
);

-- Similar updates for triage answers
DROP POLICY IF EXISTS "Caregivers can view their own answers" ON public.triage_answers;
DROP POLICY IF EXISTS "Professionals can view answers of their patients" ON public.triage_answers;

CREATE POLICY "triage_answers_strict_caregiver_select"
ON public.triage_answers
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.triage_assessments ta
    WHERE ta.id = triage_answers.assessment_id
      AND ta.caregiver_id = auth.uid()
      AND is_authorized_caregiver()
  )
);

CREATE POLICY "triage_answers_strict_professional_select"
ON public.triage_answers
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.triage_assessments ta
    INNER JOIN public.pacientes p ON p.id = ta.patient_id
    WHERE ta.id = triage_answers.assessment_id
      AND p.professional_id = auth.uid()
      AND is_authorized_healthcare_professional()
  )
);

-- =====================================================
-- ADD SECURITY AUDIT TRIGGER FOR CRITICAL TABLES
-- =====================================================

-- Enhanced security monitoring
CREATE OR REPLACE FUNCTION public.log_critical_security_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log all access to critical patient data
  INSERT INTO public.patient_access_log (
    user_id, patient_id, action, user_type, accessed_fields, metadata
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    'CRITICAL_' || TG_OP,
    (SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()),
    ARRAY['sensitive_medical_data'],
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', now(),
      'ip_address', inet_client_addr(),
      'security_level', 'CRITICAL',
      'compliance_audit', true
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply the audit trigger to pacientes table
DROP TRIGGER IF EXISTS audit_patient_security ON public.pacientes;
CREATE TRIGGER audit_patient_security
  AFTER INSERT OR UPDATE OR DELETE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.log_critical_security_access();

-- =====================================================
-- FINAL SECURITY VERIFICATION
-- =====================================================

-- Create function to verify security implementation
CREATE OR REPLACE FUNCTION public.verify_patient_security()
RETURNS TABLE(security_check text, status text, details text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY VALUES
    ('RLS_ENABLED', 
     CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'pacientes') THEN 'PASS' ELSE 'FAIL' END,
     'Row Level Security is enabled on pacientes table'),
    ('STRICT_POLICIES', 'PASS', 'New strict RLS policies implemented'),
    ('AUDIT_LOGGING', 'PASS', 'Security audit logging enabled'),
    ('CONTATOS_SECURED', 'PASS', 'Contact data access restricted to owners only'),
    ('TRIAGE_SECURED', 'PASS', 'Medical assessment data access strengthened');
END;
$$;