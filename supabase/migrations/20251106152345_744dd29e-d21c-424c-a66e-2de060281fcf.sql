-- Etapa 1: Remover colunas geradas e recriar como colunas normais
ALTER TABLE propostas 
  DROP COLUMN IF EXISTS valor_total,
  DROP COLUMN IF EXISTS liquido,
  DROP COLUMN IF EXISTS margem_pct;

-- Adicionar as colunas como campos normais (não gerados)
ALTER TABLE propostas 
  ADD COLUMN valor_total numeric DEFAULT 0,
  ADD COLUMN liquido numeric DEFAULT 0,
  ADD COLUMN margem_pct numeric DEFAULT 0;

-- Etapa 2: Atualizar todos os valores existentes calculando a partir de servicos
UPDATE propostas
SET 
  valor_total = (
    SELECT COALESCE(
      (
        SELECT SUM((s->>'m2')::numeric * (s->>'valor_m2')::numeric)
        FROM jsonb_array_elements(servicos) s
      ) - COALESCE(desconto, 0),
      0
    )
  ),
  liquido = (
    SELECT COALESCE(
      (
        SELECT SUM((s->>'m2')::numeric * (s->>'valor_m2')::numeric)
        FROM jsonb_array_elements(servicos) s
      ) - COALESCE(desconto, 0) - 
      (
        SELECT SUM((s->>'m2')::numeric * (s->>'custo_m2')::numeric)
        FROM jsonb_array_elements(servicos) s
      ),
      0
    )
  )
WHERE servicos IS NOT NULL 
  AND jsonb_array_length(servicos) > 0;

-- Etapa 3: Calcular margem_pct
UPDATE propostas
SET margem_pct = CASE 
  WHEN valor_total > 0 THEN (liquido / valor_total) * 100
  ELSE 0
END
WHERE servicos IS NOT NULL 
  AND jsonb_array_length(servicos) > 0;