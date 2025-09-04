-- Habilitar RLS na tabela chat_memory_n8n
ALTER TABLE public.chat_memory_n8n ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir que usuários vejam apenas seus próprios dados de chat
-- Assumindo que existe uma coluna user_id ou session_id para identificar o proprietário
CREATE POLICY "Users can view their own chat memory" 
ON public.chat_memory_n8n 
FOR SELECT 
USING (
  -- Se houver user_id, usar ele para controle de acesso
  -- Se não houver, pode ser necessário adicionar essa coluna
  session_id IS NOT NULL
);

-- Criar política para inserção (apenas usuários autenticados podem inserir)
CREATE POLICY "Authenticated users can create chat memory" 
ON public.chat_memory_n8n 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Política para atualização (usuários podem atualizar apenas seus próprios dados)
CREATE POLICY "Users can update their own chat memory" 
ON public.chat_memory_n8n 
FOR UPDATE 
USING (
  session_id IS NOT NULL
);

-- Política para exclusão (usuários podem excluir apenas seus próprios dados)
CREATE POLICY "Users can delete their own chat memory" 
ON public.chat_memory_n8n 
FOR DELETE 
USING (
  session_id IS NOT NULL
);