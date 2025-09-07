-- =====================================================
-- FINAL SECURITY FIXES FOR PATIENT DATA PROTECTION  
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

-- 2. Enhanced logging function with proper OLD/NEW handling
CREATE OR REPLACE FUNCTION public.log_patient_access()
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
    
    -- Enhanced logging with security metadata
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
            'table', TG_TABLE_NAME,
            'timestamp', now(),
            'ip_address', inet_client_addr(),
            'session_id', current_setting('application_name', true)
        )
    );
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$function$;

-- 3. Create enhanced security authorization functions
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
        (p.professional_id = auth.uid() AND pr.tipo_usuario IN ('fonoaudiologo', 'admin'))
        OR
        -- Caregiver assigned to patient  
        (p.caregiver_id = auth.uid() AND pr.tipo_usuario = 'cuidador')
        OR
        -- System admin (secure check, no hardcoded emails)
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

-- 4. Replace old insecure RLS policies with new secure ones
DROP POLICY IF EXISTS "rls_pacientes_select_2025" ON public.pacientes;
DROP POLICY IF EXISTS "rls_pacientes_insert_2025" ON public.pacientes;
DROP POLICY IF EXISTS "rls_pacientes_update_2025" ON public.pacientes;
DROP POLICY IF EXISTS "rls_pacientes_delete_2025" ON public.pacientes;

-- Enhanced SELECT policy - removes hardcoded email dependency
CREATE POLICY "secure_pacientes_select_2025" 
ON public.pacientes 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL
  AND public.is_authorized_for_patient(id)
);

-- Enhanced INSERT policy - stricter validation
CREATE POLICY "secure_pacientes_insert_2025" 
ON public.pacientes 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.can_create_patients()
);

-- Enhanced UPDATE policy - granular access control
CREATE POLICY "secure_pacientes_update_2025" 
ON public.pacientes 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL
  AND public.is_authorized_for_patient(id)
);

-- Enhanced DELETE policy - most restrictive access
CREATE POLICY "secure_pacientes_delete_2025" 
ON public.pacientes 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL
  AND (
    -- System admin
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND is_approved = true 
        AND tipo_usuario = 'admin'
    )
    OR
    -- Assigned professional only
    (professional_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND is_approved = true 
        AND tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
  )
);

-- 5. Add comprehensive audit logging trigger
DROP TRIGGER IF EXISTS log_pacientes_access ON public.pacientes;
CREATE TRIGGER log_pacientes_access
  AFTER INSERT OR UPDATE OR DELETE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.log_patient_access();

-- 6. Add performance indexes (without CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_pacientes_professional_id ON public.pacientes(professional_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_caregiver_id ON public.pacientes(caregiver_id);  
CREATE INDEX IF NOT EXISTS idx_profiles_user_type_approved ON public.profiles(tipo_usuario, is_approved);

-- 7. Add data integrity validation
CREATE OR REPLACE FUNCTION public.validate_patient_data_integrity()
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
      RAISE EXCEPTION 'Professional ID is invalid or not approved';
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
      RAISE EXCEPTION 'Caregiver ID is invalid or not approved';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add validation trigger
DROP TRIGGER IF EXISTS validate_patient_integrity ON public.pacientes;
CREATE TRIGGER validate_patient_integrity
  BEFORE INSERT OR UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.validate_patient_data_integrity();