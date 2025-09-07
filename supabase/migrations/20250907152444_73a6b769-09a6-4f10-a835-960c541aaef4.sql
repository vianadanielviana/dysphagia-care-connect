-- Vamos limpar e recriar um usuário admin de teste
-- Primeiro removemos o perfil existente se houver conflito
DELETE FROM public.profiles WHERE email = 'admin@teste.com';

-- Inserir um perfil admin de teste
INSERT INTO public.profiles (
    id, 
    email, 
    nome, 
    tipo_usuario, 
    is_approved, 
    is_admin,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'admin@teste.com',
    'Administrador Teste',
    'admin',
    true,
    true,
    now(),
    now()
);

-- Garantir que o admin principal continue com privilégios
UPDATE public.profiles 
SET is_admin = true, is_approved = true 
WHERE email = 'viana.vianadaniel@outlook.com';