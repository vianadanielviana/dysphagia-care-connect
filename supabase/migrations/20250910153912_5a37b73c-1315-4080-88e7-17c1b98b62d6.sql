-- Fix the security definer view issue by removing it and using simpler approach
DROP VIEW IF EXISTS public.patients_secure_view;

-- Remove the security_barrier property that caused the issue
-- Instead, we'll rely on the simplified RLS policies we already created

-- Add additional security constraint: prevent unassigned patients
ALTER TABLE public.pacientes 
ADD CONSTRAINT IF NOT EXISTS check_patient_has_assignment 
CHECK (professional_id IS NOT NULL OR caregiver_id IS NOT NULL);

-- Create a simple logging function for access auditing (without security definer)
CREATE OR REPLACE FUNCTION public.log_patient_access_simple(patient_id uuid, action_type text)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO public.patient_access_log (
    user_id, patient_id, action, user_type, metadata
  ) VALUES (
    auth.uid(), 
    patient_id, 
    action_type,
    (SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()),
    jsonb_build_object('timestamp', now(), 'simplified_logging', true)
  );
$$;

-- Update table comment for security documentation
COMMENT ON TABLE public.pacientes IS 'SECURE: Patient medical records with simplified RLS policies. Access strictly controlled by assignment relationships. All policies use basic functions without security definer.';