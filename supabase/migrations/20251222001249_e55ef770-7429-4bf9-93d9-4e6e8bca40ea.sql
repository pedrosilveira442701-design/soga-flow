-- Drop dependent view first
DROP VIEW IF EXISTS public.vw_insights_pool;

-- Drop and recreate vw_propostas with conditional dias_aberta logic
DROP VIEW IF EXISTS public.vw_propostas;

CREATE OR REPLACE VIEW public.vw_propostas AS
SELECT
  p.id,
  p.user_id,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  p.m2,
  p.valor_total,
  p.liquido AS valor_liquido,
  p.margem_pct,
  p.desconto,
  p.forma_pagamento,
  p.tipo_piso AS servico,
  p.status,
  l.origem AS canal,
  p.data::date AS created_at,
  to_char(p.data::date, 'YYYY-MM-DD'::text) AS periodo_dia,
  to_char(p.data::date, 'YYYY-MM'::text) AS periodo_mes,
  EXTRACT(year FROM p.data::date)::integer AS periodo_ano,
  CASE 
    WHEN p.status IN ('fechada', 'aceita', 'contrato') 
      THEN EXTRACT(day FROM p.updated_at - p.data::timestamp with time zone)::integer
    ELSE 
      EXTRACT(day FROM now() - p.data::timestamp with time zone)::integer
  END AS dias_aberta
FROM propostas p
JOIN clientes c ON c.id = p.cliente_id
LEFT JOIN leads l ON l.id = p.lead_id;

-- Recreate vw_insights_pool with corrected types
CREATE OR REPLACE VIEW public.vw_insights_pool AS
SELECT
  'lead'::text AS tipo,
  l.id AS id_origem,
  l.user_id,
  l.cliente,
  l.cidade,
  l.bairro,
  l.canal,
  l.servico,
  l.responsavel,
  l.estagio::text AS status,
  l.estagio::text AS estagio,
  l.motivo_perda,
  l.m2,
  l.valor_potencial AS valor,
  NULL::numeric AS valor_total,
  NULL::numeric AS valor_liquido,
  NULL::numeric AS margem_pct,
  NULL::text AS forma_pagamento,
  NULL::integer AS numero_parcela,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  NULL::boolean AS realizada,
  NULL::integer AS progresso_pct,
  l.first_response_minutes,
  l.dias_no_funil,
  NULL::integer AS dias_aberta,
  l.created_at,
  l.periodo_dia::text AS periodo_dia,
  l.periodo_mes,
  l.periodo_ano
FROM vw_leads l

UNION ALL

SELECT
  'proposta'::text AS tipo,
  p.id AS id_origem,
  p.user_id,
  p.cliente,
  p.cidade,
  p.bairro,
  p.canal,
  p.servico,
  NULL::text AS responsavel,
  p.status,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  p.m2,
  p.valor_total AS valor,
  p.valor_total,
  p.valor_liquido,
  p.margem_pct,
  p.forma_pagamento,
  NULL::integer AS numero_parcela,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  NULL::boolean AS realizada,
  NULL::integer AS progresso_pct,
  NULL::integer AS first_response_minutes,
  NULL::integer AS dias_no_funil,
  p.dias_aberta,
  p.created_at::timestamp with time zone,
  p.periodo_dia::text AS periodo_dia,
  p.periodo_mes,
  p.periodo_ano
FROM vw_propostas p

UNION ALL

SELECT
  'venda'::text AS tipo,
  v.id AS id_origem,
  v.user_id,
  v.cliente,
  v.cidade,
  v.bairro,
  v.canal,
  v.servico,
  NULL::text AS responsavel,
  v.status::text AS status,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  v.m2,
  v.valor_total AS valor,
  v.valor_total,
  v.valor_liquido,
  v.margem_pct,
  v.forma_pagamento,
  NULL::integer AS numero_parcela,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  NULL::boolean AS realizada,
  NULL::integer AS progresso_pct,
  NULL::integer AS first_response_minutes,
  NULL::integer AS dias_no_funil,
  NULL::integer AS dias_aberta,
  v.created_at,
  v.periodo_dia::text AS periodo_dia,
  v.periodo_mes,
  v.periodo_ano
FROM vw_vendas v

UNION ALL

SELECT
  'visita'::text AS tipo,
  vs.id AS id_origem,
  vs.user_id,
  vs.cliente,
  vs.cidade,
  vs.bairro,
  vs.canal,
  vs.servico,
  vs.responsavel,
  vs.status::text AS status,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  vs.m2,
  NULL::numeric AS valor,
  NULL::numeric AS valor_total,
  NULL::numeric AS valor_liquido,
  NULL::numeric AS margem_pct,
  NULL::text AS forma_pagamento,
  NULL::integer AS numero_parcela,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  vs.realizada,
  NULL::integer AS progresso_pct,
  NULL::integer AS first_response_minutes,
  NULL::integer AS dias_no_funil,
  NULL::integer AS dias_aberta,
  vs.created_at,
  vs.periodo_dia::text AS periodo_dia,
  vs.periodo_mes,
  vs.periodo_ano
FROM vw_visitas vs

UNION ALL

SELECT
  'obra'::text AS tipo,
  o.id AS id_origem,
  o.user_id,
  o.cliente,
  o.cidade,
  o.bairro,
  NULL::text AS canal,
  o.servico,
  o.responsavel_obra AS responsavel,
  o.status::text AS status,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  o.m2,
  o.valor_total AS valor,
  o.valor_total,
  NULL::numeric AS valor_liquido,
  NULL::numeric AS margem_pct,
  NULL::text AS forma_pagamento,
  NULL::integer AS numero_parcela,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  NULL::boolean AS realizada,
  o.progresso_pct::integer,
  NULL::integer AS first_response_minutes,
  NULL::integer AS dias_no_funil,
  NULL::integer AS dias_aberta,
  o.created_at,
  o.periodo_dia::text AS periodo_dia,
  o.periodo_mes,
  o.periodo_ano
FROM vw_obras o

UNION ALL

SELECT
  'financeiro'::text AS tipo,
  f.id AS id_origem,
  f.user_id,
  f.cliente,
  f.cidade,
  f.bairro,
  NULL::text AS canal,
  NULL::text AS servico,
  NULL::text AS responsavel,
  f.status::text AS status,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  NULL::numeric AS m2,
  f.valor,
  f.valor_bruto AS valor_total,
  f.valor AS valor_liquido,
  f.margem_pct,
  f.forma AS forma_pagamento,
  f.numero_parcela,
  f.periodo_dia AS vencimento,
  f.data_pagamento AS pago_em,
  NULL::boolean AS realizada,
  NULL::integer AS progresso_pct,
  NULL::integer AS first_response_minutes,
  NULL::integer AS dias_no_funil,
  NULL::integer AS dias_aberta,
  f.created_at,
  f.periodo_dia::text AS periodo_dia,
  f.periodo_mes,
  f.periodo_ano
FROM vw_financeiro f;