-- Criar um usuário admin de teste com tipo_usuario válido
-- Primeiro removemos se já existir
DELETE FROM public.profiles WHERE email = 'admin@teste.com';

-- Inserir um perfil admin de teste com tipo_usuario válido
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
    'fonoaudiologo',
    true,
    true,
    now(),
    now()
);