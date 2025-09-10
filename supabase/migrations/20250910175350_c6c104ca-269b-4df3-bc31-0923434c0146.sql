-- COMPREHENSIVE SECURITY ENHANCEMENT FOR PATIENT MEDICAL RECORDS
-- This migration addresses critical security vulnerabilities identified in the pacientes table

-- 1. Enhanced Data Masking Function for Medical Records
CREATE OR REPLACE FUNCTION public.mask_medical_data(
  input_data text, 
  field_type text DEFAULT 'general'::text,
  access_level text DEFAULT 'restricted'::text
)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return original data for system admins
  IF public.is_system_admin_secure() THEN
    RETURN input_data;
  END IF;
  
  -- Return NULL for empty/null data
  IF input_data IS NULL OR input_data = '' THEN
    RETURN input_data;
  END IF;
  
  -- Enhanced masking based on field type and access level
  CASE field_type
    WHEN 'cpf' THEN
      -- Show only last 2 digits of CPF for authorized users
      IF access_level = 'authorized' THEN
        RETURN regexp_replace(input_data, '(\d{3})\.(\d{3})\.(\d{3})-(\d{2})', '***.***.***-\4');
      ELSE
        RETURN '***.***.***-**';
      END IF;
    
    WHEN 'phone' THEN
      -- Show only last 4 digits for authorized users
      IF access_level = 'authorized' AND length(input_data) >= 4 THEN
        RETURN repeat('*', length(input_data) - 4) || right(input_data, 4);
      ELSE
        RETURN '****-****';
      END IF;
    
    WHEN 'email' THEN
      -- Show masked email for authorized users
      IF access_level = 'authorized' AND input_data LIKE '%@%' THEN
        RETURN left(input_data, 2) || '***@' || split_part(input_data, '@', 2);
      ELSE
        RETURN '***@***.***';
      END IF;
    
    WHEN 'medical_diagnosis' THEN
      -- Medical information - highly sensitive
      IF access_level = 'authorized' THEN
        RETURN left(input_data, 10) || '... [DIAGNÓSTICO MÉDICO RESTRITO]';
      ELSE
        RETURN '[INFORMAÇÃO MÉDICA RESTRITA]';
      END IF;
    
    WHEN 'medical_history' THEN
      -- Medical history - highly sensitive  
      IF access_level = 'authorized' THEN
        RETURN left(input_data, 20) || '... [HISTÓRICO MÉDICO RESTRITO]';
      ELSE
        RETURN '[HISTÓRICO MÉDICO RESTRITO]';
      END IF;
    
    WHEN 'medications' THEN
      -- Current medications - sensitive
      IF access_level = 'authorized' THEN
        RETURN left(input_data, 15) || '... [MEDICAMENTOS RESTRITOS]';
      ELSE
        RETURN '[MEDICAMENTOS RESTRITOS]';
      END IF;
    
    WHEN 'address' THEN
      -- Address information
      IF access_level = 'authorized' THEN
        RETURN left(input_data, 10) || '... [ENDEREÇO RESTRITO]';
      ELSE
        RETURN '[ENDEREÇO RESTRITO]';
      END IF;
    
    ELSE
      -- General sensitive data
      IF access_level = 'authorized' AND length(input_data) > 2 THEN
        RETURN left(input_data, 1) || repeat('*', greatest(length(input_data) - 2, 1)) || right(input_data, 1);
      ELSE
        RETURN '[DADOS PESSOAIS RESTRITOS]';
      END IF;
  END CASE;
END;
$$;

-- 2. Secure Patient Data Access Function with Enhanced Masking
CREATE OR REPLACE FUNCTION public.get_patient_data_secure_enhanced(patient_uuid uuid)
RETURNS TABLE(
  id uuid, 
  nome text, 
  cpf text, 
  data_nascimento date, 
  telefone text, 
  email text, 
  endereco text, 
  diagnostico text, 
  historico_medico text, 
  medicamentos_atuais text, 
  observacoes text, 
  responsavel_nome text, 
  responsavel_telefone text, 
  responsavel_email text, 
  status text, 
  professional_id uuid, 
  caregiver_id uuid, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  access_level text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_profile RECORD;
    patient_record RECORD;
    access_level TEXT := 'denied';
    user_access_type TEXT := 'unauthorized';
BEGIN
    -- Get current user profile
    SELECT * INTO user_profile 
    FROM public.profiles 
    WHERE id = auth.uid() AND is_approved = true;
    
    -- Check if user exists and is approved
    IF user_profile.id IS NULL THEN
        RETURN; -- No access for unapproved users
    END IF;
    
    -- Get patient record
    SELECT * INTO patient_record 
    FROM public.pacientes 
    WHERE pacientes.id = patient_uuid;
    
    -- Check if patient exists
    IF patient_record.id IS NULL THEN
        RETURN; -- Patient not found
    END IF;
    
    -- Determine access level based on user role and patient assignment
    IF public.is_system_admin_secure() THEN
        access_level := 'full';
        user_access_type := 'admin';
    ELSIF patient_record.professional_id = auth.uid() AND user_profile.tipo_usuario IN ('fonoaudiologo', 'admin') THEN
        access_level := 'authorized';
        user_access_type := 'assigned_professional';
    ELSIF patient_record.caregiver_id = auth.uid() AND user_profile.tipo_usuario = 'cuidador' THEN
        access_level := 'limited';
        user_access_type := 'assigned_caregiver';
    ELSE
        -- Log unauthorized access attempt
        INSERT INTO public.patient_access_log (
            user_id, patient_id, action, user_type, metadata
        ) VALUES (
            auth.uid(), patient_uuid, 'UNAUTHORIZED_ACCESS_ATTEMPT', 
            user_profile.tipo_usuario,
            jsonb_build_object(
                'timestamp', now(),
                'ip_address', inet_client_addr(),
                'access_denied_reason', 'not_assigned_to_patient'
            )
        );
        RETURN; -- No access
    END IF;
    
    -- Log authorized access
    INSERT INTO public.patient_access_log (
        user_id, patient_id, action, user_type, metadata
    ) VALUES (
        auth.uid(), patient_uuid, 'SECURE_DATA_ACCESS', 
        user_profile.tipo_usuario,
        jsonb_build_object(
            'access_level', access_level,
            'user_access_type', user_access_type,
            'timestamp', now(),
            'ip_address', inet_client_addr()
        )
    );
    
    -- Return data with appropriate masking based on access level
    RETURN QUERY SELECT
        patient_record.id,
        CASE 
            WHEN access_level = 'full' THEN patient_record.nome
            ELSE public.mask_medical_data(patient_record.nome, 'general', access_level)
        END as nome,
        CASE 
            WHEN access_level = 'full' THEN patient_record.cpf
            ELSE public.mask_medical_data(patient_record.cpf, 'cpf', access_level)
        END as cpf,
        CASE 
            WHEN access_level IN ('full', 'authorized') THEN patient_record.data_nascimento
            ELSE NULL
        END as data_nascimento,
        CASE 
            WHEN access_level = 'full' THEN patient_record.telefone
            ELSE public.mask_medical_data(patient_record.telefone, 'phone', access_level)
        END as telefone,
        CASE 
            WHEN access_level = 'full' THEN patient_record.email
            ELSE public.mask_medical_data(patient_record.email, 'email', access_level)
        END as email,
        CASE 
            WHEN access_level = 'full' THEN patient_record.endereco
            ELSE public.mask_medical_data(patient_record.endereco, 'address', access_level)
        END as endereco,
        CASE 
            WHEN access_level IN ('full', 'authorized') THEN patient_record.diagnostico
            ELSE public.mask_medical_data(patient_record.diagnostico, 'medical_diagnosis', access_level)
        END as diagnostico,
        CASE 
            WHEN access_level IN ('full', 'authorized') THEN patient_record.historico_medico
            ELSE public.mask_medical_data(patient_record.historico_medico, 'medical_history', access_level)
        END as historico_medico,
        CASE 
            WHEN access_level IN ('full', 'authorized') THEN patient_record.medicamentos_atuais
            ELSE public.mask_medical_data(patient_record.medicamentos_atuais, 'medications', access_level)
        END as medicamentos_atuais,
        CASE 
            WHEN access_level IN ('full', 'authorized') THEN patient_record.observacoes
            ELSE public.mask_medical_data(patient_record.observacoes, 'general', access_level)
        END as observacoes,
        CASE 
            WHEN access_level = 'full' THEN patient_record.responsavel_nome
            ELSE public.mask_medical_data(patient_record.responsavel_nome, 'general', access_level)
        END as responsavel_nome,
        CASE 
            WHEN access_level = 'full' THEN patient_record.responsavel_telefone
            ELSE public.mask_medical_data(patient_record.responsavel_telefone, 'phone', access_level)
        END as responsavel_telefone,
        CASE 
            WHEN access_level = 'full' THEN patient_record.responsavel_email
            ELSE public.mask_medical_data(patient_record.responsavel_email, 'email', access_level)
        END as responsavel_email,
        patient_record.status,
        patient_record.professional_id,
        patient_record.caregiver_id,
        patient_record.created_at,
        patient_record.updated_at,
        access_level;
END;
$$;

-- 3. Enhanced Patient Assignment Validation
CREATE OR REPLACE FUNCTION public.validate_patient_assignment_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate professional assignment
  IF NEW.professional_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.professional_id
        AND is_approved = true
        AND tipo_usuario IN ('fonoaudiologo', 'admin')
    ) THEN
      RAISE EXCEPTION 'SECURITY_ERROR: Invalid professional assignment. Professional must be approved and have correct user type.';
    END IF;
  END IF;
  
  -- Validate caregiver assignment
  IF NEW.caregiver_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.caregiver_id
        AND is_approved = true
        AND tipo_usuario = 'cuidador'
    ) THEN
      RAISE EXCEPTION 'SECURITY_ERROR: Invalid caregiver assignment. Caregiver must be approved and have correct user type.';
    END IF;
  END IF;
  
  -- Ensure at least one assignment (professional or caregiver) for security
  IF NEW.professional_id IS NULL AND NEW.caregiver_id IS NULL THEN
    -- Log unassigned patient creation
    INSERT INTO public.patient_access_log (
      user_id, patient_id, action, user_type, metadata
    ) VALUES (
      auth.uid(), NEW.id, 'UNASSIGNED_PATIENT_CREATED', 
      COALESCE((SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()), 'unknown'),
      jsonb_build_object(
        'timestamp', now(),
        'patient_name', NEW.nome,
        'security_warning', 'Patient created without professional or caregiver assignment'
      )
    );
    
    -- Only allow system admins to create unassigned patients
    IF NOT public.is_system_admin_secure() THEN
      RAISE EXCEPTION 'SECURITY_ERROR: Patients must be assigned to a professional or caregiver upon creation for security compliance.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Enhanced Audit Trigger for Patient Data Access
CREATE OR REPLACE FUNCTION public.audit_patient_data_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_profile RECORD;
    sensitive_fields text[] := ARRAY['cpf', 'telefone', 'email', 'diagnostico', 'historico_medico', 'medicamentos_atuais', 'endereco'];
    changed_sensitive_fields text[] := ARRAY[]::text[];
    field_name text;
BEGIN
    -- Get user profile
    SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
    
    -- Check for changes in sensitive fields during UPDATE
    IF TG_OP = 'UPDATE' THEN
        FOREACH field_name IN ARRAY sensitive_fields LOOP
            IF (to_jsonb(NEW) ->> field_name) IS DISTINCT FROM (to_jsonb(OLD) ->> field_name) THEN
                changed_sensitive_fields := array_append(changed_sensitive_fields, field_name);
            END IF;
        END LOOP;
        
        -- Log sensitive data modifications with high detail
        IF array_length(changed_sensitive_fields, 1) > 0 THEN
            INSERT INTO public.patient_access_log (
                user_id, patient_id, action, user_type, accessed_fields, metadata
            ) VALUES (
                auth.uid(), COALESCE(NEW.id, OLD.id), 'SENSITIVE_DATA_MODIFIED', 
                COALESCE(user_profile.tipo_usuario, 'unknown'),
                changed_sensitive_fields,
                jsonb_build_object(
                    'operation', TG_OP,
                    'table', TG_TABLE_NAME,
                    'timestamp', now(),
                    'ip_address', inet_client_addr(),
                    'changed_fields', changed_sensitive_fields,
                    'security_level', 'high_sensitivity',
                    'compliance_required', true
                )
            );
        END IF;
    END IF;
    
    -- Log all patient data operations
    INSERT INTO public.patient_access_log (
        user_id, patient_id, action, user_type, accessed_fields, metadata
    ) VALUES (
        auth.uid(), COALESCE(NEW.id, OLD.id),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'PATIENT_CREATED'
            WHEN TG_OP = 'UPDATE' THEN 'PATIENT_UPDATED'
            WHEN TG_OP = 'DELETE' THEN 'PATIENT_DELETED'
        END,
        COALESCE(user_profile.tipo_usuario, 'unknown'),
        ARRAY['*'],
        jsonb_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'timestamp', now(),
            'ip_address', inet_client_addr(),
            'user_approved', COALESCE(user_profile.is_approved, false),
            'security_audit', true
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Apply Enhanced Triggers
DROP TRIGGER IF EXISTS validate_patient_assignments ON public.pacientes;
CREATE TRIGGER validate_patient_assignments
    BEFORE INSERT OR UPDATE ON public.pacientes
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_patient_assignment_enhanced();

DROP TRIGGER IF EXISTS audit_patient_data ON public.pacientes;
CREATE TRIGGER audit_patient_data
    AFTER INSERT OR UPDATE OR DELETE ON public.pacientes
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_patient_data_enhanced();

-- 6. Enhanced RLS Policies with Stronger Security
DROP POLICY IF EXISTS "pacientes_select_policy_enhanced" ON public.pacientes;
CREATE POLICY "pacientes_select_policy_enhanced" ON public.pacientes
FOR SELECT USING (
    -- System admin access
    public.is_system_admin_secure()
    OR
    -- Assigned professional access (must be approved)
    (
        professional_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND p.is_approved = true 
            AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
        )
    )
    OR
    -- Assigned caregiver access (must be approved)
    (
        caregiver_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND p.is_approved = true 
            AND p.tipo_usuario = 'cuidador'
        )
    )
);

-- 7. Create Security Monitoring Function
CREATE OR REPLACE FUNCTION public.monitor_patient_security_violations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    violation_count integer;
    recent_violations RECORD;
BEGIN
    -- Check for recent unauthorized access attempts
    SELECT COUNT(*) INTO violation_count
    FROM public.patient_access_log
    WHERE action = 'UNAUTHORIZED_ACCESS_ATTEMPT'
    AND accessed_at > now() - interval '1 hour';
    
    -- Alert if too many violations
    IF violation_count > 5 THEN
        INSERT INTO public.patient_access_log (
            user_id, action, user_type, metadata
        ) VALUES (
            NULL, 'SECURITY_ALERT_HIGH_VIOLATION_RATE', 'system',
            jsonb_build_object(
                'violation_count', violation_count,
                'time_window', '1 hour',
                'alert_level', 'high',
                'timestamp', now(),
                'requires_investigation', true
            )
        );
    END IF;
    
    -- Check for unassigned patients (security risk)
    SELECT COUNT(*) INTO violation_count
    FROM public.pacientes
    WHERE professional_id IS NULL AND caregiver_id IS NULL;
    
    IF violation_count > 0 THEN
        INSERT INTO public.patient_access_log (
            user_id, action, user_type, metadata
        ) VALUES (
            NULL, 'SECURITY_WARNING_UNASSIGNED_PATIENTS', 'system',
            jsonb_build_object(
                'unassigned_count', violation_count,
                'alert_level', 'medium',
                'timestamp', now(),
                'recommendation', 'Assign all patients to authorized professionals or caregivers'
            )
        );
    END IF;
END;
$$;

-- 8. Create a secure view for patient listings that automatically applies masking
CREATE OR REPLACE VIEW public.pacientes_secure_view AS
SELECT 
    p.id,
    public.mask_medical_data(p.nome, 'general', 
        CASE 
            WHEN public.is_system_admin_secure() THEN 'full'
            WHEN p.professional_id = auth.uid() OR p.caregiver_id = auth.uid() THEN 'authorized'
            ELSE 'restricted'
        END
    ) as nome,
    public.mask_medical_data(p.cpf, 'cpf',
        CASE 
            WHEN public.is_system_admin_secure() THEN 'full'
            WHEN p.professional_id = auth.uid() OR p.caregiver_id = auth.uid() THEN 'authorized'
            ELSE 'restricted'
        END
    ) as cpf,
    CASE 
        WHEN public.is_system_admin_secure() 
        OR p.professional_id = auth.uid() 
        OR p.caregiver_id = auth.uid() 
        THEN p.data_nascimento 
        ELSE NULL 
    END as data_nascimento,
    p.status,
    p.created_at,
    CASE 
        WHEN public.is_system_admin_secure() 
        OR p.professional_id = auth.uid() 
        OR p.caregiver_id = auth.uid() 
        THEN 'authorized' 
        ELSE 'restricted' 
    END as access_level
FROM public.pacientes p
WHERE (
    public.is_system_admin_secure()
    OR p.professional_id = auth.uid()
    OR p.caregiver_id = auth.uid()
);

-- Enable RLS on the pacientes table to ensure policies are enforced
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;