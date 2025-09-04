-- Fix Critical Security Issue: Unrestricted Chat History Access
-- 
-- ISSUE: The 'n8n_chat_histories' table currently allows ANY authenticated user to read ALL 
-- chat conversations using "true" condition, exposing private patient conversations and 
-- sensitive healthcare discussions to unauthorized users.
--
-- FIX: Implement role-based access control restricting access to conversation participants 
-- and authorized healthcare staff only

-- Remove the overly permissive SELECT policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.n8n_chat_histories;

-- Create secure role-based SELECT policy for chat histories
-- Users can only access their own chat sessions, healthcare professionals can access all for medical oversight
CREATE POLICY "Users can view their own chats and healthcare staff can view all" ON public.n8n_chat_histories
FOR SELECT USING (
    -- Healthcare team members (approved) can read all chat histories for medical oversight
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
    -- Users can only access chat histories from their own sessions
    (EXISTS (
        SELECT 1 FROM public.chat_sessions cs
        WHERE cs.session_id = n8n_chat_histories.session_id 
        AND cs.user_id = auth.uid()
    ))
);

-- Update INSERT policy to ensure proper session ownership
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.n8n_chat_histories;

CREATE POLICY "Users can create messages in their own sessions" ON public.n8n_chat_histories
FOR INSERT WITH CHECK (
    -- Only authenticated users can insert
    auth.uid() IS NOT NULL
    AND (
        -- Healthcare professionals can insert into any session (for system messages, etc.)
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
        -- Users can only create messages in their own chat sessions
        (EXISTS (
            SELECT 1 FROM public.chat_sessions cs
            WHERE cs.session_id = n8n_chat_histories.session_id 
            AND cs.user_id = auth.uid()
        ))
        OR
        -- Allow system/automated inserts (when no specific user context exists)
        -- This is needed for chatbot responses and system-generated messages
        (NOT EXISTS (
            SELECT 1 FROM public.chat_sessions cs
            WHERE cs.session_id = n8n_chat_histories.session_id
        ))
    )
);

-- Add UPDATE policy for message modifications (rare but may be needed for corrections)
CREATE POLICY "Users can update messages in their own sessions" ON public.n8n_chat_histories
FOR UPDATE USING (
    -- Healthcare professionals can update any message (for corrections, annotations)
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
    -- Users can update messages in their own sessions
    (EXISTS (
        SELECT 1 FROM public.chat_sessions cs
        WHERE cs.session_id = n8n_chat_histories.session_id 
        AND cs.user_id = auth.uid()
    ))
);

-- Add DELETE policy - very restrictive as chat history should generally be preserved
CREATE POLICY "Only healthcare staff can delete chat messages" ON public.n8n_chat_histories
FOR DELETE USING (
    -- Only healthcare professionals and admins can delete chat messages
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

-- Create audit log for chat access (healthcare compliance)
CREATE TABLE IF NOT EXISTS public.chat_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id TEXT NOT NULL,
    message_id INTEGER,
    action TEXT NOT NULL, -- 'VIEW', 'CREATE', 'UPDATE', 'DELETE'
    user_type TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB
);

-- Enable RLS on chat access log
ALTER TABLE public.chat_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view chat access logs
CREATE POLICY "Admins can view chat access logs" ON public.chat_access_log
FOR SELECT USING (
    auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com'
);

-- System can insert chat access logs
CREATE POLICY "System can insert chat access logs" ON public.chat_access_log
FOR INSERT WITH CHECK (true);

-- Add helpful comment to document the security model
COMMENT ON TABLE public.n8n_chat_histories IS 'Chat conversation histories with RLS policies ensuring users can only access their own conversations and healthcare staff can access all for medical oversight and compliance.';
COMMENT ON POLICY "Users can view their own chats and healthcare staff can view all" ON public.n8n_chat_histories IS 'Restricts chat history access to conversation participants and authorized healthcare staff only.';