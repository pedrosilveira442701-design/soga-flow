-- Corrigir views sem security_invoker

-- 1. vw_propostas
DROP VIEW IF EXISTS public.vw_propostas;
CREATE VIEW public.vw_propostas WITH (security_invoker = on) AS
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

-- 2. vw_financeiro
DROP VIEW IF EXISTS public.vw_financeiro;
CREATE VIEW public.vw_financeiro WITH (security_invoker = on) AS
SELECT
  fp.id,
  fp.user_id,
  fp.created_at,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  fp.vencimento AS periodo_dia,
  TO_CHAR(fp.vencimento, 'YYYY-MM') AS periodo_mes,
  EXTRACT(YEAR FROM fp.vencimento)::integer AS periodo_ano,
  fp.numero_parcela,
  fp.valor_liquido_parcela AS valor,
  ct.valor_negociado AS valor_bruto,
  ct.margem_pct,
  fp.forma,
  fp.status,
  fp.data_pagamento,
  CASE 
    WHEN fp.status = 'pendente' AND fp.vencimento < CURRENT_DATE THEN
      (CURRENT_DATE - fp.vencimento)::integer
    ELSE NULL
  END AS dias_atraso
FROM public.financeiro_parcelas fp
JOIN public.contratos ct ON fp.contrato_id = ct.id
JOIN public.clientes c ON ct.cliente_id = c.id;