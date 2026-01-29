-- ============================================
-- Versionamento de Propostas - Fase 1 Completa
-- ============================================

-- PARTE 1: Adicionar colunas de versionamento (IF NOT EXISTS para idempotência)
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS proposal_group_id uuid;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS version_number integer DEFAULT 1;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS previous_version_id uuid;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS replaced_by_id uuid;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS replaced_at timestamptz;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS changed_reason text;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS changed_reason_detail text;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT true;

-- PARTE 2: Migrar dados existentes para V1
UPDATE public.propostas SET
  proposal_group_id = id,
  version_number = 1,
  is_current = true
WHERE proposal_group_id IS NULL;

-- PARTE 3: Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_propostas_group_id ON public.propostas(proposal_group_id);
CREATE INDEX IF NOT EXISTS idx_propostas_current ON public.propostas(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_propostas_version ON public.propostas(proposal_group_id, version_number);

-- PARTE 4: Dropar views em cascata e recriar
DROP VIEW IF EXISTS public.vw_insights_pool CASCADE;
DROP VIEW IF EXISTS public.vw_propostas CASCADE;

-- PARTE 5: Recriar vw_propostas
CREATE VIEW public.vw_propostas AS
SELECT 
  p.id,
  p.user_id,
  p.data AS created_at,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  l.origem AS canal,
  p.tipo_piso AS servico,
  p.m2,
  p.valor_total,
  p.liquido AS valor_liquido,
  p.margem_pct,
  p.desconto,
  p.forma_pagamento,
  p.status,
  p.data_fechamento,
  p.data_perda,
  EXTRACT(YEAR FROM p.data)::integer AS periodo_ano,
  TO_CHAR(p.data, 'YYYY-MM') AS periodo_mes,
  TO_CHAR(p.data, 'YYYY-MM-DD') AS periodo_dia,
  CASE 
    WHEN p.status IN ('aberta', 'enviada', 'repouso') THEN 
      (CURRENT_DATE - p.data)::integer
    ELSE NULL
  END AS dias_aberta,
  p.proposal_group_id,
  p.version_number,
  p.is_current,
  p.previous_version_id,
  p.replaced_by_id,
  p.replaced_at,
  p.changed_reason,
  p.changed_reason_detail
FROM public.propostas p
LEFT JOIN public.clientes c ON p.cliente_id = c.id
LEFT JOIN public.leads l ON p.lead_id = l.id;

-- PARTE 6: Recriar vw_insights_pool
CREATE VIEW public.vw_insights_pool AS
SELECT 
  'lead' AS tipo,
  l.id AS id_origem,
  l.user_id,
  l.created_at,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  l.origem AS canal,
  (SELECT string_agg(value ->> 'tipo', ', ') FROM jsonb_array_elements(l.produtos) AS value) AS servico,
  l.medida AS m2,
  l.valor_potencial AS valor,
  NULL::numeric AS valor_total,
  NULL::numeric AS valor_liquido,
  NULL::numeric AS margem_pct,
  l.estagio::text AS status,
  l.estagio::text AS estagio,
  l.motivo_perda,
  l.responsavel,
  NULL::text AS forma_pagamento,
  (CURRENT_DATE - l.created_at::date)::integer AS dias_no_funil,
  NULL::integer AS dias_aberta,
  l.first_response_minutes,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  NULL::integer AS numero_parcela,
  NULL::boolean AS realizada,
  NULL::integer AS progresso_pct,
  TO_CHAR(l.created_at, 'YYYY-MM-DD') AS periodo_dia,
  TO_CHAR(l.created_at, 'YYYY-MM') AS periodo_mes,
  EXTRACT(YEAR FROM l.created_at)::integer AS periodo_ano,
  NULL::integer AS version_number
FROM public.leads l
LEFT JOIN public.clientes c ON l.cliente_id = c.id

UNION ALL

SELECT 
  'proposta' AS tipo,
  p.id AS id_origem,
  p.user_id,
  p.created_at,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  l.origem AS canal,
  (SELECT string_agg(s.value ->> 'tipo', ', ') FROM jsonb_array_elements(p.servicos) AS s) AS servico,
  p.m2,
  p.valor_total AS valor,
  p.valor_total,
  p.liquido AS valor_liquido,
  p.margem_pct,
  p.status,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  NULL::text AS responsavel,
  p.forma_pagamento,
  NULL::integer AS dias_no_funil,
  CASE 
    WHEN p.status IN ('aberta', 'enviada', 'repouso') THEN 
      (CURRENT_DATE - p.data)::integer
    ELSE NULL
  END AS dias_aberta,
  NULL::integer AS first_response_minutes,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  NULL::integer AS numero_parcela,
  NULL::boolean AS realizada,
  NULL::integer AS progresso_pct,
  TO_CHAR(p.data, 'YYYY-MM-DD') AS periodo_dia,
  TO_CHAR(p.data, 'YYYY-MM') AS periodo_mes,
  EXTRACT(YEAR FROM p.data)::integer AS periodo_ano,
  p.version_number
FROM public.propostas p
LEFT JOIN public.clientes c ON p.cliente_id = c.id
LEFT JOIN public.leads l ON p.lead_id = l.id

UNION ALL

SELECT 
  'venda' AS tipo,
  ct.id AS id_origem,
  ct.user_id,
  ct.created_at,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  l.origem AS canal,
  p.tipo_piso AS servico,
  p.m2,
  ct.valor_negociado AS valor,
  ct.valor_negociado AS valor_total,
  (ct.valor_negociado * COALESCE(ct.margem_pct, 0) / 100) AS valor_liquido,
  ct.margem_pct,
  ct.status::text AS status,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  NULL::text AS responsavel,
  ct.forma_pagamento,
  NULL::integer AS dias_no_funil,
  NULL::integer AS dias_aberta,
  NULL::integer AS first_response_minutes,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  NULL::integer AS numero_parcela,
  NULL::boolean AS realizada,
  NULL::integer AS progresso_pct,
  TO_CHAR(ct.data_inicio, 'YYYY-MM-DD') AS periodo_dia,
  TO_CHAR(ct.data_inicio, 'YYYY-MM') AS periodo_mes,
  EXTRACT(YEAR FROM ct.data_inicio)::integer AS periodo_ano,
  NULL::integer AS version_number
FROM public.contratos ct
LEFT JOIN public.clientes c ON ct.cliente_id = c.id
LEFT JOIN public.propostas p ON ct.proposta_id = p.id
LEFT JOIN public.leads l ON p.lead_id = l.id

UNION ALL

SELECT 
  'visita' AS tipo,
  v.id AS id_origem,
  v.user_id,
  v.created_at,
  COALESCE(c.nome, v.cliente_manual_name) AS cliente,
  c.cidade,
  COALESCE(c.bairro, v.bairro) AS bairro,
  l.origem AS canal,
  NULL::text AS servico,
  v.m2_medido AS m2,
  NULL::numeric AS valor,
  NULL::numeric AS valor_total,
  NULL::numeric AS valor_liquido,
  NULL::numeric AS margem_pct,
  v.status::text AS status,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  v.responsavel,
  NULL::text AS forma_pagamento,
  NULL::integer AS dias_no_funil,
  NULL::integer AS dias_aberta,
  NULL::integer AS first_response_minutes,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  NULL::integer AS numero_parcela,
  v.realizada,
  NULL::integer AS progresso_pct,
  TO_CHAR(v.data, 'YYYY-MM-DD') AS periodo_dia,
  TO_CHAR(v.data, 'YYYY-MM') AS periodo_mes,
  EXTRACT(YEAR FROM v.data)::integer AS periodo_ano,
  NULL::integer AS version_number
FROM public.visitas v
LEFT JOIN public.clientes c ON v.cliente_id = c.id
LEFT JOIN public.leads l ON v.lead_id = l.id

UNION ALL

SELECT 
  'obra' AS tipo,
  o.id AS id_origem,
  o.user_id,
  o.created_at,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  l.origem AS canal,
  p.tipo_piso AS servico,
  p.m2,
  ct.valor_negociado AS valor,
  ct.valor_negociado AS valor_total,
  (ct.valor_negociado * COALESCE(ct.margem_pct, 0) / 100) AS valor_liquido,
  ct.margem_pct,
  o.status::text AS status,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  o.responsavel_obra AS responsavel,
  NULL::text AS forma_pagamento,
  NULL::integer AS dias_no_funil,
  NULL::integer AS dias_aberta,
  NULL::integer AS first_response_minutes,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  NULL::integer AS numero_parcela,
  NULL::boolean AS realizada,
  o.progresso_pct::integer AS progresso_pct,
  TO_CHAR(o.started_at, 'YYYY-MM-DD') AS periodo_dia,
  TO_CHAR(o.started_at, 'YYYY-MM') AS periodo_mes,
  EXTRACT(YEAR FROM o.started_at)::integer AS periodo_ano,
  NULL::integer AS version_number
FROM public.obras o
LEFT JOIN public.contratos ct ON o.contrato_id = ct.id
LEFT JOIN public.clientes c ON ct.cliente_id = c.id
LEFT JOIN public.propostas p ON ct.proposta_id = p.id
LEFT JOIN public.leads l ON p.lead_id = l.id

UNION ALL

SELECT 
  'financeiro' AS tipo,
  fp.id AS id_origem,
  fp.user_id,
  fp.created_at,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  l.origem AS canal,
  p.tipo_piso AS servico,
  p.m2,
  fp.valor_liquido_parcela AS valor,
  ct.valor_negociado AS valor_total,
  fp.valor_liquido_parcela AS valor_liquido,
  ct.margem_pct,
  fp.status::text AS status,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  NULL::text AS responsavel,
  fp.forma AS forma_pagamento,
  NULL::integer AS dias_no_funil,
  NULL::integer AS dias_aberta,
  NULL::integer AS first_response_minutes,
  fp.vencimento,
  fp.data_pagamento AS pago_em,
  fp.numero_parcela,
  NULL::boolean AS realizada,
  NULL::integer AS progresso_pct,
  TO_CHAR(fp.vencimento, 'YYYY-MM-DD') AS periodo_dia,
  TO_CHAR(fp.vencimento, 'YYYY-MM') AS periodo_mes,
  EXTRACT(YEAR FROM fp.vencimento)::integer AS periodo_ano,
  NULL::integer AS version_number
FROM public.financeiro_parcelas fp
LEFT JOIN public.contratos ct ON fp.contrato_id = ct.id
LEFT JOIN public.clientes c ON ct.cliente_id = c.id
LEFT JOIN public.propostas p ON ct.proposta_id = p.id
LEFT JOIN public.leads l ON p.lead_id = l.id;