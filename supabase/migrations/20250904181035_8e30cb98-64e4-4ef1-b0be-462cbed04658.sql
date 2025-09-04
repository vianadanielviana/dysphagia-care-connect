-- Inserir usuários que existem em auth.users mas não na profiles
INSERT INTO public.profiles (id, email, nome, tipo_usuario, is_approved)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'nome', 'Usuário'),
  COALESCE(au.raw_user_meta_data ->> 'tipo_usuario', 'cuidador'),
  CASE 
    WHEN au.email = 'viana.vianadaniel@outlook.com' THEN true
    ELSE false
  END
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;