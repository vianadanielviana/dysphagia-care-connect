-- Remover a constraint antiga
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_tipo_usuario_check;

-- Criar nova constraint com todos os tipos válidos
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_tipo_usuario_check 
CHECK (tipo_usuario = ANY (ARRAY['cuidador'::text, 'fonoaudiologo'::text, 'nutricionista'::text, 'outros'::text, 'admin'::text]));