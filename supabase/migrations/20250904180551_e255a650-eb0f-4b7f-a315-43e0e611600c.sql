-- Inserir um usuário de teste pendente de aprovação para demonstrar o funcionamento
INSERT INTO public.profiles (id, email, nome, tipo_usuario, is_approved) 
VALUES (
  gen_random_uuid(),
  'teste@exemplo.com',
  'Usuário Teste',
  'cuidador',
  false
);

-- Inserir outro usuário de teste (fonoaudiólogo)
INSERT INTO public.profiles (id, email, nome, tipo_usuario, is_approved) 
VALUES (
  gen_random_uuid(),
  'fono@teste.com',
  'Dr. Teste Fonoaudiólogo',
  'fonoaudiologo',
  false
);