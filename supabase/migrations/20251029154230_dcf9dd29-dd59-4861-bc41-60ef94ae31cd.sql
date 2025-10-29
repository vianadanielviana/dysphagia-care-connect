-- Extend cascade delete across related child tables to fully remove patient data

-- triage_answers -> triage_assessments (assessment_id)
ALTER TABLE public.triage_answers
DROP CONSTRAINT IF EXISTS triage_answers_assessment_id_fkey;

ALTER TABLE public.triage_answers
ADD CONSTRAINT triage_answers_assessment_id_fkey
FOREIGN KEY (assessment_id)
REFERENCES public.triage_assessments(id)
ON DELETE CASCADE;

-- daily_record_symptoms -> daily_records (daily_record_id)
ALTER TABLE public.daily_record_symptoms
DROP CONSTRAINT IF EXISTS daily_record_symptoms_daily_record_id_fkey;

ALTER TABLE public.daily_record_symptoms
ADD CONSTRAINT daily_record_symptoms_daily_record_id_fkey
FOREIGN KEY (daily_record_id)
REFERENCES public.daily_records(id)
ON DELETE CASCADE;

-- media_files -> daily_records (daily_record_id)
ALTER TABLE public.media_files
DROP CONSTRAINT IF EXISTS media_files_daily_record_id_fkey;

ALTER TABLE public.media_files
ADD CONSTRAINT media_files_daily_record_id_fkey
FOREIGN KEY (daily_record_id)
REFERENCES public.daily_records(id)
ON DELETE CASCADE;