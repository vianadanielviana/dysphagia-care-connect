-- Políticas para permitir leitura dos registros diários

-- Cuidadores podem visualizar seus próprios registros
CREATE POLICY "Caregivers can view their own records"
ON daily_records
FOR SELECT
USING (caregiver_id = auth.uid());

-- Profissionais podem visualizar registros dos seus pacientes
CREATE POLICY "Professionals can view patient records"
ON daily_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pacientes p
    WHERE p.id = daily_records.patient_id
    AND p.professional_id = auth.uid()
    AND is_authorized_healthcare_professional()
  )
);

-- Permitir visualização dos sintomas relacionados aos registros diários
CREATE POLICY "Caregivers can view symptoms from their records"
ON daily_record_symptoms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM daily_records dr
    WHERE dr.id = daily_record_symptoms.daily_record_id
    AND dr.caregiver_id = auth.uid()
  )
);

CREATE POLICY "Professionals can view symptoms from patient records"
ON daily_record_symptoms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM daily_records dr
    JOIN pacientes p ON p.id = dr.patient_id
    WHERE dr.id = daily_record_symptoms.daily_record_id
    AND p.professional_id = auth.uid()
    AND is_authorized_healthcare_professional()
  )
);

-- Permitir cuidadores e profissionais deletarem sintomas durante atualização
CREATE POLICY "Caregivers can delete symptoms from their records"
ON daily_record_symptoms
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM daily_records dr
    WHERE dr.id = daily_record_symptoms.daily_record_id
    AND dr.caregiver_id = auth.uid()
  )
);