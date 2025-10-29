-- Fix patient deletion by removing conflicting FK on audit log table
-- The audit trigger inserts into patient_access_log after patient delete,
-- so a strict FK to pacientes causes 23503 violations. Keep logs without FK.

ALTER TABLE public.patient_access_log
  DROP CONSTRAINT IF EXISTS fk_patient_access_log_patient;

ALTER TABLE public.patient_access_log
  DROP CONSTRAINT IF EXISTS patient_access_log_patient_id_fkey; -- from previous migration

-- Optionally, add an index to keep lookups fast without enforcing FK
CREATE INDEX IF NOT EXISTS idx_patient_access_log_patient_id
  ON public.patient_access_log (patient_id);
