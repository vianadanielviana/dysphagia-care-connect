-- Fix RLS for n8n_chat_carol table
ALTER TABLE public.n8n_chat_carol ENABLE ROW LEVEL SECURITY;

-- Create policies for n8n_chat_carol
CREATE POLICY "Enable insert for authenticated users only" 
ON public.n8n_chat_carol 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable read access for all users" 
ON public.n8n_chat_carol 
FOR SELECT 
USING (true);