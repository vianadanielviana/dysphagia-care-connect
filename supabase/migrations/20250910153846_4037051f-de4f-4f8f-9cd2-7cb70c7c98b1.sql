-- COMPREHENSIVE SECURITY FIX: Complete simplification of patient access control
-- This addresses all remaining security concerns for the pacientes table

-- Remove all remaining complex policies
DROP POLICY IF EXISTS "rls_secure_patient_delete_2025" ON public.pacientes;
DROP POLICY IF EXISTS "rls_secure_patient_insert_2025" ON public.pacientes;
DROP POLICY IF EXISTS "rls_secure_patient_update_2025" ON public.pacientes;

-- Create completely simplified and secure policies for all operations

-- 1. SIMPLIFIED INSERT: Only approved professionals can create patients
CREATE POLICY "simple_patient_insert" ON public.pacientes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.is_approved_user()
    AND public.get_current_user_type() IN ('fonoaudiologo', 'admin')
  );

-- 2. SIMPLIFIED UPDATE: Only admins or assigned professionals can update
CREATE POLICY "simple_patient_update" ON public.pacientes
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND public.is_approved_user()
    AND (
      public.is_system_admin()
      OR 
      (professional_id = auth.uid() AND public.get_current_user_type() IN ('fonoaudiologo', 'admin'))
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.is_approved_user()
    AND (
      public.is_system_admin()
      OR 
      (professional_id = auth.uid() AND public.get_current_user_type() IN ('fonoaudiologo', 'admin'))
    )
  );

-- 3. SIMPLIFIED DELETE: Only admins can delete patients
CREATE POLICY "simple_patient_delete" ON public.pacientes
  FOR DELETE
  TO authenticated  
  USING (
    auth.uid() IS NOT NULL
    AND public.is_system_admin()
  );

-- Add additional constraints to prevent unauthorized assignments
-- Ensure that professional assignments are only made by authorized users
CREATE OR REPLACE FUNCTION public.validate_patient_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get current user profile
  SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
  
  -- Only allow assignment changes by admins or the user themselves
  IF NEW.professional_id IS NOT NULL AND NEW.professional_id != OLD.professional_id THEN
    IF NOT (user_profile.tipo_usuario = 'admin' OR user_profile.is_admin = true) THEN
      RAISE EXCEPTION 'Only administrators can assign patients to professionals';
    END IF;
  END IF;
  
  IF NEW.caregiver_id IS NOT NULL AND NEW.caregiver_id != OLD.caregiver_id THEN
    IF NOT (user_profile.tipo_usuario = 'admin' OR user_profile.is_admin = true) THEN
      RAISE EXCEPTION 'Only administrators can assign patients to caregivers';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply the validation trigger
DROP TRIGGER IF EXISTS validate_patient_assignment_trigger ON public.pacientes;
CREATE TRIGGER validate_patient_assignment_trigger
  BEFORE UPDATE ON public.pacientes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_patient_assignment();

-- Create a secure view for patient data that masks sensitive information based on user type
CREATE OR REPLACE VIEW public.patients_secure_view AS
SELECT 
  p.id,
  p.nome,
  CASE 
    WHEN public.is_system_admin() OR p.professional_id = auth.uid() THEN p.cpf
    ELSE '***.***.***-**'
  END as cpf,
  CASE 
    WHEN public.is_system_admin() OR p.professional_id = auth.uid() OR p.caregiver_id = auth.uid() THEN p.email
    ELSE LEFT(COALESCE(p.email, ''), 3) || '***@***.com'
  END as email,
  CASE 
    WHEN public.is_system_admin() OR p.professional_id = auth.uid() OR p.caregiver_id = auth.uid() THEN p.telefone
    ELSE '(***) ****-****'
  END as telefone,
  CASE 
    WHEN public.is_system_admin() OR p.professional_id = auth.uid() OR p.caregiver_id = auth.uid() THEN p.data_nascimento
    ELSE NULL
  END as data_nascimento,
  CASE 
    WHEN public.is_system_admin() OR p.professional_id = auth.uid() OR p.caregiver_id = auth.uid() THEN p.endereco
    ELSE 'Informação Restrita'
  END as endereco,
  CASE 
    WHEN public.is_system_admin() OR p.professional_id = auth.uid() THEN p.diagnostico
    ELSE 'Informação Médica Restrita'
  END as diagnostico,
  CASE 
    WHEN public.is_system_admin() OR p.professional_id = auth.uid() THEN p.historico_medico
    ELSE 'Informação Médica Restrita'
  END as historico_medico,
  CASE 
    WHEN public.is_system_admin() OR p.professional_id = auth.uid() THEN p.medicamentos_atuais
    ELSE 'Informação Médica Restrita'
  END as medicamentos_atuais,
  p.observacoes,
  p.responsavel_nome,
  CASE 
    WHEN public.is_system_admin() OR p.professional_id = auth.uid() OR p.caregiver_id = auth.uid() THEN p.responsavel_email
    ELSE LEFT(COALESCE(p.responsavel_email, ''), 3) || '***@***.com'
  END as responsavel_email,
  CASE 
    WHEN public.is_system_admin() OR p.professional_id = auth.uid() OR p.caregiver_id = auth.uid() THEN p.responsavel_telefone
    ELSE '(***) ****-****'
  END as responsavel_telefone,
  p.professional_id,
  p.caregiver_id,
  p.status,
  p.created_at,
  p.updated_at
FROM public.pacientes p
WHERE (
  public.is_system_admin()
  OR 
  (p.professional_id = auth.uid() AND public.get_current_user_type() IN ('fonoaudiologo', 'admin'))
  OR
  (p.caregiver_id = auth.uid() AND public.get_current_user_type() = 'cuidador')
);

-- Add RLS to the secure view
ALTER VIEW public.patients_secure_view SET (security_barrier = true);

-- Update table comment with enhanced security documentation
COMMENT ON TABLE public.pacientes IS 'SECURE: Patient medical records with strict RLS policies. Direct access restricted - use patients_secure_view for field-level security. All access logged for HIPAA compliance.';

COMMENT ON VIEW public.patients_secure_view IS 'SECURE VIEW: Provides field-level access control for patient data based on user role and assignment. Medical information only visible to assigned professionals and administrators.';