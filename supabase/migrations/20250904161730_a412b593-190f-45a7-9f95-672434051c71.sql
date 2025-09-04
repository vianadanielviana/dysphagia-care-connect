-- Adicionar foreign key constraint para daily_records.patient_id apontar para pacientes.id
ALTER TABLE public.daily_records 
ADD CONSTRAINT daily_records_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.pacientes(id) ON DELETE CASCADE;