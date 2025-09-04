-- Remover RLS da view chat_memory_n8n (isso pode quebrar funcionalidade do N8N)
-- A tabela base chat_memory já tem RLS adequada

-- Remover políticas da view
DROP POLICY IF EXISTS "Users can view their own chat memory" ON public.chat_memory_n8n;
DROP POLICY IF EXISTS "Authenticated users can create chat memory" ON public.chat_memory_n8n;
DROP POLICY IF EXISTS "Users can update their own chat memory" ON public.chat_memory_n8n;
DROP POLICY IF EXISTS "Users can delete their own chat memory" ON public.chat_memory_n8n;

-- Desabilitar RLS na view
ALTER TABLE public.chat_memory_n8n DISABLE ROW LEVEL SECURITY;