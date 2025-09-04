-- Corrigir as funções criadas para ter search_path seguro
CREATE OR REPLACE FUNCTION public.get_unread_messages_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.team_messages tm
  LEFT JOIN public.message_reads mr ON tm.id = mr.message_id AND mr.user_id = user_uuid
  WHERE tm.sender_id != user_uuid AND mr.id IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.mark_message_as_read(message_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.message_reads (message_id, user_id)
  VALUES (message_uuid, user_uuid)
  ON CONFLICT (message_id, user_id) DO NOTHING;
  
  SELECT TRUE;
$$;