-- ============================================================================
-- Data de fechamento do contrato (quando a venda foi fechada de fato).
-- Antes o Forecast aproximava pelo created_at (data de DIGITAÇÃO no sistema),
-- o que joga para o mês errado contratos cadastrados com atraso.
-- ============================================================================

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS data_fechamento DATE;

COMMENT ON COLUMN public.contratos.data_fechamento IS
  'Data em que a venda foi fechada (informada pelo usuário). Distinta de data_inicio (início da obra) e de created_at (digitação no sistema).';

-- Backfill dos contratos existentes: usa a data de fechamento da proposta
-- quando houver, senão a data de digitação — e nunca depois do início da
-- obra (um contrato não fecha depois de a obra começar; cadastros atrasados
-- caem no início da obra, que é o melhor palpite disponível).
UPDATE public.contratos c
SET data_fechamento = LEAST(
  COALESCE(p.data_fechamento::date, c.created_at::date),
  c.data_inicio
)
FROM public.propostas p
WHERE p.id = c.proposta_id
  AND c.data_fechamento IS NULL;

-- Contratos sem proposta vinculada
UPDATE public.contratos
SET data_fechamento = LEAST(created_at::date, data_inicio)
WHERE data_fechamento IS NULL;
