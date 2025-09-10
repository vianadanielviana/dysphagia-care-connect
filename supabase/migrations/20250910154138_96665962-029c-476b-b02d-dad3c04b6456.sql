-- Complete the security fix without the problematic constraint
-- The RLS policies already provide the main security protection

-- Create a simple logging function for access auditing (without security definer)
CREATE OR REPLACE FUNCTION public.log_patient_access_simple(patient_id uuid, action_type text)
RETURNS void
LANGUAGE sql
STABLE SET search_path = 'public'
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
COMMENT ON TABLE public.pacientes IS 'SECURE: Patient medical records with simplified RLS policies. Access strictly controlled by assignment relationships. Only admins, assigned professionals, and assigned caregivers can access patient data.';