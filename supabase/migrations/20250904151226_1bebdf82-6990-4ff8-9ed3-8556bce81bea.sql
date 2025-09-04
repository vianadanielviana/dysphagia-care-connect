-- Inserir perfis para usuários que existem no auth.users mas não têm perfil na tabela profiles
-- Baseado nos logs de auth, há usuários que tentaram fazer "repeated signup" mas não têm perfil

-- Primeiro, vamos inserir o perfil para o usuário danielviana83@hotmail.com
INSERT INTO public.profiles (id, email, nome, tipo_usuario, is_approved)
SELECT 
    '24c30510-e944-45af-a084-412b6482aba7'::uuid,
    'danielviana83@hotmail.com',
    'Daniel Vian',
    'fonoaudiologo',
    false
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = '24c30510-e944-45af-a084-412b6482aba7'::uuid
);

-- Inserir perfil para o segundo usuário dos logs
INSERT INTO public.profiles (id, email, nome, tipo_usuario, is_approved)
SELECT 
    '952e15bd-c8b4-4a62-a12f-9ac1b744836c'::uuid,
    'dandan@hotmail.com',
    'Dadada',
    'fonoaudiologo',
    false
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = '952e15bd-c8b4-4a62-a12f-9ac1b744836c'::uuid
);