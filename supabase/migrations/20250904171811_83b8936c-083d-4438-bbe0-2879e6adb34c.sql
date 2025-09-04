-- Corrigir o constraint para incluir 'cuidador'
ALTER TABLE public.team_messages 
DROP CONSTRAINT team_messages_sender_type_check;

ALTER TABLE public.team_messages 
ADD CONSTRAINT team_messages_sender_type_check 
CHECK (sender_type IN ('admin', 'fisioterapeuta', 'fonoaudiologo', 'nutricionista', 'enfermeiro', 'medico', 'cuidador'));