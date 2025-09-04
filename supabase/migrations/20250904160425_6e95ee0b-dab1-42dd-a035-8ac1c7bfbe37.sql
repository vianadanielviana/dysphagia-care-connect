-- Remover a constraint existente que aponta para a tabela 'patients'
ALTER TABLE public.triage_assessments DROP CONSTRAINT IF EXISTS triage_assessments_patient_id_fkey;

-- Adicionar nova constraint que aponta para a tabela 'pacientes'
ALTER TABLE public.triage_assessments 
ADD CONSTRAINT triage_assessments_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.pacientes(id);