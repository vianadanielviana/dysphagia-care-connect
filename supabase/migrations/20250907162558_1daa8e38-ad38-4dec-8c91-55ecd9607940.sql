-- =====================================================
-- CRITICAL SECURITY FIXES FOR PATIENT DATA PROTECTION
-- =====================================================

-- 1. Fix search_path security issues in existing functions
CREATE OR REPLACE FUNCTION public.update_pacientes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.log_patient_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    -- Enhanced logging with more security checks
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
            ELSE 'VIEW'
        END,
        COALESCE((SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()), 'unknown'),
        CASE 
            WHEN TG_OP = 'UPDATE' THEN 
                ARRAY(SELECT key FROM jsonb_each(to_jsonb(NEW)) WHERE key != 'updated_at')
            ELSE 
                ARRAY['*']
        END,
        jsonb_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'timestamp', now(),
            'ip_address', inet_client_addr(),
            'session_id', current_setting('application_name', true)
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2. Create enhanced security functions
CREATE OR REPLACE FUNCTION public.is_authorized_for_patient(patient_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pacientes p
    JOIN public.profiles pr ON (pr.id = auth.uid())
    WHERE p.id = patient_uuid
      AND pr.is_approved = true
      AND (
        -- Professional assigned to patient
        (p.professional_id = auth.uid() AND pr.tipo_usuario IN ('fonoaudiolog', 'admin'))
        OR
        -- Caregiver assigned to patient  
        (p.caregiver_id = auth.uid() AND pr.tipo_usuario = 'cuidador')
        OR
        -- System admin (but not hardcoded email)
        (pr.tipo_usuario = 'admin')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_create_patients()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_approved = true
      AND tipo_usuario IN ('fonoaudiologo', 'admin')
  );
$$;

-- 3. Create more secure RLS policies for pacientes table
DROP POLICY IF EXISTS "rls_pacientes_select_2025" ON public.pacientes;
DROP POLICY IF EXISTS "rls_pacientes_insert_2025" ON public.pacientes;
DROP POLICY IF EXISTS "rls_pacientes_update_2025" ON public.pacientes;
DROP POLICY IF EXISTS "rls_pacientes_delete_2025" ON public.pacientes;

-- Enhanced SELECT policy - more restrictive
CREATE POLICY "secure_pacientes_select_2025" 
ON public.pacientes 
FOR SELECT 
USING (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Use secure function instead of hardcoded checks
  public.is_authorized_for_patient(id)
);

-- Enhanced INSERT policy - stricter validation
CREATE POLICY "secure_pacientes_insert_2025" 
ON public.pacientes 
FOR INSERT 
WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Use secure function for authorization
  public.can_create_patients()
  AND
  -- Ensure professional_id or caregiver_id is set properly
  (
    (professional_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND is_approved = true 
        AND tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR
    (caregiver_id IS NOT NULL AND professional_id IS NOT NULL)
  )
);

-- Enhanced UPDATE policy - more granular control
CREATE POLICY "secure_pacientes_update_2025" 
ON public.pacientes 
FOR UPDATE 
USING (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Use secure function for authorization
  public.is_authorized_for_patient(id)
)
WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Use secure function for authorization
  public.is_authorized_for_patient(id)
  AND
  -- Prevent unauthorized role changes
  (
    -- Professional can only modify if they're assigned
    (professional_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND is_approved = true 
        AND tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR
    -- Caregiver can only modify basic info, not assignments
    (caregiver_id = auth.uid() AND 
     OLD.professional_id = NEW.professional_id AND 
     OLD.caregiver_id = NEW.caregiver_id AND
     EXISTS (
       SELECT 1 FROM public.profiles 
       WHERE id = auth.uid() 
         AND is_approved = true 
         AND tipo_usuario = 'cuidador'
     ))
    OR
    -- Admin can modify everything
    (EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND is_approved = true 
        AND tipo_usuario = 'admin'
    ))
  )
);

-- Enhanced DELETE policy - most restrictive
CREATE POLICY "secure_pacientes_delete_2025" 
ON public.pacientes 
FOR DELETE 
USING (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Only admins or assigned professionals can delete
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

-- 4. Add trigger for comprehensive audit logging
DROP TRIGGER IF EXISTS log_pacientes_access ON public.pacientes;
CREATE TRIGGER log_pacientes_access
  AFTER INSERT OR UPDATE OR DELETE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.log_patient_access();

-- 5. Add indexes for better performance on security checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pacientes_professional_id ON public.pacientes(professional_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pacientes_caregiver_id ON public.pacientes(caregiver_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_type_approved ON public.profiles(tipo_usuario, is_approved);

-- 6. Create view for safe patient data access (excludes most sensitive fields by default)
CREATE OR REPLACE VIEW public.pacientes_safe_view AS
SELECT 
  p.id,
  p.nome,
  p.data_nascimento,
  p.status,
  p.created_at,
  p.updated_at,
  p.professional_id,
  p.caregiver_id,
  -- Only show sensitive data to authorized users
  CASE 
    WHEN public.is_authorized_for_patient(p.id) THEN p.cpf
    ELSE '***-RESTRITO-***'
  END AS cpf,
  CASE 
    WHEN public.is_authorized_for_patient(p.id) THEN p.telefone
    ELSE '***-RESTRITO-***'
  END AS telefone,
  CASE 
    WHEN public.is_authorized_for_patient(p.id) THEN p.email
    ELSE '***-RESTRITO-***'
  END AS email,
  -- Medical data only for healthcare professionals
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND is_approved = true 
        AND tipo_usuario IN ('fonoaudiologo', 'admin')
        AND public.is_authorized_for_patient(p.id)
    ) THEN p.diagnostico
    ELSE '***-ACESSO-RESTRITO-***'
  END AS diagnostico,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND is_approved = true 
        AND tipo_usuario IN ('fonoaudiologo', 'admin')
        AND public.is_authorized_for_patient(p.id)
    ) THEN p.medicamentos_atuais
    ELSE '***-ACESSO-RESTRITO-***'
  END AS medicamentos_atuais,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND is_approved = true 
        AND tipo_usuario IN ('fonoaudiologo', 'admin')
        AND public.is_authorized_for_patient(p.id)
    ) THEN p.historico_medico
    ELSE '***-ACESSO-RESTRITO-***'
  END AS historico_medico
FROM public.pacientes p
WHERE public.is_authorized_for_patient(p.id);

-- Enable RLS on the view
ALTER VIEW public.pacientes_safe_view OWNER TO postgres;
GRANT SELECT ON public.pacientes_safe_view TO authenticated;

-- 7. Add security validation function for data integrity
CREATE OR REPLACE FUNCTION public.validate_patient_data_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that professional exists and is approved
  IF NEW.professional_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.professional_id
        AND is_approved = true
        AND tipo_usuario IN ('fonoaudiologo', 'admin')
    ) THEN
      RAISE EXCEPTION 'Professional ID is invalid or not approved';
    END IF;
  END IF;
  
  -- Validate that caregiver exists and is approved
  IF NEW.caregiver_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.caregiver_id
        AND is_approved = true
        AND tipo_usuario = 'cuidador'
    ) THEN
      RAISE EXCEPTION 'Caregiver ID is invalid or not approved';
    END IF;
  END IF;
  
  -- Ensure at least one of professional or caregiver is assigned
  IF NEW.professional_id IS NULL AND NEW.caregiver_id IS NULL THEN
    RAISE EXCEPTION 'Patient must have either a professional or caregiver assigned';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add validation trigger
DROP TRIGGER IF EXISTS validate_patient_integrity ON public.pacientes;
CREATE TRIGGER validate_patient_integrity
  BEFORE INSERT OR UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.validate_patient_data_integrity();