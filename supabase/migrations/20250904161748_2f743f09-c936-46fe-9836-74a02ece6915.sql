-- Remover a constraint existente do daily_records.patient_id
ALTER TABLE public.daily_records DROP CONSTRAINT IF EXISTS daily_records_patient_id_fkey;

-- Adicionar nova constraint que aponta para a tabela 'pacientes'  
ALTER TABLE public.daily_records 
ADD CONSTRAINT daily_records_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.pacientes(id) ON DELETE CASCADE;