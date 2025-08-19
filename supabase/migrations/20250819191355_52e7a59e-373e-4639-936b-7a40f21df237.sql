-- Criar usuário de teste pendente para demonstração
INSERT INTO public.profiles (id, email, nome, tipo_usuario, is_approved, created_at)
VALUES (
  'test-user-123e4567-e89b-12d3-a456-426614174000',
  'usuario.teste@email.com',
  'João da Silva Teste',
  'cuidador',
  false,
  NOW()
);

-- Criar mais um usuário pendente
INSERT INTO public.profiles (id, email, nome, tipo_usuario, is_approved, created_at)
VALUES (
  'test-user-987f6543-e21c-34d5-b678-542367891000',
  'maria.santos@email.com',
  'Maria Santos',
  'fonoaudiologo',
  false,
  NOW() - INTERVAL '1 day'
);