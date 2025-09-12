-- CRITICAL SECURITY FIX: Patient Medical Records Protection
-- This migration fixes critical security vulnerabilities in patient data access

-- ====== STEP 1: Fix pacientes table RLS policies ======

-- Drop the problematic deny policy and recreate properly
DROP POLICY IF EXISTS "pacientes_deny_anonymous_access" ON public.pacientes;

-- Create a strong authentication requirement policy (first line of defense)
CREATE POLICY "pacientes_require_authentication" 
ON public.pacientes 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Recreate specific access policies with proper authentication checks
DROP POLICY IF EXISTS "pacientes_select_policy" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_select_policy_enhanced" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_insert_policy" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_update_policy" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_delete_policy" ON public.pacientes;

-- CREATE SECURE SELECT POLICY
CREATE POLICY "pacientes_secure_select" 
ON public.pacientes 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- System admin access
    is_system_admin_secure() 
    OR 
    -- Professional access to assigned patients only
    (
      professional_id = auth.uid() AND 
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.is_approved = true 
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
      )
    )
    OR 
    -- Caregiver access to assigned patients only
    (
      caregiver_id = auth.uid() AND 
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.is_approved = true 
        AND p.tipo_usuario = 'cuidador'
      )
    )
  )
);

-- CREATE SECURE INSERT POLICY
CREATE POLICY "pacientes_secure_insert" 
ON public.pacientes 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.is_approved = true 
    AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
  )
);

-- CREATE SECURE UPDATE POLICY
CREATE POLICY "pacientes_secure_update" 
ON public.pacientes 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    is_system_admin_secure() 
    OR 
    (
      professional_id = auth.uid() AND 
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.is_approved = true 
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
      )
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_system_admin_secure() 
    OR 
    (
      professional_id = auth.uid() AND 
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.is_approved = true 
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
      )
    )
  )
);

-- CREATE SECURE DELETE POLICY
CREATE POLICY "pacientes_secure_delete" 
ON public.pacientes 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND is_system_admin_secure()
);

-- DENY ALL ACCESS TO ANONYMOUS USERS (CRITICAL SECURITY)
CREATE POLICY "pacientes_deny_anonymous" 
ON public.pacientes 
FOR ALL 
TO anon 
USING (false);

-- ====== STEP 2: Fix contatos table RLS policies ======

-- Drop problematic policy and recreate
DROP POLICY IF EXISTS "contatos_deny_anonymous_access" ON public.contatos;

-- Create authentication requirement
CREATE POLICY "contatos_require_authentication" 
ON public.contatos 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- DENY ALL ACCESS TO ANONYMOUS USERS
CREATE POLICY "contatos_deny_anonymous" 
ON public.contatos 
FOR ALL 
TO anon 
USING (false);

-- ====== STEP 3: Secure triage tables ======

-- Secure triage_assessments
CREATE POLICY "triage_assessments_deny_anonymous" 
ON public.triage_assessments 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "triage_assessments_require_auth" 
ON public.triage_assessments 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Secure triage_answers
CREATE POLICY "triage_answers_deny_anonymous" 
ON public.triage_answers 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "triage_answers_require_auth" 
ON public.triage_answers 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- ====== STEP 4: Secure daily_records table ======

CREATE POLICY "daily_records_deny_anonymous" 
ON public.daily_records 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "daily_records_require_auth" 
ON public.daily_records 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- ====== STEP 5: Secure other sensitive tables ======

-- Secure daily_record_symptoms
CREATE POLICY "daily_record_symptoms_deny_anonymous" 
ON public.daily_record_symptoms 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "daily_record_symptoms_require_auth" 
ON public.daily_record_symptoms 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Secure media_files
CREATE POLICY "media_files_deny_anonymous" 
ON public.media_files 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "media_files_require_auth" 
ON public.media_files 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Secure communications
CREATE POLICY "communications_deny_anonymous" 
ON public.communications 
FOR ALL 
TO anon 
USING (false);

-- ====== STEP 6: Create security monitoring function ======

CREATE OR REPLACE FUNCTION public.log_security_violation(
  violation_type text,
  table_name text,
  attempted_action text,
  metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.patient_access_log (
    user_id,
    action,
    user_type,
    metadata
  ) VALUES (
    auth.uid(),
    'SECURITY_VIOLATION_' || violation_type,
    COALESCE((SELECT tipo_usuario FROM profiles WHERE id = auth.uid()), 'anonymous'),
    jsonb_build_object(
      'violation_type', violation_type,
      'table_name', table_name,
      'attempted_action', attempted_action,
      'timestamp', now(),
      'ip_address', inet_client_addr(),
      'additional_data', metadata
    )
  );
END;
$$;

-- ====== STEP 7: Add security validation triggers ======

CREATE OR REPLACE FUNCTION public.validate_patient_access_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log all access attempts for audit
  PERFORM public.log_security_violation(
    'ACCESS_ATTEMPT',
    TG_TABLE_NAME,
    TG_OP,
    jsonb_build_object(
      'patient_id', COALESCE(NEW.id, OLD.id),
      'success', true
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add trigger to pacientes table for security monitoring
DROP TRIGGER IF EXISTS trigger_pacientes_security_monitor ON public.pacientes;
CREATE TRIGGER trigger_pacientes_security_monitor
  AFTER INSERT OR UPDATE OR DELETE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.validate_patient_access_security();

-- ====== FINAL SECURITY CHECK ======
-- Verify RLS is enabled on all critical tables
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_record_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;