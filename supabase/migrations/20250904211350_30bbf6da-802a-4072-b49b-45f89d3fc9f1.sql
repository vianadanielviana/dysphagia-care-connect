-- Fix Critical Security Issue: Unrestricted Document Access
-- 
-- ISSUE: The 'documents' table currently allows ANY authenticated user to read ALL documents
-- using "true" condition, exposing potentially confidential medical information.
--
-- FIX: Implement role-based and metadata-based access control for documents

-- Remove the overly permissive SELECT policy
DROP POLICY IF EXISTS "Enable read access for authenticated users only" ON public.documents;

-- Create secure role-based SELECT policy for documents
-- Healthcare professionals can read all documents, others can only read documents they own or have access to
CREATE POLICY "Healthcare professionals and authorized users can view documents" ON public.documents
FOR SELECT USING (
    -- Healthcare team members (approved) can read all documents
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR 
    -- Admin override
    (auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com')
    OR
    -- Users can access documents that belong to them (if metadata contains user_id)
    (metadata ->> 'user_id' = auth.uid()::text)
    OR
    -- Users can access documents for patients they are assigned to
    (EXISTS (
        SELECT 1 FROM public.patients pt
        WHERE (pt.caregiver_id = auth.uid() OR pt.professional_id = auth.uid())
        AND metadata ->> 'patient_id' = pt.id::text
    ))
);

-- Update INSERT policy to ensure proper metadata is set
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.documents;

CREATE POLICY "Users can create documents with proper access control" ON public.documents
FOR INSERT WITH CHECK (
    -- Only authenticated users can insert
    auth.uid() IS NOT NULL
    AND (
        -- Healthcare professionals can create any documents
        (EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND p.is_approved = true
            AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
        ))
        OR 
        -- Admin override
        (auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com')
        OR
        -- Regular users can only create documents that reference themselves or their patients
        (
            metadata ->> 'user_id' = auth.uid()::text
            OR 
            (metadata ->> 'patient_id' IS NOT NULL 
             AND EXISTS (
                SELECT 1 FROM public.patients pt
                WHERE pt.caregiver_id = auth.uid() 
                AND pt.id::text = metadata ->> 'patient_id'
            ))
        )
    )
);

-- Add UPDATE and DELETE policies for completeness
CREATE POLICY "Users can update their own documents or authorized documents" ON public.documents
FOR UPDATE USING (
    -- Healthcare professionals can update all documents
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR 
    -- Admin override  
    (auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com')
    OR
    -- Users can update their own documents
    (metadata ->> 'user_id' = auth.uid()::text)
);

CREATE POLICY "Users can delete their own documents or authorized documents" ON public.documents
FOR DELETE USING (
    -- Only admins and healthcare professionals can delete documents
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

-- Create audit log for document access (for healthcare compliance)
CREATE TABLE IF NOT EXISTS public.document_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    document_id BIGINT NOT NULL,
    action TEXT NOT NULL, -- 'VIEW', 'CREATE', 'UPDATE', 'DELETE'
    user_type TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB
);

-- Enable RLS on audit log
ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view document access logs
CREATE POLICY "Admins can view document access logs" ON public.document_access_log
FOR SELECT USING (
    auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com'
);

-- System can insert audit logs
CREATE POLICY "System can insert document access logs" ON public.document_access_log
FOR INSERT WITH CHECK (true);