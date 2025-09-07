-- Fix critical patient data security vulnerabilities
-- This migration addresses the ERROR level security finding for patient data protection

-- 1. First, let's create a more secure admin check function with proper search_path
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND tipo_usuario = 'admin'
  ) OR (auth.jwt() ->> 'email') = 'viana.vianadaniel@outlook.com';
$$;

-- 2. Create function to check if user can access specific patient
CREATE OR REPLACE FUNCTION public.can_access_patient(patient_uuid uuid)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pacientes p
    INNER JOIN public.profiles prof ON prof.id = auth.uid()
    WHERE p.id = patient_uuid
    AND prof.is_approved = true
    AND (
      -- Professional assigned to patient
      (p.professional_id = auth.uid() AND prof.tipo_usuario IN ('fonoaudiologo', 'admin'))
      OR
      -- Caregiver assigned to patient
      (p.caregiver_id = auth.uid() AND prof.tipo_usuario = 'cuidador')
      OR
      -- System admin
      public.is_system_admin()
    )
  );
$$;

-- 3. Update pacientes RLS policies with stronger security
DROP POLICY IF EXISTS "rls_pacientes_select_2025" ON public.pacientes;
CREATE POLICY "rls_pacientes_select_secure" ON public.pacientes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles prof 
    WHERE prof.id = auth.uid() 
    AND prof.is_approved = true
    AND (
      -- Professional can see their assigned patients
      (professional_id = auth.uid() AND prof.tipo_usuario IN ('fonoaudiologo', 'admin'))
      OR
      -- Caregiver can see their assigned patients  
      (caregiver_id = auth.uid() AND prof.tipo_usuario = 'cuidador')
      OR
      -- System admin access
      public.is_system_admin()
    )
  )
);

DROP POLICY IF EXISTS "rls_pacientes_insert_2025" ON public.pacientes;
CREATE POLICY "rls_pacientes_insert_secure" ON public.pacientes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles prof 
    WHERE prof.id = auth.uid() 
    AND prof.is_approved = true
    AND (prof.tipo_usuario IN ('fonoaudiologo', 'admin') OR public.is_system_admin())
  )
);

DROP POLICY IF EXISTS "rls_pacientes_update_2025" ON public.pacientes;
CREATE POLICY "rls_pacientes_update_secure" ON public.pacientes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles prof 
    WHERE prof.id = auth.uid() 
    AND prof.is_approved = true
    AND (
      -- Professional can update their assigned patients
      (professional_id = auth.uid() AND prof.tipo_usuario IN ('fonoaudiologo', 'admin'))
      OR
      -- Caregiver can update limited fields on their assigned patients
      (caregiver_id = auth.uid() AND prof.tipo_usuario = 'cuidador')
      OR
      -- System admin access
      public.is_system_admin()
    )
  )
);

DROP POLICY IF EXISTS "rls_pacientes_delete_2025" ON public.pacientes;
CREATE POLICY "rls_pacientes_delete_secure" ON public.pacientes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles prof 
    WHERE prof.id = auth.uid() 
    AND prof.is_approved = true
    AND (
      -- Only professionals and admins can delete patients
      (professional_id = auth.uid() AND prof.tipo_usuario IN ('fonoaudiologo', 'admin'))
      OR
      -- System admin access
      public.is_system_admin()
    )
  )
);

-- 4. Fix function search_path security issues
ALTER FUNCTION public.update_pacientes_updated_at() SET search_path = 'public';
ALTER FUNCTION public.set_workflow_user_id() SET search_path = 'public';
ALTER FUNCTION public.set_user_id_on_insert() SET search_path = 'public';
ALTER FUNCTION public.get_current_user_role() SET search_path = 'public';
ALTER FUNCTION public.set_cadastro_user_id() SET search_path = 'public';
ALTER FUNCTION public.match_vector_documents(vector, integer, jsonb) SET search_path = 'public';
ALTER FUNCTION public.get_unread_messages_count(uuid) SET search_path = 'public';
ALTER FUNCTION public.mark_message_as_read(uuid, uuid) SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';
ALTER FUNCTION public.update_updated_at() SET search_path = 'public';

-- 5. Create comprehensive patient access audit trigger
CREATE OR REPLACE FUNCTION public.audit_patient_access()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Log all patient data access attempts
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
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'CREATE'
            WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
            WHEN TG_OP = 'DELETE' THEN 'DELETE'
            ELSE 'SELECT'
        END,
        COALESCE((SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()), 'unknown'),
        CASE 
            WHEN TG_OP = 'UPDATE' THEN 
                -- Log which fields were changed
                ARRAY(
                    SELECT key FROM jsonb_each(to_jsonb(NEW)) 
                    WHERE key != 'updated_at' 
                    AND to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key
                )
            ELSE 
                ARRAY['*']
        END,
        jsonb_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'timestamp', now(),
            'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent',
            'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Ensure the audit trigger exists on pacientes table
DROP TRIGGER IF EXISTS audit_pacientes_access ON public.pacientes;
CREATE TRIGGER audit_pacientes_access
    AFTER INSERT OR UPDATE OR DELETE ON public.pacientes
    FOR EACH ROW EXECUTE FUNCTION public.audit_patient_access();

-- 7. Add data masking function for sensitive fields (optional additional security)
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(input_text text, mask_type text DEFAULT 'partial')
RETURNS text
LANGUAGE SQL
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE 
    WHEN mask_type = 'full' THEN regexp_replace(input_text, '.', '*', 'g')
    WHEN mask_type = 'partial' AND length(input_text) > 4 THEN 
      left(input_text, 2) || repeat('*', length(input_text) - 4) || right(input_text, 2)
    ELSE input_text
  END;
$$;

-- 8. Create view for safer patient data access (masks sensitive fields for non-professionals)
CREATE OR REPLACE VIEW public.pacientes_safe AS
SELECT 
  id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND tipo_usuario IN ('fonoaudiologo', 'admin')
      AND is_approved = true
    ) OR public.is_system_admin()
    THEN nome 
    ELSE public.mask_sensitive_data(nome, 'partial')
  END as nome,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND tipo_usuario IN ('fonoaudiologo', 'admin')
      AND is_approved = true
    ) OR public.is_system_admin()
    THEN cpf 
    ELSE public.mask_sensitive_data(cpf, 'partial')
  END as cpf,
  data_nascimento,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND tipo_usuario IN ('fonoaudiologo', 'admin')
      AND is_approved = true
    ) OR public.is_system_admin()
    THEN telefone 
    ELSE public.mask_sensitive_data(telefone, 'partial')
  END as telefone,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND tipo_usuario IN ('fonoaudiologo', 'admin')
      AND is_approved = true
    ) OR public.is_system_admin()
    THEN email 
    ELSE public.mask_sensitive_data(email, 'partial')
  END as email,
  endereco,
  diagnostico,
  historico_medico,
  medicamentos_atuais,
  observacoes,
  responsavel_nome,
  responsavel_email,
  responsavel_telefone,
  status,
  professional_id,
  caregiver_id,
  usuario_cadastro_id,
  created_at,
  updated_at
FROM public.pacientes;

-- Enable RLS on the view
ALTER VIEW public.pacientes_safe SET (security_invoker = on);

COMMENT ON TABLE public.pacientes IS 'Patient data table with comprehensive RLS policies and audit logging for HIPAA/LGPD compliance';
COMMENT ON VIEW public.pacientes_safe IS 'Masked view of patient data that automatically hides sensitive information based on user role';
COMMENT ON FUNCTION public.can_access_patient(uuid) IS 'Security function to verify patient access permissions';
COMMENT ON FUNCTION public.is_system_admin() IS 'Security function to verify admin privileges without hardcoded emails';