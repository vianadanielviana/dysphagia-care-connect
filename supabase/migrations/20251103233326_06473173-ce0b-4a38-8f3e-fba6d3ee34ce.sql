-- Primeiro, converter a coluna para text
ALTER TABLE daily_records 
ALTER COLUMN liquid_consistency TYPE text;

-- Atualizar os dados existentes para os novos valores
UPDATE daily_records 
SET liquid_consistency = 'extremamente_espessado'
WHERE liquid_consistency = 'espessado';

UPDATE daily_records 
SET liquid_consistency = 'liquido_fino'
WHERE liquid_consistency = 'normal' OR liquid_consistency IS NULL;

-- Dropar o enum antigo
DROP TYPE IF EXISTS liquid_consistency CASCADE;

-- Criar o novo enum
CREATE TYPE liquid_consistency AS ENUM (
  'extremamente_espessado',
  'moderadamente_espessado',
  'levemente_espessado',
  'muito_levemente_espessado',
  'liquido_fino'
);

-- Converter a coluna para o novo enum
ALTER TABLE daily_records 
ALTER COLUMN liquid_consistency TYPE liquid_consistency 
USING liquid_consistency::liquid_consistency;