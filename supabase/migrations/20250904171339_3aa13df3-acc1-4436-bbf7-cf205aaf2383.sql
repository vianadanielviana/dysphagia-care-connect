-- Criar tabela para mensagens do chat da equipe
CREATE TABLE public.team_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'fisioterapeuta', 'fonoaudiologo', 'nutricionista', 'enfermeiro', 'medico')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image')),
  reply_to_id UUID REFERENCES public.team_messages(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para mensagens
CREATE POLICY "Authenticated users can view messages" 
ON public.team_messages 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can send messages" 
ON public.team_messages 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" 
ON public.team_messages 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = sender_id);

-- Criar função para atualizar updated_at
CREATE TRIGGER update_team_messages_updated_at
BEFORE UPDATE ON public.team_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;

-- Configurar replica identity para realtime
ALTER TABLE public.team_messages REPLICA IDENTITY FULL;

-- Criar tabela para leituras das mensagens (para marcar como lida)
CREATE TABLE public.message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.team_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Habilitar RLS para leituras
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para leituras
CREATE POLICY "Users can view their own reads" 
ON public.message_reads 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark messages as read" 
ON public.message_reads 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Criar função para obter mensagens não lidas
CREATE OR REPLACE FUNCTION public.get_unread_messages_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.team_messages tm
  LEFT JOIN public.message_reads mr ON tm.id = mr.message_id AND mr.user_id = user_uuid
  WHERE tm.sender_id != user_uuid AND mr.id IS NULL;
$$;

-- Criar função para marcar mensagem como lida
CREATE OR REPLACE FUNCTION public.mark_message_as_read(message_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  INSERT INTO public.message_reads (message_id, user_id)
  VALUES (message_uuid, user_uuid)
  ON CONFLICT (message_id, user_id) DO NOTHING;
  
  SELECT TRUE;
$$;