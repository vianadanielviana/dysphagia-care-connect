-- Fix Critical Security Issue: Exposed AI Training Documents
-- 
-- ISSUE: The 'vector_documents' table currently allows ANY authenticated user to read ALL 
-- AI training documents and embeddings using "true" condition, exposing proprietary medical 
-- knowledge, patient-derived training data, and sensitive business information.
--
-- FIX: Implement strict role-based access control restricting access to only authorized 
-- healthcare professionals and administrators

-- Remove the overly permissive SELECT policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.vector_documents;

-- Create secure role-based SELECT policy for vector documents
-- Only authorized healthcare professionals and admins can access AI training documents
CREATE POLICY "Only healthcare professionals can access AI training documents" ON public.vector_documents
FOR SELECT USING (
    -- Only healthcare team members (approved) can read AI training documents
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR 
    -- Admin override for system administration
    (auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com')
);

-- Update INSERT policy to ensure only authorized users can add training documents
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.vector_documents;

CREATE POLICY "Only healthcare professionals can create AI training documents" ON public.vector_documents
FOR INSERT WITH CHECK (
    -- Only healthcare professionals and admins can insert training documents
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
    -- Allow system/automated inserts for AI training processes
    -- This enables automated document processing and embedding generation
    (auth.uid() IS NULL AND current_setting('role') = 'service_role')
);

-- Add UPDATE policy for document modifications
CREATE POLICY "Only healthcare professionals can update AI training documents" ON public.vector_documents
FOR UPDATE USING (
    -- Only healthcare professionals and admins can update training documents
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

-- Add DELETE policy - very restrictive as training documents are valuable assets
CREATE POLICY "Only admins can delete AI training documents" ON public.vector_documents
FOR DELETE USING (
    -- Only administrators can delete training documents (very valuable data)
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario = 'admin'
    ))
    OR 
    -- Admin override
    (auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com')
);

-- Create audit log for AI training document access (for compliance and security monitoring)
CREATE TABLE IF NOT EXISTS public.vector_document_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    document_id BIGINT,
    action TEXT NOT NULL, -- 'VIEW', 'CREATE', 'UPDATE', 'DELETE', 'SEARCH'
    user_type TEXT,
    search_query TEXT, -- For logging vector similarity searches
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB
);

-- Enable RLS on vector document access log
ALTER TABLE public.vector_document_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view vector document access logs
CREATE POLICY "Admins can view vector document access logs" ON public.vector_document_access_log
FOR SELECT USING (
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario = 'admin'
    ))
    OR 
    (auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com')
);

-- System can insert vector document access logs
CREATE POLICY "System can insert vector document access logs" ON public.vector_document_access_log
FOR INSERT WITH CHECK (true);

-- Create a secure function for AI similarity search that logs access
CREATE OR REPLACE FUNCTION public.secure_match_vector_documents(
    query_embedding vector,
    match_count integer DEFAULT NULL,
    filter jsonb DEFAULT '{}',
    similarity_threshold double precision DEFAULT 0.0
)
RETURNS TABLE(
    id bigint,
    content text,
    metadata jsonb,
    similarity double precision
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_authorized boolean := false;
BEGIN
    -- Check if user is authorized to access AI training documents
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ) OR (auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com')
    INTO user_authorized;

    -- If not authorized, return empty result
    IF NOT user_authorized THEN
        RETURN;
    END IF;

    -- Log the search attempt
    INSERT INTO public.vector_document_access_log (
        user_id,
        action,
        user_type,
        search_query,
        metadata
    ) VALUES (
        auth.uid(),
        'SEARCH',
        COALESCE((SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()), 'unknown'),
        'vector_similarity_search',
        jsonb_build_object(
            'match_count', match_count,
            'filter', filter,
            'similarity_threshold', similarity_threshold
        )
    );

    -- Perform the actual search with similarity threshold
    RETURN QUERY
    SELECT
        v.id,
        v.content,
        v.metadata,
        1 - (v.embedding <=> query_embedding) as similarity
    FROM vector_documents v
    WHERE v.metadata @> filter
    AND (1 - (v.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY v.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Add helpful comments to document the security model
COMMENT ON TABLE public.vector_documents IS 'AI training documents and embeddings with strict RLS policies ensuring only authorized healthcare professionals can access proprietary medical knowledge and training data.';
COMMENT ON POLICY "Only healthcare professionals can access AI training documents" ON public.vector_documents IS 'Restricts access to AI training documents to authorized healthcare staff only to protect proprietary medical knowledge.';
COMMENT ON FUNCTION public.secure_match_vector_documents IS 'Secure vector similarity search function that enforces access controls and logs all search attempts for audit compliance.';