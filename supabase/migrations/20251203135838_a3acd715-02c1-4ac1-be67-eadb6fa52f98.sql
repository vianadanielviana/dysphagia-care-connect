-- Adicionar novos valores ao enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'nutricionista';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'outros';