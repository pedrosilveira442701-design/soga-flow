-- ============================================================================
-- Triagem v2: campos comerciais estruturados extraídos pela IA da conversa.
-- A função whatsapp-triagem é retrocompatível: se estas colunas ainda não
-- existirem, ela grava apenas os campos da v1.
-- ============================================================================

ALTER TABLE public.contatos
  ADD COLUMN IF NOT EXISTS tipo_servico          TEXT,
  ADD COLUMN IF NOT EXISTS tipo_imovel           TEXT
    CHECK (tipo_imovel IN ('garagem_residencial', 'condominio', 'comercial', 'industrial', 'outro') OR tipo_imovel IS NULL),
  ADD COLUMN IF NOT EXISTS local_obra            TEXT,
  ADD COLUMN IF NOT EXISTS metragem_m2           NUMERIC,
  ADD COLUMN IF NOT EXISTS urgencia              TEXT
    CHECK (urgencia IN ('imediata', 'ate_30_dias', 'sem_prazo') OR urgencia IS NULL),
  ADD COLUMN IF NOT EXISTS etapa_negociacao      TEXT
    CHECK (etapa_negociacao IN ('primeiro_contato', 'coletando_informacoes', 'aguardando_orcamento',
                                'orcamento_enviado', 'negociando', 'visita_agendada', 'esfriou') OR etapa_negociacao IS NULL),
  ADD COLUMN IF NOT EXISTS telefone_alternativo  TEXT;

COMMENT ON COLUMN public.contatos.tipo_servico         IS 'Serviço desejado extraído pela IA (epóxi, PU, concreto polido...)';
COMMENT ON COLUMN public.contatos.tipo_imovel          IS 'Tipo de imóvel da obra (condomínio tem ticket maior)';
COMMENT ON COLUMN public.contatos.local_obra           IS 'Bairro/cidade da obra citados na conversa';
COMMENT ON COLUMN public.contatos.metragem_m2          IS 'Metragem aproximada em m² (12m²/vaga quando só citam vagas)';
COMMENT ON COLUMN public.contatos.urgencia             IS 'Prazo do cliente: imediata | ate_30_dias | sem_prazo';
COMMENT ON COLUMN public.contatos.etapa_negociacao     IS 'Etapa da negociação inferida da conversa inteira';
COMMENT ON COLUMN public.contatos.telefone_alternativo IS 'Outro telefone citado na conversa (só dígitos)';
