-- Enable cascade delete for patient-related tables
-- This allows deleting patients and automatically removing all related records

-- Drop and recreate foreign key for triage_assessments
ALTER TABLE public.triage_assessments
DROP CONSTRAINT IF EXISTS triage_assessments_patient_id_fkey;

ALTER TABLE public.triage_assessments
ADD CONSTRAINT triage_assessments_patient_id_fkey
FOREIGN KEY (patient_id)
REFERENCES public.pacientes(id)
ON DELETE CASCADE;

-- Drop and recreate foreign key for daily_records
ALTER TABLE public.daily_records
DROP CONSTRAINT IF EXISTS daily_records_patient_id_fkey;

ALTER TABLE public.daily_records
ADD CONSTRAINT daily_records_patient_id_fkey
FOREIGN KEY (patient_id)
REFERENCES public.pacientes(id)
ON DELETE CASCADE;

-- Drop and recreate foreign key for communications
ALTER TABLE public.communications
DROP CONSTRAINT IF EXISTS communications_patient_id_fkey;

ALTER TABLE public.communications
ADD CONSTRAINT communications_patient_id_fkey
FOREIGN KEY (patient_id)
REFERENCES public.pacientes(id)
ON DELETE CASCADE;

-- Drop and recreate foreign key for patient_access_log
ALTER TABLE public.patient_access_log
DROP CONSTRAINT IF EXISTS patient_access_log_patient_id_fkey;

ALTER TABLE public.patient_access_log
ADD CONSTRAINT patient_access_log_patient_id_fkey
FOREIGN KEY (patient_id)
REFERENCES public.pacientes(id)
ON DELETE CASCADE;

-- Drop and recreate foreign key for patient_access_permissions
ALTER TABLE public.patient_access_permissions
DROP CONSTRAINT IF EXISTS patient_access_permissions_patient_id_fkey;

ALTER TABLE public.patient_access_permissions
ADD CONSTRAINT patient_access_permissions_patient_id_fkey
FOREIGN KEY (patient_id)
REFERENCES public.pacientes(id)
ON DELETE CASCADE;

-- Drop and recreate foreign key for patient_assignment_approvals
ALTER TABLE public.patient_assignment_approvals
DROP CONSTRAINT IF EXISTS patient_assignment_approvals_patient_id_fkey;

ALTER TABLE public.patient_assignment_approvals
ADD CONSTRAINT patient_assignment_approvals_patient_id_fkey
FOREIGN KEY (patient_id)
REFERENCES public.pacientes(id)
ON DELETE CASCADE;

-- Drop and recreate foreign key for patient_assignment_audit
ALTER TABLE public.patient_assignment_audit
DROP CONSTRAINT IF EXISTS patient_assignment_audit_patient_id_fkey;

ALTER TABLE public.patient_assignment_audit
ADD CONSTRAINT patient_assignment_audit_patient_id_fkey
FOREIGN KEY (patient_id)
REFERENCES public.pacientes(id)
ON DELETE CASCADE;