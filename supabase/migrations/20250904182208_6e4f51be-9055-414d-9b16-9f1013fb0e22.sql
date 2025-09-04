-- Desabilitar confirmação de email - permitir login apenas com aprovação manual
-- Atualizar configuração de autenticação para não exigir confirmação de email
UPDATE auth.config 
SET 
  enable_signup = true,
  enable_confirmations = false
WHERE id = 1;