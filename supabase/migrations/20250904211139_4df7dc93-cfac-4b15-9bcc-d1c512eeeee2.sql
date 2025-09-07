-- Fix Critical Security Issue: Restrict team_messages access to authorized healthcare team members only
-- 
-- ISSUE: The current policy "Authenticated users can view messages" allows ANY authenticated user 
-- to read ALL internal team communications, potentially exposing confidential patient discussions
-- and internal healthcare business matters.
--
-- FIX: Implement role-based access control restricting access to authorized healthcare team members

-- Remove the overly permissive SELECT policy that allows any user to read all messages
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.team_messages;

-- Create secure role-based SELECT policy that only allows:
-- 1. Healthcare professionals (fonoaudiologos) - can read all team messages
-- 2. Approved caregivers (cuidadores) - can participate in team communications 
-- 3. Admins - can read all messages
CREATE POLICY "Healthcare team members can view messages" ON public.team_messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario IN ('fonoaudiologo', 'cuidador', 'admin')
    )
    OR auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com'
);

-- Update INSERT policy to ensure only authorized healthcare team members can send messages
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.team_messages;

CREATE POLICY "Healthcare team members can send messages" ON public.team_messages
FOR INSERT WITH CHECK (
    sender_id = auth.uid() 
    AND (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND p.is_approved = true
            AND p.tipo_usuario IN ('fonoaudiologo', 'cuidador', 'admin')
        )
        OR auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com'
    )
);

-- Update the UPDATE policy to ensure consistency with new security model
DROP POLICY IF EXISTS "Users can update their own messages" ON public.team_messages;

CREATE POLICY "Healthcare team members can update their own messages" ON public.team_messages
FOR UPDATE USING (
    sender_id = auth.uid()
    AND (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND p.is_approved = true
            AND p.tipo_usuario IN ('fonoaudiologo', 'cuidador', 'admin')
        )
        OR auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com'
    )
);

-- Create audit log for security compliance (optional but recommended for healthcare)
CREATE TABLE IF NOT EXISTS public.team_message_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    message_id UUID,
    action TEXT NOT NULL, -- 'VIEW', 'SEND', 'UPDATE'
    user_type TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address INET,
    user_agent TEXT
);

-- Enable RLS on audit log
ALTER TABLE public.team_message_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view access logs" ON public.team_message_access_log
FOR SELECT USING (
    auth.jwt() ->> 'email' = 'viana.vianadaniel@outlook.com'
);

-- System can insert audit logs
CREATE POLICY "System can insert access logs" ON public.team_message_access_log
FOR INSERT WITH CHECK (true);