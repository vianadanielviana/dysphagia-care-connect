-- Fix security functions that are preventing access to data

-- Recreate the is_system_admin_secure function correctly
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
      AND (tipo_usuario = 'admin' OR is_admin = true)
  );
$$;

-- Recreate the can_create_patients function correctly  
CREATE OR REPLACE FUNCTION public.can_create_patients()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_approved = true
      AND (tipo_usuario IN ('fonoaudiologo', 'admin') OR is_admin = true)
  );
$$;

-- Recreate the is_authorized_for_patient function correctly
CREATE OR REPLACE FUNCTION public.is_authorized_for_patient(patient_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pacientes p
    JOIN public.profiles prof ON (prof.id = auth.uid())
    WHERE p.id = patient_uuid
      AND prof.is_approved = true
      AND (
        (p.professional_id = auth.uid() AND (prof.tipo_usuario IN ('fonoaudiologo', 'admin') OR prof.is_admin = true))
        OR
        (p.caregiver_id = auth.uid() AND prof.tipo_usuario = 'cuidador')
        OR
        (prof.tipo_usuario = 'admin' OR prof.is_admin = true)
      )
  );
$$;