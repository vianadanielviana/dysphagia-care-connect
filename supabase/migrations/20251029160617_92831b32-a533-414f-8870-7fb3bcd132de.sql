-- Ensure default assignments on patient creation to satisfy RLS/trigger validations
-- 1) Function to set usuario_cadastro_id and default professional_id
CREATE OR REPLACE FUNCTION public.set_default_patient_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always stamp creator when missing
  IF NEW.usuario_cadastro_id IS NULL THEN
    NEW.usuario_cadastro_id = auth.uid();
  END IF;

  -- Auto-assign professional when creator is an authorized professional
  IF NEW.professional_id IS NULL THEN
    IF public.is_system_admin_secure() THEN
      -- Admin may intentionally leave unassigned; allowed by other validations
      NULL;
    ELSIF public.is_authorized_healthcare_professional() THEN
      NEW.professional_id = auth.uid();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Trigger before insert on pacientes
DROP TRIGGER IF EXISTS set_default_patient_assignment ON public.pacientes;
CREATE TRIGGER set_default_patient_assignment
BEFORE INSERT ON public.pacientes
FOR EACH ROW
EXECUTE FUNCTION public.set_default_patient_assignment();