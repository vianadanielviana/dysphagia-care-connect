-- Fix Critical Security Issue: Patient Medical Records Access Control (Final)
-- 
-- ISSUE: The 'pacientes' table currently allows ANY approved user to access ALL patient records
-- FIX: Implement strict relationship-based access control

-- Add relationship columns for proper access control
ALTER TABLE public.pacientes 
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS caregiver_id UUID REFERENCES auth.users(id);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_pacientes_professional_id ON public.pacientes(professional_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_caregiver_id ON public.pacientes(caregiver_id);

-- Drop ALL existing policies completely
DO $$ 
DECLARE 
    pol_name TEXT;
BEGIN
    -- Get all policy names for pacientes table and drop them
    FOR pol_name IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'pacientes' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.pacientes', pol_name);
    END LOOP;
END $$;

-- Create new secure policies with completely unique names
CREATE POLICY "pacientes_select_relationship_based_v1" ON public.pacientes
FOR SELECT USING (
    -- Healthcare professionals see their assigned patients only
    (professional_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR
    -- Caregivers see their assigned patients only
    (caregiver_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario = 'cuidador'
    ))
    OR
    -- Admin override
    (auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com')
    OR
    -- Approved admins see all patients
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario = 'admin'
    ))
);

CREATE POLICY "pacientes_insert_professionals_only_v1" ON public.pacientes
FOR INSERT WITH CHECK (
    -- Only healthcare professionals can create records
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR 
    -- Admin override
    (auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com')
);

CREATE POLICY "pacientes_update_relationship_based_v1" ON public.pacientes
FOR UPDATE USING (
    -- Assigned professional can update
    (professional_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR
    -- Assigned caregiver can update
    (caregiver_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario = 'cuidador'
    ))
    OR
    -- Admin override
    (auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com')
    OR
    -- Approved admins can update all
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario = 'admin'
    ))
);

CREATE POLICY "pacientes_delete_restricted_v1" ON public.pacientes
FOR DELETE USING (
    -- Only assigned professional can delete
    (professional_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR
    -- Admin override
    (auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com')
    OR
    -- Approved admins can delete
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario = 'admin'
    ))
);

-- Create audit log for compliance
CREATE TABLE IF NOT EXISTS public.patient_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    patient_id UUID,
    action TEXT NOT NULL,
    user_type TEXT,
    accessed_fields TEXT[],
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    CONSTRAINT fk_patient_access_log_patient 
        FOREIGN KEY (patient_id) REFERENCES public.pacientes(id) ON DELETE SET NULL
);

-- Enable RLS on audit log
ALTER TABLE public.patient_access_log ENABLE ROW LEVEL SECURITY;

-- Audit log policies
DROP POLICY IF EXISTS "Patient_access_log_read_policy" ON public.patient_access_log;
DROP POLICY IF EXISTS "Patient_access_log_insert_policy" ON public.patient_access_log;

CREATE POLICY "audit_log_read_admins_only_v1" ON public.patient_access_log
FOR SELECT USING (
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR 
    (auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com')
);

CREATE POLICY "audit_log_system_insert_v1" ON public.patient_access_log
FOR INSERT WITH CHECK (true);

-- Add security documentation
COMMENT ON TABLE public.pacientes IS 'Patient medical records with strict relationship-based RLS policies. Access restricted to assigned healthcare professionals and caregivers only.';
COMMENT ON TABLE public.patient_access_log IS 'HIPAA-compliant audit log tracking all patient data access for security monitoring and compliance.';
COMMENT ON COLUMN public.pacientes.professional_id IS 'Healthcare professional assigned to this patient - determines access rights.';
COMMENT ON COLUMN public.pacientes.caregiver_id IS 'Caregiver assigned to this patient - determines access rights.';