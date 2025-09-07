-- COMPREHENSIVE SECURITY FIXES - PHASE 1: CRITICAL DATA PROTECTION
-- Fix critical security vulnerabilities identified in security review

-- 1. FIX USERS_CONTACT_SAFE VIEW RLS POLICIES
-- Currently this view has no RLS policies, creating critical data exposure risk
ALTER TABLE public.users_contact_safe ENABLE ROW LEVEL SECURITY;

-- Only healthcare professionals can view colleague contact info
CREATE POLICY "Healthcare professionals can view colleague contact info"
ON public.users_contact_safe
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_approved = true
      AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
  )
  AND user_type = 'profissional'
);

-- 2. REMOVE HARDCODED ADMIN EMAIL - CREATE PROPER ROLE-BASED SYSTEM
-- Create a secure function to check if user is system admin without hardcoded email
CREATE OR REPLACE FUNCTION public.is_system_admin_secure()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_approved = true
      AND tipo_usuario = 'admin'
  );
$$;

-- Update RLS policies to use secure admin check instead of hardcoded email
-- Update profiles table policies
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;

CREATE POLICY "System admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_system_admin_secure());

CREATE POLICY "System admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_system_admin_secure())
WITH CHECK (public.is_system_admin_secure());

CREATE POLICY "System admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_system_admin_secure());

-- Update contatos table policies
DROP POLICY IF EXISTS "Admin can view contatos" ON public.contatos;
DROP POLICY IF EXISTS "Admin can insert contatos" ON public.contatos;
DROP POLICY IF EXISTS "Admin can update contatos" ON public.contatos;
DROP POLICY IF EXISTS "Admin can delete contatos" ON public.contatos;

CREATE POLICY "System admins can view contatos"
ON public.contatos
FOR SELECT
TO authenticated
USING (public.is_system_admin_secure());

CREATE POLICY "System admins can insert contatos"
ON public.contatos
FOR INSERT
TO authenticated
WITH CHECK (public.is_system_admin_secure());

CREATE POLICY "System admins can update contatos"
ON public.contatos
FOR UPDATE
TO authenticated
USING (public.is_system_admin_secure())
WITH CHECK (public.is_system_admin_secure());

CREATE POLICY "System admins can delete contatos"
ON public.contatos
FOR DELETE
TO authenticated
USING (public.is_system_admin_secure());

-- Update other tables with hardcoded email checks
DROP POLICY IF EXISTS "Admins can view chat access logs" ON public.chat_access_log;
CREATE POLICY "System admins can view chat access logs"
ON public.chat_access_log
FOR SELECT
TO authenticated
USING (public.is_system_admin_secure());

DROP POLICY IF EXISTS "Only healthcare staff can delete chat messages" ON public.n8n_chat_histories;
CREATE POLICY "Healthcare staff can delete chat messages"
ON public.n8n_chat_histories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_approved = true
      AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
  )
);

DROP POLICY IF EXISTS "Users can create messages in their own sessions" ON public.n8n_chat_histories;
CREATE POLICY "Authorized users can create messages"
ON public.n8n_chat_histories
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_approved = true
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.session_id = n8n_chat_histories.session_id::text
        AND cs.user_id = auth.uid()
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.session_id = n8n_chat_histories.session_id::text
    )
  )
);

DROP POLICY IF EXISTS "Users can update messages in their own sessions" ON public.n8n_chat_histories;
CREATE POLICY "Authorized users can update messages"
ON public.n8n_chat_histories
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_approved = true
      AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.session_id = n8n_chat_histories.session_id::text
      AND cs.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view their own chats and healthcare staff can view al" ON public.n8n_chat_histories;
CREATE POLICY "Authorized users can view chat messages"
ON public.n8n_chat_histories
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_approved = true
      AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.session_id = n8n_chat_histories.session_id::text
      AND cs.user_id = auth.uid()
  )
);

-- Update other admin-only tables
DROP POLICY IF EXISTS "Admin can view followup_logs" ON public.followup_logs;
DROP POLICY IF EXISTS "Admin can insert followup_logs" ON public.followup_logs;

CREATE POLICY "System admins can view followup_logs"
ON public.followup_logs
FOR SELECT
TO authenticated
USING (public.is_system_admin_secure());

CREATE POLICY "System admins can insert followup_logs"
ON public.followup_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_system_admin_secure());

DROP POLICY IF EXISTS "Admin can view reminder_log" ON public.reminder_log;
DROP POLICY IF EXISTS "Admin can insert reminder_log" ON public.reminder_log;

CREATE POLICY "System admins can view reminder_log"
ON public.reminder_log
FOR SELECT
TO authenticated
USING (public.is_system_admin_secure());

CREATE POLICY "System admins can insert reminder_log"
ON public.reminder_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_system_admin_secure());

-- Update document access logs
DROP POLICY IF EXISTS "Admins can view document access logs" ON public.document_access_log;
CREATE POLICY "System admins can view document access logs"
ON public.document_access_log
FOR SELECT
TO authenticated
USING (public.is_system_admin_secure());

-- Update patient access logs
DROP POLICY IF EXISTS "rls_audit_log_select_2025" ON public.patient_access_log;
CREATE POLICY "Healthcare professionals and admins can view audit logs"
ON public.patient_access_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_approved = true
      AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
  )
);

-- Update team message access logs
DROP POLICY IF EXISTS "Admins can view access logs" ON public.team_message_access_log;
CREATE POLICY "System admins can view team message access logs"
ON public.team_message_access_log
FOR SELECT
TO authenticated
USING (public.is_system_admin_secure());

-- Update vector document access logs
DROP POLICY IF EXISTS "Admins can view vector document access logs" ON public.vector_document_access_log;
CREATE POLICY "System admins can view vector document access logs"
ON public.vector_document_access_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_approved = true
      AND p.tipo_usuario = 'admin'
  )
);

-- 3. ENHANCE PATIENT DATA SECURITY
-- Add additional security constraints and logging for pacientes table
-- Create enhanced audit logging function
CREATE OR REPLACE FUNCTION public.log_patient_access_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    patient_uuid uuid;
    user_profile RECORD;
BEGIN
    -- Get patient ID and user profile
    patient_uuid := CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.id
        ELSE NEW.id
    END;
    
    SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
    
    -- Enhanced logging with security metadata and risk assessment
    INSERT INTO public.patient_access_log (
        user_id,
        patient_id,
        action,
        user_type,
        accessed_fields,
        metadata
    ) VALUES (
        auth.uid(),
        patient_uuid,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'CREATE'
            WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
            WHEN TG_OP = 'DELETE' THEN 'DELETE'
            ELSE 'VIEW'
        END,
        COALESCE(user_profile.tipo_usuario, 'unknown'),
        CASE 
            WHEN TG_OP = 'UPDATE' THEN 
                ARRAY(
                    SELECT key FROM jsonb_each(to_jsonb(NEW)) 
                    WHERE key != 'updated_at' 
                    AND to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key
                )
            WHEN TG_OP = 'DELETE' THEN
                ARRAY['*'] 
            ELSE 
                ARRAY['*']
        END,
        jsonb_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'timestamp', now(),
            'ip_address', inet_client_addr(),
            'session_id', current_setting('application_name', true),
            'user_approved', COALESCE(user_profile.is_approved, false),
            'security_level', 'enhanced'
        )
    );
    
    -- Additional security check for high-risk operations
    IF TG_OP = 'DELETE' AND NOT user_profile.is_approved THEN
        RAISE EXCEPTION 'Only approved users can delete patient records';
    END IF;
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$;

-- Update the trigger to use enhanced logging
DROP TRIGGER IF EXISTS audit_patient_access_trigger ON public.pacientes;
CREATE TRIGGER audit_patient_access_enhanced_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.pacientes
    FOR EACH ROW EXECUTE FUNCTION public.log_patient_access_enhanced();

-- Add database-level constraints for additional security
-- Ensure critical fields are not null when they should have values
ALTER TABLE public.pacientes 
ADD CONSTRAINT check_nome_not_empty CHECK (length(trim(nome)) > 0);

-- Add constraint to ensure status is valid
ALTER TABLE public.pacientes 
ADD CONSTRAINT check_valid_status CHECK (status IN ('ativo', 'inativo', 'pendente'));

-- 4. ENHANCE SECURITY FOR VECTOR DOCUMENTS AND AI FEATURES
-- Update vector document policies to be more restrictive
DROP POLICY IF EXISTS "Only healthcare professionals can access AI training documents" ON public.vector_documents;
CREATE POLICY "Approved healthcare professionals can access AI training documents"
ON public.vector_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_approved = true
      AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
  )
);

DROP POLICY IF EXISTS "Only healthcare professionals can create AI training documents" ON public.vector_documents;
CREATE POLICY "Approved healthcare professionals can create AI training documents"
ON public.vector_documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_approved = true
      AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
  )
  OR (auth.uid() IS NULL AND current_setting('role') = 'service_role')
);

DROP POLICY IF EXISTS "Only healthcare professionals can update AI training documents" ON public.vector_documents;
CREATE POLICY "Approved healthcare professionals can update AI training documents"
ON public.vector_documents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_approved = true
      AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
  )
);

DROP POLICY IF EXISTS "Only admins can delete AI training documents" ON public.vector_documents;
CREATE POLICY "System admins can delete AI training documents"
ON public.vector_documents
FOR DELETE
TO authenticated
USING (public.is_system_admin_secure());

-- 5. ADD SECURITY MONITORING AND ALERTING
-- Create a function to detect suspicious access patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recent_access_count integer;
    user_profile RECORD;
BEGIN
    -- Get user profile
    SELECT * INTO user_profile FROM public.profiles WHERE id = NEW.user_id;
    
    -- Check for excessive access in short time period
    SELECT COUNT(*) INTO recent_access_count
    FROM public.patient_access_log
    WHERE user_id = NEW.user_id
      AND accessed_at > now() - interval '5 minutes';
    
    -- Log suspicious activity (more than 50 accesses in 5 minutes)
    IF recent_access_count > 50 THEN
        INSERT INTO public.patient_access_log (
            user_id,
            patient_id,
            action,
            user_type,
            accessed_fields,
            metadata
        ) VALUES (
            NEW.user_id,
            NULL,
            'SUSPICIOUS_ACTIVITY_DETECTED',
            COALESCE(user_profile.tipo_usuario, 'unknown'),
            ARRAY['bulk_access'],
            jsonb_build_object(
                'alert_type', 'excessive_access',
                'access_count', recent_access_count,
                'time_window', '5_minutes',
                'timestamp', now(),
                'requires_investigation', true
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for suspicious activity detection
CREATE TRIGGER detect_suspicious_activity_trigger
    AFTER INSERT ON public.patient_access_log
    FOR EACH ROW EXECUTE FUNCTION public.detect_suspicious_activity();

-- Add index for better performance on audit queries
CREATE INDEX IF NOT EXISTS idx_patient_access_log_user_time 
ON public.patient_access_log(user_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_access_log_patient_time 
ON public.patient_access_log(patient_id, accessed_at DESC);

-- 6. SECURE SEARCH_PATH FOR ALL SECURITY DEFINER FUNCTIONS
-- Update existing functions to have secure search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, tipo_usuario, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'cuidador'),
    CASE 
      WHEN public.is_system_admin_secure() THEN true
      ELSE false
    END
  );
  RETURN NEW;
END;
$$;

-- Add comment for security audit trail
COMMENT ON FUNCTION public.is_system_admin_secure() IS 
'Secure function to check admin status without hardcoded emails. Part of security hardening phase 1.';

COMMENT ON FUNCTION public.log_patient_access_enhanced() IS 
'Enhanced audit logging for patient data access with security risk assessment.';

COMMENT ON FUNCTION public.detect_suspicious_activity() IS 
'Automated detection of suspicious access patterns for security monitoring.';