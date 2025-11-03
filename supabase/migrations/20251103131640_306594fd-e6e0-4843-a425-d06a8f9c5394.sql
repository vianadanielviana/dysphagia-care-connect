-- Remove a constraint que impede múltiplos registros diários por paciente no mesmo dia
DO $$
DECLARE
  v_constraint text;
BEGIN
  -- Busca a constraint de unicidade na tabela daily_records
  SELECT conname
  INTO v_constraint
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE t.relname = 'daily_records'
    AND n.nspname = 'public'
    AND c.contype = 'u'
    AND array_length(c.conkey, 1) = 2; -- constraint com 2 colunas

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.daily_records DROP CONSTRAINT %I', v_constraint);
    RAISE NOTICE 'Constraint % removida com sucesso', v_constraint;
  ELSE
    RAISE NOTICE 'Nenhuma constraint de unicidade encontrada';
  END IF;
END $$;

-- Cria índice não-único para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_daily_records_patient_date 
ON public.daily_records (patient_id, record_date DESC, created_at DESC);