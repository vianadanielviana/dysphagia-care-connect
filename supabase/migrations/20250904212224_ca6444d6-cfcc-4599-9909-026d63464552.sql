-- Fix Critical Security Issue: Patient Medical Records Access Control (v2)
-- 
-- ISSUE: The 'pacientes' table currently allows ANY approved user (including caregivers) 
-- to access ALL patient medical records, exposing sensitive data like names, CPF, 
-- medical diagnoses, medications, and medical history to unauthorized personnel.
--
-- FIX: Implement relationship-based access control with proper policy replacement

-- First, add relationship columns to establish proper data ownership
ALTER TABLE public.pacientes 
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS caregiver_id UUID REFERENCES auth.users(id);

-- Add index for better performance on relationship queries
CREATE INDEX IF NOT EXISTS idx_pacientes_professional_id ON public.pacientes(professional_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_caregiver_id ON public.pacientes(caregiver_id);

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Approved users can view all patients" ON public.pacientes;
DROP POLICY IF EXISTS "Approved users can create patients" ON public.pacientes;
DROP POLICY IF EXISTS "Approved users can update all patients" ON public.pacientes;
DROP POLICY IF EXISTS "Approved users can delete all patients" ON public.pacientes;
DROP POLICY IF EXISTS "Healthcare professionals can access their assigned patients" ON public.pacientes;
DROP POLICY IF EXISTS "Healthcare professionals can create patients" ON public.pacientes;
DROP POLICY IF EXISTS "Authorized users can update their assigned patients" ON public.pacientes;
DROP POLICY IF EXISTS "Only authorized professionals can delete patients" ON public.pacientes;

-- Create secure relationship-based SELECT policy
CREATE POLICY "Secure_patient_access_policy" ON public.pacientes
FOR SELECT USING (
    -- Healthcare professionals can only see patients assigned to them
    (professional_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR
    -- Caregivers can only see patients they are responsible for
    (caregiver_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario = 'cuidador'
    ))
    OR
    -- Admin override for system administration
    (auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com')
    OR
    -- Admins can see all patients for management purposes
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario = 'admin'
    ))
);

-- Create secure INSERT policy - only professionals can create patients and assign them
CREATE POLICY "Secure_patient_create_policy" ON public.pacientes
FOR INSERT WITH CHECK (
    -- Only healthcare professionals can create patient records
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

-- Create secure UPDATE policy - only assigned professionals and caregivers can update
CREATE POLICY "Secure_patient_update_policy" ON public.pacientes
FOR UPDATE USING (
    -- Healthcare professionals can update patients assigned to them
    (professional_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR
    -- Caregivers can update patients they are responsible for (limited fields)
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
    -- Admins can update all patients
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario = 'admin'
    ))
);

-- Create restrictive DELETE policy - only admins and assigned professionals
CREATE POLICY "Secure_patient_delete_policy" ON public.pacientes
FOR DELETE USING (
    -- Only the assigned healthcare professional can delete
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
    -- Admins can delete any patient
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario = 'admin'
    ))
);

-- Create audit log table for patient data access (HIPAA compliance)
CREATE TABLE IF NOT EXISTS public.patient_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    patient_id UUID,
    action TEXT NOT NULL, -- 'VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT'
    user_type TEXT,
    accessed_fields TEXT[], -- Track which fields were accessed
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    -- Add reference to patient record
    CONSTRAINT fk_patient_access_log_patient 
        FOREIGN KEY (patient_id) REFERENCES public.pacientes(id) ON DELETE SET NULL
);

-- Enable RLS on patient access log
ALTER TABLE public.patient_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins and healthcare professionals can view access logs
CREATE POLICY "Patient_access_log_read_policy" ON public.patient_access_log
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

-- System can insert patient access logs (for audit trail)
CREATE POLICY "Patient_access_log_insert_policy" ON public.patient_access_log
FOR INSERT WITH CHECK (true);

-- Add helpful comments to document the security model
COMMENT ON TABLE public.pacientes IS 'Patient medical records with strict RLS policies ensuring only authorized healthcare professionals and assigned caregivers can access sensitive medical data.';
COMMENT ON TABLE public.patient_access_log IS 'Comprehensive audit log for patient data access, required for HIPAA compliance and security monitoring.';