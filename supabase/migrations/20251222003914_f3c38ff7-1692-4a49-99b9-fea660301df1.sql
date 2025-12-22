-- Recriar vw_propostas com lógica correta de dias_aberta
DROP VIEW IF EXISTS public.vw_propostas CASCADE;

CREATE VIEW public.vw_propostas AS
SELECT
  p.id,
  p.user_id,
  p.data AS created_at,
  to_char(p.data::timestamp with time zone, 'YYYY-MM'::text) AS periodo_mes,
  EXTRACT(year FROM p.data)::integer AS periodo_ano,
  p.data::text AS periodo_dia,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  p.m2,
  p.valor_total,
  p.liquido AS valor_liquido,
  p.margem_pct,
  p.desconto,
  p.status,
  p.forma_pagamento,
  p.data_fechamento,
  p.data_perda,
  CASE 
    WHEN p.status IN ('fechada', 'aceita', 'contrato') THEN
      EXTRACT(day FROM (
        SELECT MIN(fp.vencimento)::timestamp with time zone
        FROM contratos ct
        JOIN financeiro_parcelas fp ON fp.contrato_id = ct.id
        WHERE ct.proposta_id = p.id
      ) - p.data::timestamp with time zone)::integer
    WHEN p.status = 'perdida' THEN
      EXTRACT(day FROM COALESCE(p.data_perda, p.updated_at) - p.data::timestamp with time zone)::integer
    ELSE
      EXTRACT(day FROM now() - p.data::timestamp with time zone)::integer
  END AS dias_aberta,
  l.origem AS canal,
  (SELECT string_agg(s->>'nome', ', ') FROM jsonb_array_elements(p.servicos) AS s) AS servico
FROM propostas p
JOIN clientes c ON c.id = p.cliente_id
LEFT JOIN leads l ON l.id = p.lead_id;

-- Recriar vw_insights_pool que depende de vw_propostas
DROP VIEW IF EXISTS public.vw_insights_pool;

CREATE VIEW public.vw_insights_pool AS
-- Leads
SELECT
  'lead'::text AS tipo,
  l.id AS id_origem,
  l.user_id,
  l.created_at,
  to_char(l.created_at, 'YYYY-MM') AS periodo_mes,
  EXTRACT(year FROM l.created_at)::integer AS periodo_ano,
  to_char(l.created_at, 'YYYY-MM-DD') AS periodo_dia,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  l.origem AS canal,
  l.responsavel,
  l.estagio::text AS estagio,
  l.motivo_perda,
  l.valor_potencial AS valor,
  l.medida AS m2,
  NULL::numeric AS valor_total,
  NULL::numeric AS valor_liquido,
  NULL::numeric AS margem_pct,
  NULL::text AS forma_pagamento,
  EXTRACT(day FROM now() - l.created_at)::integer AS dias_no_funil,
  NULL::integer AS dias_aberta,
  l.first_response_minutes,
  NULL::integer AS progresso_pct,
  NULL::boolean AS realizada,
  NULL::integer AS numero_parcela,
  NULL::date AS pago_em,
  NULL::date AS vencimento,
  NULL::text AS servico,
  NULL::text AS status
FROM leads l
JOIN clientes c ON c.id = l.cliente_id

UNION ALL

-- Propostas
SELECT
  'proposta'::text AS tipo,
  p.id AS id_origem,
  p.user_id,
  p.created_at::timestamp with time zone,
  p.periodo_mes,
  p.periodo_ano,
  p.periodo_dia,
  p.cliente,
  p.cidade,
  p.bairro,
  p.canal,
  NULL::text AS responsavel,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  p.valor_total AS valor,
  p.m2,
  p.valor_total,
  p.valor_liquido,
  p.margem_pct,
  p.forma_pagamento,
  NULL::integer AS dias_no_funil,
  p.dias_aberta,
  NULL::integer AS first_response_minutes,
  NULL::integer AS progresso_pct,
  NULL::boolean AS realizada,
  NULL::integer AS numero_parcela,
  NULL::date AS pago_em,
  NULL::date AS vencimento,
  p.servico,
  p.status
FROM vw_propostas p

UNION ALL

-- Vendas (contratos)
SELECT
  'venda'::text AS tipo,
  ct.id AS id_origem,
  ct.user_id,
  ct.created_at,
  to_char(ct.created_at, 'YYYY-MM') AS periodo_mes,
  EXTRACT(year FROM ct.created_at)::integer AS periodo_ano,
  to_char(ct.created_at, 'YYYY-MM-DD') AS periodo_dia,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  l.origem AS canal,
  NULL::text AS responsavel,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  ct.valor_negociado AS valor,
  p.m2,
  ct.valor_negociado AS valor_total,
  p.liquido AS valor_liquido,
  ct.margem_pct,
  ct.forma_pagamento,
  NULL::integer AS dias_no_funil,
  NULL::integer AS dias_aberta,
  NULL::integer AS first_response_minutes,
  NULL::integer AS progresso_pct,
  NULL::boolean AS realizada,
  NULL::integer AS numero_parcela,
  NULL::date AS pago_em,
  NULL::date AS vencimento,
  (SELECT string_agg(s->>'nome', ', ') FROM jsonb_array_elements(p.servicos) AS s) AS servico,
  ct.status::text AS status
FROM contratos ct
JOIN clientes c ON c.id = ct.cliente_id
LEFT JOIN propostas p ON p.id = ct.proposta_id
LEFT JOIN leads l ON l.id = p.lead_id

UNION ALL

-- Visitas
SELECT
  'visita'::text AS tipo,
  v.id AS id_origem,
  v.user_id,
  v.created_at,
  to_char(v.created_at, 'YYYY-MM') AS periodo_mes,
  EXTRACT(year FROM v.created_at)::integer AS periodo_ano,
  to_char(v.created_at, 'YYYY-MM-DD') AS periodo_dia,
  COALESCE(c.nome, v.cliente_manual_name) AS cliente,
  c.cidade,
  c.bairro,
  l.origem AS canal,
  v.responsavel,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  NULL::numeric AS valor,
  v.m2_medido AS m2,
  NULL::numeric AS valor_total,
  NULL::numeric AS valor_liquido,
  NULL::numeric AS margem_pct,
  NULL::text AS forma_pagamento,
  NULL::integer AS dias_no_funil,
  NULL::integer AS dias_aberta,
  NULL::integer AS first_response_minutes,
  NULL::integer AS progresso_pct,
  v.realizada,
  NULL::integer AS numero_parcela,
  NULL::date AS pago_em,
  NULL::date AS vencimento,
  NULL::text AS servico,
  v.status::text AS status
FROM visitas v
LEFT JOIN clientes c ON c.id = v.cliente_id
LEFT JOIN leads l ON l.id = v.lead_id

UNION ALL

-- Obras
SELECT
  'obra'::text AS tipo,
  o.id AS id_origem,
  o.user_id,
  o.created_at,
  to_char(o.created_at, 'YYYY-MM') AS periodo_mes,
  EXTRACT(year FROM o.created_at)::integer AS periodo_ano,
  to_char(o.created_at, 'YYYY-MM-DD') AS periodo_dia,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  l.origem AS canal,
  o.responsavel_obra AS responsavel,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  ct.valor_negociado AS valor,
  p.m2,
  ct.valor_negociado AS valor_total,
  p.liquido AS valor_liquido,
  ct.margem_pct,
  NULL::text AS forma_pagamento,
  NULL::integer AS dias_no_funil,
  NULL::integer AS dias_aberta,
  NULL::integer AS first_response_minutes,
  o.progresso_pct::integer,
  NULL::boolean AS realizada,
  NULL::integer AS numero_parcela,
  NULL::date AS pago_em,
  NULL::date AS vencimento,
  (SELECT string_agg(s->>'nome', ', ') FROM jsonb_array_elements(p.servicos) AS s) AS servico,
  o.status::text AS status
FROM obras o
JOIN contratos ct ON ct.id = o.contrato_id
JOIN clientes c ON c.id = ct.cliente_id
LEFT JOIN propostas p ON p.id = ct.proposta_id
LEFT JOIN leads l ON l.id = p.lead_id

UNION ALL

-- Financeiro (parcelas)
SELECT
  'financeiro'::text AS tipo,
  fp.id AS id_origem,
  fp.user_id,
  fp.created_at,
  to_char(fp.vencimento, 'YYYY-MM') AS periodo_mes,
  EXTRACT(year FROM fp.vencimento)::integer AS periodo_ano,
  to_char(fp.vencimento, 'YYYY-MM-DD') AS periodo_dia,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  l.origem AS canal,
  NULL::text AS responsavel,
  NULL::text AS estagio,
  NULL::text AS motivo_perda,
  fp.valor_liquido_parcela AS valor,
  p.m2,
  ct.valor_negociado AS valor_total,
  p.liquido AS valor_liquido,
  ct.margem_pct,
  fp.forma AS forma_pagamento,
  NULL::integer AS dias_no_funil,
  NULL::integer AS dias_aberta,
  NULL::integer AS first_response_minutes,
  NULL::integer AS progresso_pct,
  NULL::boolean AS realizada,
  fp.numero_parcela,
  fp.data_pagamento AS pago_em,
  fp.vencimento,
  (SELECT string_agg(s->>'nome', ', ') FROM jsonb_array_elements(p.servicos) AS s) AS servico,
  fp.status::text AS status
FROM financeiro_parcelas fp
JOIN contratos ct ON ct.id = fp.contrato_id
JOIN clientes c ON c.id = ct.cliente_id
LEFT JOIN propostas p ON p.id = ct.proposta_id
LEFT JOIN leads l ON l.id = p.lead_id;

-- Backfill: preencher data_perda para propostas perdidas que não têm
UPDATE propostas
SET data_perda = updated_at
WHERE status = 'perdida' AND data_perda IS NULL;