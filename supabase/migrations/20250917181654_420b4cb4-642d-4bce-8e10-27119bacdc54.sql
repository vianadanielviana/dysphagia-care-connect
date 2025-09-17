-- Update RLS policies to include the new admin email
-- First, let's create a helper function to check for admin emails
CREATE OR REPLACE FUNCTION public.is_admin_email()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT (auth.jwt() ->> 'email') IN ('viana.vianadaniel@outlook.com', 'Adrianepaesdagama@gmail.com');
$$;

-- Update policies that currently hardcode the admin email
-- Documents table policies
DROP POLICY IF EXISTS "Users can delete their own documents or authorized documents" ON public.documents;
CREATE POLICY "Users can delete their own documents or authorized documents"
ON public.documents
FOR DELETE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.is_approved = true 
    AND p.tipo_usuario = ANY(ARRAY['fonoaudiologo', 'admin'])
  )) 
  OR public.is_admin_email()
);

DROP POLICY IF EXISTS "Users can update their own documents or authorized documents" ON public.documents;
CREATE POLICY "Users can update their own documents or authorized documents"
ON public.documents
FOR UPDATE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.is_approved = true 
    AND p.tipo_usuario = ANY(ARRAY['fonoaudiologo', 'admin'])
  )) 
  OR public.is_admin_email()
  OR ((metadata ->> 'user_id') = auth.uid()::text)
);

-- N8N chat histories policies
DROP POLICY IF EXISTS "Only healthcare staff can delete chat messages" ON public.n8n_chat_histories;
CREATE POLICY "Only healthcare staff can delete chat messages"
ON public.n8n_chat_histories
FOR DELETE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.is_approved = true 
    AND p.tipo_usuario = ANY(ARRAY['fonoaudiologo', 'admin'])
  )) 
  OR public.is_admin_email()
);

DROP POLICY IF EXISTS "Users can create messages in their own sessions" ON public.n8n_chat_histories;
CREATE POLICY "Users can create messages in their own sessions"
ON public.n8n_chat_histories
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.is_approved = true 
      AND p.tipo_usuario = ANY(ARRAY['fonoaudiologo', 'admin'])
    )) 
    OR public.is_admin_email()
    OR (EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.session_id = n8n_chat_histories.session_id::text 
      AND cs.user_id = auth.uid()
    )) 
    OR (NOT EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.session_id = n8n_chat_histories.session_id::text
    ))
  )
);

DROP POLICY IF EXISTS "Users can update messages in their own sessions" ON public.n8n_chat_histories;
CREATE POLICY "Users can update messages in their own sessions"
ON public.n8n_chat_histories
FOR UPDATE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.is_approved = true 
    AND p.tipo_usuario = ANY(ARRAY['fonoaudiologo', 'admin'])
  )) 
  OR public.is_admin_email()
  OR (EXISTS (
    SELECT 1 FROM chat_sessions cs
    WHERE cs.session_id = n8n_chat_histories.session_id::text 
    AND cs.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can view their own chats and healthcare staff can view al" ON public.n8n_chat_histories;
CREATE POLICY "Users can view their own chats and healthcare staff can view all"
ON public.n8n_chat_histories
FOR SELECT
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.is_approved = true 
    AND p.tipo_usuario = ANY(ARRAY['fonoaudiologo', 'admin'])
  )) 
  OR public.is_admin_email()
  OR (EXISTS (
    SELECT 1 FROM chat_sessions cs
    WHERE cs.session_id = n8n_chat_histories.session_id::text 
    AND cs.user_id = auth.uid()
  ))
);

-- Team messages policies
DROP POLICY IF EXISTS "Healthcare team members can send messages" ON public.team_messages;
CREATE POLICY "Healthcare team members can send messages"
ON public.team_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() 
  AND (
    (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.is_approved = true 
      AND p.tipo_usuario = ANY(ARRAY['fonoaudiologo', 'cuidador', 'admin'])
    )) 
    OR public.is_admin_email()
  )
);

DROP POLICY IF EXISTS "Healthcare team members can update their own messages" ON public.team_messages;
CREATE POLICY "Healthcare team members can update their own messages"
ON public.team_messages
FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid() 
  AND (
    (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.is_approved = true 
      AND p.tipo_usuario = ANY(ARRAY['fonoaudiologo', 'cuidador', 'admin'])
    )) 
    OR public.is_admin_email()
  )
);

DROP POLICY IF EXISTS "Healthcare team members can view messages" ON public.team_messages;
CREATE POLICY "Healthcare team members can view messages"
ON public.team_messages
FOR SELECT
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.is_approved = true 
    AND p.tipo_usuario = ANY(ARRAY['fonoaudiologo', 'cuidador', 'admin'])
  )) 
  OR public.is_admin_email()
);