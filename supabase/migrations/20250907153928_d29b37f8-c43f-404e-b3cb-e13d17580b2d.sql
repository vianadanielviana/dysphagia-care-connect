-- Inserir usuário administrador diretamente no auth.users (simulando signup)
-- Este é o email que tem privilégios especiais no sistema

-- Primeiro, vamos tentar inserir na tabela profiles se o usuário não existir
-- O trigger handle_new_user() deveria criar o profile automaticamente, mas vamos garantir

-- Como não podemos inserir diretamente em auth.users, vamos garantir que o profile existe
-- para quando o usuário fizer signup

-- Verificar se já existe um profile para este admin
INSERT INTO public.profiles (id, email, nome, tipo_usuario, is_approved)
SELECT 
  '89ebbfba-85aa-47fb-9b6b-e83b63663545'::uuid as id,
  'viana.vianadaniel@outlook.com' as email,
  'Daniel Viana' as nome,
  'fonoaudiologo' as tipo_usuario,
  true as is_approved
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE email = 'viana.vianadaniel@outlook.com'
);

-- Garantir que o admin pode fazer login
-- O usuário precisará fazer signup com estas credenciais:
-- Email: viana.vianadaniel@outlook.com
-- Senha: Dviana77