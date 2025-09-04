-- Confirmar email do usuário danielmaken8n@gmail.com manualmente
UPDATE auth.users 
SET 
  confirmed_at = now(),
  email_confirmed_at = now()
WHERE email = 'danielmaken8n@gmail.com';