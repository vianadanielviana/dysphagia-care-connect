-- Enhance patient data security with comprehensive audit logging and additional safeguards

-- First, create improved audit logging trigger for patient access
CREATE OR REPLACE FUNCTION public.audit_patient_data_access()
RETURNS TRIGGER AS $$
DECLARE
    user_profile RECORD;
    access_type TEXT;
BEGIN
    -- Get current user profile information
    SELECT * INTO user_profile 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    -- Determine access type based on operation
    access_type := CASE 
        WHEN TG_OP = 'INSERT' THEN 'CREATE_PATIENT'
        WHEN TG_OP = 'UPDATE' THEN 'MODIFY_PATIENT'  
        WHEN TG_OP = 'DELETE' THEN 'DELETE_PATIENT'
        ELSE 'VIEW_PATIENT'
    END;
    
    -- Log the access attempt with detailed information
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
        access_type,
        COALESCE(user_profile.tipo_usuario, 'unknown'),
        CASE 
            WHEN TG_OP = 'UPDATE' THEN 
                -- Only log fields that actually changed
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
            'timestamp', now(),
            'user_approved', COALESCE(user_profile.is_approved, false),
            'table_name', 'pacientes',
            'security_check_passed', true
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for comprehensive audit logging
DROP TRIGGER IF EXISTS audit_patient_data_access_trigger ON public.pacientes;
CREATE TRIGGER audit_patient_data_access_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.pacientes
    FOR EACH ROW EXECUTE FUNCTION public.audit_patient_data_access();

-- Enhance the patient data validation function to prevent unauthorized modifications
CREATE OR REPLACE FUNCTION public.validate_patient_assignment()
RETURNS TRIGGER AS $$
DECLARE
    user_profile RECORD;
BEGIN
    -- Get current user profile
    SELECT * INTO user_profile 
    FROM public.profiles 
    WHERE id = auth.uid() AND is_approved = true;
    
    -- Validate user exists and is approved
    IF user_profile IS NULL THEN
        RAISE EXCEPTION 'Access denied: User not found or not approved';
    END IF;
    
    -- For INSERT operations, validate assignment logic
    IF TG_OP = 'INSERT' THEN
        -- Only fonoaudiologos and admins can create patients
        IF user_profile.tipo_usuario NOT IN ('fonoaudiologo', 'admin') THEN
            RAISE EXCEPTION 'Access denied: Only healthcare professionals can create patient records';
        END IF;
        
        -- Validate professional assignment
        IF NEW.professional_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = NEW.professional_id 
                AND p.is_approved = true 
                AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
            ) THEN
                RAISE EXCEPTION 'Invalid professional assignment: Professional not found or not approved';
            END IF;
        END IF;
        
        -- Validate caregiver assignment  
        IF NEW.caregiver_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = NEW.caregiver_id 
                AND p.is_approved = true 
                AND p.tipo_usuario = 'cuidador'
            ) THEN
                RAISE EXCEPTION 'Invalid caregiver assignment: Caregiver not found or not approved';
            END IF;
        END IF;
    END IF;
    
    -- For UPDATE operations, prevent unauthorized assignment changes
    IF TG_OP = 'UPDATE' THEN
        -- Only admins and the assigned professional can modify assignments
        IF OLD.professional_id != NEW.professional_id OR OLD.caregiver_id != NEW.caregiver_id THEN
            IF NOT (user_profile.tipo_usuario = 'admin' OR 
                   (user_profile.tipo_usuario = 'fonoaudiologo' AND OLD.professional_id = auth.uid())) THEN
                RAISE EXCEPTION 'Access denied: Cannot modify patient assignments';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create validation trigger
DROP TRIGGER IF EXISTS validate_patient_assignment_trigger ON public.pacientes;
CREATE TRIGGER validate_patient_assignment_trigger
    BEFORE INSERT OR UPDATE ON public.pacientes
    FOR EACH ROW EXECUTE FUNCTION public.validate_patient_assignment();

-- Create a function to detect suspicious access patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_patient_access()
RETURNS TRIGGER AS $$
DECLARE
    recent_access_count INTEGER;
    user_profile RECORD;
BEGIN
    -- Get user profile
    SELECT * INTO user_profile FROM public.profiles WHERE id = NEW.user_id;
    
    -- Count recent access attempts by this user
    SELECT COUNT(*) INTO recent_access_count
    FROM public.patient_access_log
    WHERE user_id = NEW.user_id
      AND accessed_at > now() - interval '5 minutes'
      AND action IN ('VIEW_PATIENT', 'MODIFY_PATIENT');
    
    -- Flag suspicious activity (more than 30 patient accesses in 5 minutes)
    IF recent_access_count > 30 THEN
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
            'SUSPICIOUS_BULK_ACCESS_DETECTED',
            COALESCE(user_profile.tipo_usuario, 'unknown'),
            ARRAY['bulk_access_pattern'],
            jsonb_build_object(
                'alert_type', 'excessive_patient_access',
                'access_count_5min', recent_access_count,
                'requires_investigation', true,
                'timestamp', now(),
                'risk_level', 'HIGH'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for suspicious activity detection
DROP TRIGGER IF EXISTS detect_suspicious_access_trigger ON public.patient_access_log;
CREATE TRIGGER detect_suspicious_access_trigger
    AFTER INSERT ON public.patient_access_log
    FOR EACH ROW EXECUTE FUNCTION public.detect_suspicious_patient_access();

-- Strengthen the RLS policies with additional security checks
DROP POLICY IF EXISTS "rls_secure_patient_select_enhanced_2025" ON public.pacientes;
CREATE POLICY "rls_secure_patient_select_enhanced_2025" ON public.pacientes
FOR SELECT USING (
    -- User must be authenticated and approved
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
    ) AND
    (
        -- Admin access (full access to all records)
        (EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND p.is_approved = true 
            AND (p.tipo_usuario = 'admin' OR p.is_admin = true)
        )) OR
        -- Professional access (only assigned patients)
        (professional_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND p.is_approved = true 
            AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
        )) OR
        -- Caregiver access (only assigned patients)
        (caregiver_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND p.is_approved = true 
            AND p.tipo_usuario = 'cuidador'
        ))
    )
);

-- Drop the old policy to prevent conflicts
DROP POLICY IF EXISTS "rls_secure_patient_select_2025" ON public.pacientes;

-- Create a secure function for patient data access with built-in masking
CREATE OR REPLACE FUNCTION public.get_patient_data_secure(patient_uuid UUID)
RETURNS TABLE(
    id UUID,
    nome TEXT,
    cpf TEXT,
    data_nascimento DATE,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    diagnostico TEXT,
    historico_medico TEXT,
    medicamentos_atuais TEXT,
    observacoes TEXT,
    responsavel_nome TEXT,
    responsavel_telefone TEXT,
    responsavel_email TEXT,
    status TEXT,
    professional_id UUID,
    caregiver_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    access_level TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_profile RECORD;
    patient_record RECORD;
    access_level TEXT := 'denied';
BEGIN
    -- Get current user profile
    SELECT * INTO user_profile 
    FROM public.profiles 
    WHERE id = auth.uid() AND is_approved = true;
    
    -- Check if user exists and is approved
    IF user_profile IS NULL THEN
        RETURN;
    END IF;
    
    -- Get patient record if user has access
    SELECT * INTO patient_record 
    FROM public.pacientes p
    WHERE p.id = patient_uuid
    AND (
        -- Admin access
        (user_profile.tipo_usuario = 'admin' OR user_profile.is_admin = true) OR
        -- Professional access
        (p.professional_id = auth.uid() AND user_profile.tipo_usuario IN ('fonoaudiologo', 'admin')) OR
        -- Caregiver access  
        (p.caregiver_id = auth.uid() AND user_profile.tipo_usuario = 'cuidador')
    );
    
    -- If no access or patient not found, return empty
    IF patient_record IS NULL THEN
        RETURN;
    END IF;
    
    -- Determine access level
    IF user_profile.tipo_usuario = 'admin' OR user_profile.is_admin = true THEN
        access_level := 'full';
    ELSIF patient_record.professional_id = auth.uid() AND user_profile.tipo_usuario IN ('fonoaudiologo', 'admin') THEN
        access_level := 'professional';
    ELSIF patient_record.caregiver_id = auth.uid() AND user_profile.tipo_usuario = 'cuidador' THEN
        access_level := 'caregiver';
    END IF;
    
    -- Log the access
    INSERT INTO public.patient_access_log (
        user_id, patient_id, action, user_type, accessed_fields, metadata
    ) VALUES (
        auth.uid(), patient_uuid, 'SECURE_DATA_ACCESS', user_profile.tipo_usuario,
        ARRAY['*'], jsonb_build_object('access_level', access_level, 'function', 'get_patient_data_secure')
    );
    
    -- Return data based on access level with appropriate masking
    RETURN QUERY SELECT
        patient_record.id,
        patient_record.nome,
        -- CPF masking for caregivers
        CASE 
            WHEN access_level IN ('full', 'professional') THEN patient_record.cpf
            ELSE public.mask_sensitive_data(patient_record.cpf, 'cpf')
        END as cpf,
        patient_record.data_nascimento,
        -- Phone masking for limited access
        CASE 
            WHEN access_level = 'full' THEN patient_record.telefone
            ELSE public.mask_sensitive_data(patient_record.telefone, 'phone')
        END as telefone,
        -- Email masking for limited access
        CASE 
            WHEN access_level = 'full' THEN patient_record.email  
            ELSE public.mask_sensitive_data(patient_record.email, 'email')
        END as email,
        patient_record.endereco,
        -- Medical data only for professionals and admins
        CASE 
            WHEN access_level IN ('full', 'professional') THEN patient_record.diagnostico
            ELSE '***-MEDICAL-DATA-RESTRICTED-***'
        END as diagnostico,
        CASE 
            WHEN access_level IN ('full', 'professional') THEN patient_record.historico_medico
            ELSE '***-MEDICAL-DATA-RESTRICTED-***'
        END as historico_medico,
        CASE 
            WHEN access_level IN ('full', 'professional') THEN patient_record.medicamentos_atuais
            ELSE '***-MEDICAL-DATA-RESTRICTED-***'
        END as medicamentos_atuais,
        CASE 
            WHEN access_level IN ('full', 'professional') THEN patient_record.observacoes
            ELSE '***-NOTES-RESTRICTED-***'
        END as observacoes,
        patient_record.responsavel_nome,
        patient_record.responsavel_telefone,
        patient_record.responsavel_email,
        patient_record.status,
        patient_record.professional_id,
        patient_record.caregiver_id,
        patient_record.created_at,
        patient_record.updated_at,
        access_level;
END;
$$;