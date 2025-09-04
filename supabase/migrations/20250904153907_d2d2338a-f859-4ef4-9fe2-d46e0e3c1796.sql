-- Remove a constraint existente
ALTER TABLE public.pacientes DROP CONSTRAINT pacientes_tipo_usuario_check;

-- Adiciona a nova constraint que inclui 'paciente'
ALTER TABLE public.pacientes ADD CONSTRAINT pacientes_tipo_usuario_check 
CHECK (tipo_usuario = ANY (ARRAY['cuidador'::text, 'fonoaudiologo'::text, 'paciente'::text]));