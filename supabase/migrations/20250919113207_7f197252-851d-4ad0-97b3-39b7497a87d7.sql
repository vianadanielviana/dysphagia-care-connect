-- Adicionar novos valores ao enum food_consistency
ALTER TYPE food_consistency ADD VALUE 'facil_mastigar';
ALTER TYPE food_consistency ADD VALUE 'umidificados';

-- Criar novo enum para consistência de líquidos
CREATE TYPE liquid_consistency AS ENUM ('normal', 'espessado');

-- Adicionar novos campos à tabela daily_records
ALTER TABLE public.daily_records 
ADD COLUMN liquid_consistency liquid_consistency,
ADD COLUMN liquid_consistency_description text;