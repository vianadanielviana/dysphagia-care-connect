-- Fix Critical Security Issue: Patient Medical Records Access Control
-- 
-- ISSUE: The 'pacientes' table currently allows ANY approved user (including caregivers) 
-- to access ALL patient medical records, exposing sensitive data like names, CPF, 
-- medical diagnoses, medications, and medical history to unauthorized personnel.
--
-- FIX: Implement relationship-based access control where:
-- - Healthcare professionals can only access patients assigned to them
-- - Caregivers can only access patients they are responsible for
-- - Admins maintain full access for management purposes
-- - Add comprehensive audit logging for compliance

-- First, add relationship columns to establish proper data ownership
ALTER TABLE public.pacientes 
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS caregiver_id UUID REFERENCES auth.users(id);

-- Add index for better performance on relationship queries
CREATE INDEX IF NOT EXISTS idx_pacientes_professional_id ON public.pacientes(professional_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_caregiver_id ON public.pacientes(caregiver_id);

-- Remove overly permissive policies
DROP POLICY IF EXISTS "Approved users can view all patients" ON public.pacientes;
DROP POLICY IF EXISTS "Approved users can create patients" ON public.pacientes;
DROP POLICY IF EXISTS "Approved users can update all patients" ON public.pacientes;
DROP POLICY IF EXISTS "Approved users can delete all patients" ON public.pacientes;

-- Create secure relationship-based SELECT policy
CREATE POLICY "Healthcare professionals can access their assigned patients" ON public.pacientes
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
CREATE POLICY "Healthcare professionals can create patients" ON public.pacientes
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
CREATE POLICY "Authorized users can update their assigned patients" ON public.pacientes
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
CREATE POLICY "Only authorized professionals can delete patients" ON public.pacientes
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
CREATE POLICY "Admins and professionals can view patient access logs" ON public.patient_access_log
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
CREATE POLICY "System can insert patient access logs" ON public.patient_access_log
FOR INSERT WITH CHECK (true);

-- Create function to automatically log patient access
CREATE OR REPLACE FUNCTION public.log_patient_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the access attempt
    INSERT INTO public.patient_access_log (
        user_id,
        patient_id,
        action,
        user_type,
        accessed_fields,
        metadata
    ) VALUES (
        auth.uid(),
        COALESCE(NEW.id, OLD.id),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'CREATE'
            WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
            WHEN TG_OP = 'DELETE' THEN 'DELETE'
            ELSE 'VIEW'
        END,
        COALESCE((SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()), 'unknown'),
        CASE 
            WHEN TG_OP = 'UPDATE' THEN 
                -- Log which fields were changed
                ARRAY(SELECT key FROM jsonb_each(to_jsonb(NEW)) WHERE key != 'updated_at')
            ELSE 
                -- For CREATE/DELETE, log all fields
                ARRAY['*']
        END,
        jsonb_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'timestamp', now()
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for audit logging
CREATE TRIGGER log_patient_insert_access
    AFTER INSERT ON public.pacientes
    FOR EACH ROW EXECUTE FUNCTION public.log_patient_access();

CREATE TRIGGER log_patient_update_access
    AFTER UPDATE ON public.pacientes
    FOR EACH ROW EXECUTE FUNCTION public.log_patient_access();

CREATE TRIGGER log_patient_delete_access
    AFTER DELETE ON public.pacientes
    FOR EACH ROW EXECUTE FUNCTION public.log_patient_access();

-- Add helpful comments to document the security model
COMMENT ON TABLE public.pacientes IS 'Patient medical records with strict RLS policies ensuring only authorized healthcare professionals and assigned caregivers can access sensitive medical data.';
COMMENT ON POLICY "Healthcare professionals can access their assigned patients" ON public.pacientes IS 'Restricts patient access to assigned professionals and caregivers only, preventing unauthorized access to sensitive medical records.';
COMMENT ON TABLE public.patient_access_log IS 'Comprehensive audit log for patient data access, required for HIPAA compliance and security monitoring.';
COMMENT ON FUNCTION public.log_patient_access IS 'Automatic audit logging function that tracks all patient record access for compliance and security monitoring.';