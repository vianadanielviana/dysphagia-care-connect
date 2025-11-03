-- Permitir profissionais de saúde visualizarem RaDIs dos seus pacientes
DROP POLICY IF EXISTS "Professionals can view patient assessments" ON triage_assessments;
CREATE POLICY "Professionals can view patient assessments" 
ON triage_assessments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM pacientes p
    WHERE p.id = triage_assessments.patient_id
    AND p.professional_id = auth.uid()
    AND is_authorized_healthcare_professional()
  )
);

-- Permitir profissionais de saúde visualizarem respostas dos RaDIs dos seus pacientes
DROP POLICY IF EXISTS "Professionals can view patient answers" ON triage_answers;
CREATE POLICY "Professionals can view patient answers" 
ON triage_answers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM triage_assessments ta
    JOIN pacientes p ON p.id = ta.patient_id
    WHERE ta.id = triage_answers.assessment_id
    AND p.professional_id = auth.uid()
    AND is_authorized_healthcare_professional()
  )
);