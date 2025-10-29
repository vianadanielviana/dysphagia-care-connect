-- Simplify patient insert policy to allow approved healthcare professionals and admins
-- to create patients without requiring professional_id to match their own ID

DROP POLICY IF EXISTS "pacientes_insert_professionals_only" ON public.pacientes;

CREATE POLICY "pacientes_insert_professionals_only"
ON public.pacientes
FOR INSERT
WITH CHECK (
  is_authorized_healthcare_professional() OR is_system_admin_secure()
);