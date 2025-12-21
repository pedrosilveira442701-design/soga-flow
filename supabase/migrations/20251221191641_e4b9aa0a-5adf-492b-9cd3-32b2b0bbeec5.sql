-- ============================================================================
-- VIEW: vw_insights_pool
-- Pool analítico unificado para consultas consistentes no módulo de Insights
-- Combina todas as entidades: propostas, vendas, financeiro, leads, obras, visitas
-- ============================================================================

CREATE OR REPLACE VIEW public.vw_insights_pool 
WITH (security_invoker = true) AS

-- PROPOSTAS
SELECT 
  user_id,
  'proposta'::text AS tipo,
  id AS id_origem,
  created_at,
  periodo_dia,
  periodo_mes,
  periodo_ano,
  status,
  cliente,
  canal,
  servico,
  bairro,
  cidade,
  COALESCE(m2, 0) AS m2,
  COALESCE(valor_total, 0) AS valor_total,
  COALESCE(valor_liquido, 0) AS valor_liquido,
  NULL::numeric AS valor,
  NULL::integer AS numero_parcela,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  COALESCE(margem_pct, 0) AS margem_pct,
  forma_pagamento,
  dias_aberta,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  NULL::integer AS dias_no_funil,
  NULL::integer AS first_response_minutes,
  NULL::numeric AS progresso_pct,
  NULL::boolean AS realizada,
  NULL::text AS responsavel
FROM vw_propostas

UNION ALL

-- VENDAS/CONTRATOS
SELECT 
  user_id,
  'venda'::text AS tipo,
  id AS id_origem,
  created_at,
  periodo_dia,
  periodo_mes,
  periodo_ano,
  status::text AS status,
  cliente,
  canal,
  servico,
  bairro,
  cidade,
  COALESCE(m2, 0) AS m2,
  COALESCE(valor_total, 0) AS valor_total,
  COALESCE(valor_liquido, 0) AS valor_liquido,
  NULL::numeric AS valor,
  NULL::integer AS numero_parcela,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  COALESCE(margem_pct, 0) AS margem_pct,
  forma_pagamento,
  NULL::integer AS dias_aberta,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  NULL::integer AS dias_no_funil,
  NULL::integer AS first_response_minutes,
  NULL::numeric AS progresso_pct,
  NULL::boolean AS realizada,
  NULL::text AS responsavel
FROM vw_vendas

UNION ALL

-- FINANCEIRO/PARCELAS
SELECT 
  user_id,
  'financeiro'::text AS tipo,
  id AS id_origem,
  created_at,
  periodo_dia,
  periodo_mes,
  periodo_ano,
  status::text AS status,
  cliente,
  NULL::text AS canal,
  NULL::text AS servico,
  bairro,
  cidade,
  0 AS m2,
  0 AS valor_total,
  0 AS valor_liquido,
  COALESCE(valor, 0) AS valor,
  numero_parcela,
  periodo_dia AS vencimento,
  data_pagamento AS pago_em,
  0 AS margem_pct,
  forma AS forma_pagamento,
  dias_atraso AS dias_aberta,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  NULL::integer AS dias_no_funil,
  NULL::integer AS first_response_minutes,
  NULL::numeric AS progresso_pct,
  NULL::boolean AS realizada,
  NULL::text AS responsavel
FROM vw_financeiro

UNION ALL

-- LEADS
SELECT 
  user_id,
  'lead'::text AS tipo,
  id AS id_origem,
  created_at,
  periodo_dia,
  periodo_mes,
  periodo_ano,
  estagio::text AS status,
  cliente,
  canal,
  servico,
  bairro,
  cidade,
  COALESCE(m2, 0) AS m2,
  COALESCE(valor_potencial, 0) AS valor_total,
  0 AS valor_liquido,
  NULL::numeric AS valor,
  NULL::integer AS numero_parcela,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  0 AS margem_pct,
  NULL::text AS forma_pagamento,
  NULL::integer AS dias_aberta,
  estagio::text AS estagio,
  motivo_perda,
  dias_no_funil,
  first_response_minutes,
  NULL::numeric AS progresso_pct,
  NULL::boolean AS realizada,
  responsavel
FROM vw_leads

UNION ALL

-- OBRAS
SELECT 
  user_id,
  'obra'::text AS tipo,
  id AS id_origem,
  created_at,
  periodo_dia,
  periodo_mes,
  periodo_ano,
  status::text AS status,
  cliente,
  NULL::text AS canal,
  servico,
  bairro,
  cidade,
  COALESCE(m2, 0) AS m2,
  COALESCE(valor_total, 0) AS valor_total,
  0 AS valor_liquido,
  NULL::numeric AS valor,
  NULL::integer AS numero_parcela,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  0 AS margem_pct,
  NULL::text AS forma_pagamento,
  NULL::integer AS dias_aberta,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  NULL::integer AS dias_no_funil,
  NULL::integer AS first_response_minutes,
  progresso_pct,
  NULL::boolean AS realizada,
  responsavel_obra AS responsavel
FROM vw_obras

UNION ALL

-- VISITAS
SELECT 
  user_id,
  'visita'::text AS tipo,
  id AS id_origem,
  created_at,
  periodo_dia,
  periodo_mes,
  periodo_ano,
  status::text AS status,
  cliente,
  canal,
  servico,
  bairro,
  cidade,
  COALESCE(m2, 0) AS m2,
  0 AS valor_total,
  0 AS valor_liquido,
  NULL::numeric AS valor,
  NULL::integer AS numero_parcela,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  0 AS margem_pct,
  NULL::text AS forma_pagamento,
  NULL::integer AS dias_aberta,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  NULL::integer AS dias_no_funil,
  NULL::integer AS first_response_minutes,
  NULL::numeric AS progresso_pct,
  realizada,
  responsavel
FROM vw_visitas;

-- Comentário explicativo
COMMENT ON VIEW public.vw_insights_pool IS 'Pool analítico unificado para o módulo de Insights IA. Combina propostas, vendas, financeiro, leads, obras e visitas em estrutura normalizada.';