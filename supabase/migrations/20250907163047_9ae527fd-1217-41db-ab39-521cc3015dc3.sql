-- =====================================================
-- EMERGENCY SECURITY FIX FOR PACIENTES_SAFE TABLE
-- =====================================================

-- 1. IMMEDIATELY Enable Row Level Security on pacientes_safe table
ALTER TABLE public.pacientes_safe ENABLE ROW LEVEL SECURITY;

-- 2. Create comprehensive RLS policies using the same secure functions
-- These policies will use the authorization functions created earlier

-- SELECT policy - only authorized users can view patient data
CREATE POLICY "secure_pacientes_safe_select_2025" 
ON public.pacientes_safe 
FOR SELECT 
USING (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Use the same authorization function as main pacientes table
  public.is_authorized_for_patient(id)
);

-- INSERT policy - only healthcare professionals can create records
CREATE POLICY "secure_pacientes_safe_insert_2025" 
ON public.pacientes_safe 
FOR INSERT 
WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Only approved healthcare professionals can create records
  public.can_create_patients()
  AND
  -- Ensure professional is assigned or user is creating for themselves
  (
    professional_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND is_approved = true 
        AND tipo_usuario = 'admin'
    )
  )
);

-- UPDATE policy - only authorized users can modify patient data
CREATE POLICY "secure_pacientes_safe_update_2025" 
ON public.pacientes_safe 
FOR UPDATE 
USING (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Use secure authorization function
  public.is_authorized_for_patient(id)
)
WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Use secure authorization function
  public.is_authorized_for_patient(id)
);

-- DELETE policy - most restrictive, only admins and assigned professionals
CREATE POLICY "secure_pacientes_safe_delete_2025" 
ON public.pacientes_safe 
FOR DELETE 
USING (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  (
    -- System admin
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND is_approved = true 
        AND tipo_usuario = 'admin'
    )
    OR
    -- Assigned professional
    (professional_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND is_approved = true 
        AND tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
  )
);

-- 3. Add comprehensive audit logging for pacientes_safe table
CREATE OR REPLACE FUNCTION public.log_pacientes_safe_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    patient_uuid uuid;
BEGIN
    -- Get patient ID based on operation type
    patient_uuid := CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.id
        ELSE NEW.id
    END;
    
    -- Log access to sensitive medical data
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
            WHEN TG_OP = 'INSERT' THEN 'CREATE_SAFE'
            WHEN TG_OP = 'UPDATE' THEN 'UPDATE_SAFE'
            WHEN TG_OP = 'DELETE' THEN 'DELETE_SAFE'
            ELSE 'VIEW_SAFE'
        END,
        COALESCE((SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()), 'unknown'),
        CASE 
            WHEN TG_OP = 'UPDATE' THEN 
                ARRAY(SELECT key FROM jsonb_each(to_jsonb(NEW)) WHERE key != 'updated_at')
            WHEN TG_OP = 'DELETE' THEN
                ARRAY['*'] 
            ELSE 
                ARRAY['*']
        END,
        jsonb_build_object(
            'operation', TG_OP,
            'table', 'pacientes_safe',
            'timestamp', now(),
            'ip_address', inet_client_addr(),
            'session_id', current_setting('application_name', true),
            'severity', 'HIGH_SENSITIVE_DATA'
        )
    );
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$function$;

-- Add audit trigger for pacientes_safe
CREATE TRIGGER log_pacientes_safe_access
  AFTER INSERT OR UPDATE OR DELETE ON public.pacientes_safe
  FOR EACH ROW EXECUTE FUNCTION public.log_pacientes_safe_access();

-- 4. Add performance indexes for security policies
CREATE INDEX IF NOT EXISTS idx_pacientes_safe_professional_id ON public.pacientes_safe(professional_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_safe_caregiver_id ON public.pacientes_safe(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_safe_id ON public.pacientes_safe(id);

-- 5. Add data integrity validation for pacientes_safe
CREATE OR REPLACE FUNCTION public.validate_pacientes_safe_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate professional exists and is approved (if set)
  IF NEW.professional_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.professional_id
        AND is_approved = true
        AND tipo_usuario IN ('fonoaudiologo', 'admin')
    ) THEN
      RAISE EXCEPTION 'Professional ID is invalid or not approved for pacientes_safe';
    END IF;
  END IF;
  
  -- Validate caregiver exists and is approved (if set)
  IF NEW.caregiver_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.caregiver_id
        AND is_approved = true
        AND tipo_usuario = 'cuidador'
    ) THEN
      RAISE EXCEPTION 'Caregiver ID is invalid or not approved for pacientes_safe';
    END IF;
  END IF;
  
  -- Additional validation for highly sensitive data
  -- Ensure CPF is properly formatted (if provided)
  IF NEW.cpf IS NOT NULL AND NEW.cpf != '' THEN
    -- Basic CPF format validation (digits only, 11 characters)
    IF NOT (NEW.cpf ~ '^[0-9]{11}$') THEN
      RAISE EXCEPTION 'CPF must be 11 digits only';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add validation trigger for pacientes_safe
CREATE TRIGGER validate_pacientes_safe_integrity
  BEFORE INSERT OR UPDATE ON public.pacientes_safe
  FOR EACH ROW EXECUTE FUNCTION public.validate_pacientes_safe_integrity();

-- 6. Create a secure view that further restricts sensitive data access
CREATE OR REPLACE VIEW public.pacientes_medical_restricted AS
SELECT 
  p.id,
  p.nome,
  p.data_nascimento,
  p.status,
  p.created_at,
  p.updated_at,
  p.professional_id,
  p.caregiver_id,
  -- Only show CPF to specific authorized users
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() 
        AND pr.is_approved = true 
        AND pr.tipo_usuario IN ('fonoaudiologo', 'admin')
        AND public.is_authorized_for_patient(p.id)
    ) THEN p.cpf
    ELSE '***-PROTECTED-***'
  END AS cpf,
  -- Contact info only for authorized users
  CASE 
    WHEN public.is_authorized_for_patient(p.id) THEN p.telefone
    ELSE '***-PROTECTED-***'
  END AS telefone,
  CASE 
    WHEN public.is_authorized_for_patient(p.id) THEN p.email
    ELSE '***-PROTECTED-***'
  END AS email,
  -- Medical data only for healthcare professionals
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() 
        AND pr.is_approved = true 
        AND pr.tipo_usuario IN ('fonoaudiologo', 'admin')
        AND public.is_authorized_for_patient(p.id)
    ) THEN p.diagnostico
    ELSE '***-MEDICAL-DATA-RESTRICTED-***'
  END AS diagnostico,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() 
        AND pr.is_approved = true 
        AND pr.tipo_usuario IN ('fonoaudiologo', 'admin')
        AND public.is_authorized_for_patient(p.id)
    ) THEN p.medicamentos_atuais
    ELSE '***-MEDICAL-DATA-RESTRICTED-***'
  END AS medicamentos_atuais,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() 
        AND pr.is_approved = true 
        AND pr.tipo_usuario IN ('fonoaudiologo', 'admin')
        AND public.is_authorized_for_patient(p.id)
    ) THEN p.historico_medico
    ELSE '***-MEDICAL-DATA-RESTRICTED-***'
  END AS historico_medico
FROM public.pacientes_safe p
WHERE public.is_authorized_for_patient(p.id);

-- Grant appropriate permissions
GRANT SELECT ON public.pacientes_medical_restricted TO authenticated;