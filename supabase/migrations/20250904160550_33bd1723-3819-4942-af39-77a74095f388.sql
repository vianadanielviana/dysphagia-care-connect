-- Remover a constraint do caregiver_id que aponta para a tabela 'users'
ALTER TABLE public.triage_assessments DROP CONSTRAINT IF EXISTS triage_assessments_caregiver_id_fkey;

-- Adicionar nova constraint que aponta para a tabela 'profiles'
ALTER TABLE public.triage_assessments 
ADD CONSTRAINT triage_assessments_caregiver_id_fkey 
FOREIGN KEY (caregiver_id) REFERENCES public.profiles(id);