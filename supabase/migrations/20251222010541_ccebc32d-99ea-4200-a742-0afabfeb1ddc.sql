-- Drop views with CASCADE and recreate with 'tipo' instead of 'nome' fix
DROP VIEW IF EXISTS public.vw_insights_pool CASCADE;
DROP VIEW IF EXISTS public.vw_propostas CASCADE;

-- Recreate vw_propostas with 'tipo' fix
CREATE VIEW public.vw_propostas AS
SELECT
  p.id,
  p.user_id,
  p.data AS created_at,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  p.status,
  p.m2,
  p.valor_total,
  p.liquido AS valor_liquido,
  p.margem_pct,
  p.desconto,
  p.forma_pagamento,
  p.data_fechamento,
  p.data_perda,
  l.origem AS canal,
  (SELECT string_agg(s.value ->> 'tipo', ', ') 
   FROM jsonb_array_elements(p.servicos) s(value)) AS servico,
  TO_CHAR(p.data, 'YYYY-MM') AS periodo_mes,
  EXTRACT(YEAR FROM p.data)::integer AS periodo_ano,
  TO_CHAR(p.data, 'YYYY-MM-DD') AS periodo_dia,
  CASE
    WHEN p.status IN ('fechada', 'aceita', 'contrato') THEN
      (SELECT (fp.vencimento - p.data)::integer
       FROM contratos ct
       JOIN financeiro_parcelas fp ON fp.contrato_id = ct.id
       WHERE ct.proposta_id = p.id
       ORDER BY fp.numero_parcela ASC
       LIMIT 1)
    WHEN p.status = 'perdida' THEN
      (COALESCE(p.data_perda::date, p.updated_at::date) - p.data)::integer
    ELSE
      (CURRENT_DATE - p.data)::integer
  END AS dias_aberta
FROM propostas p
LEFT JOIN clientes c ON c.id = p.cliente_id
LEFT JOIN leads l ON l.id = p.lead_id;

-- Recreate vw_insights_pool with 'tipo' fix in all occurrences
CREATE VIEW public.vw_insights_pool AS
SELECT 'lead'::text AS tipo,
    l.id AS id_origem,
    l.user_id,
    l.created_at,
    to_char(l.created_at, 'YYYY-MM'::text) AS periodo_mes,
    EXTRACT(year FROM l.created_at)::integer AS periodo_ano,
    to_char(l.created_at, 'YYYY-MM-DD'::text) AS periodo_dia,
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
 SELECT 'proposta'::text AS tipo,
    p.id AS id_origem,
    p.user_id,
    p.created_at::timestamp with time zone AS created_at,
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
 SELECT 'venda'::text AS tipo,
    ct.id AS id_origem,
    ct.user_id,
    ct.created_at,
    to_char(ct.created_at, 'YYYY-MM'::text) AS periodo_mes,
    EXTRACT(year FROM ct.created_at)::integer AS periodo_ano,
    to_char(ct.created_at, 'YYYY-MM-DD'::text) AS periodo_dia,
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
    (SELECT string_agg(s.value ->> 'tipo', ', ') FROM jsonb_array_elements(p.servicos) s(value)) AS servico,
    ct.status::text AS status
   FROM contratos ct
     JOIN clientes c ON c.id = ct.cliente_id
     LEFT JOIN propostas p ON p.id = ct.proposta_id
     LEFT JOIN leads l ON l.id = p.lead_id
UNION ALL
 SELECT 'visita'::text AS tipo,
    v.id AS id_origem,
    v.user_id,
    v.created_at,
    to_char(v.created_at, 'YYYY-MM'::text) AS periodo_mes,
    EXTRACT(year FROM v.created_at)::integer AS periodo_ano,
    to_char(v.created_at, 'YYYY-MM-DD'::text) AS periodo_dia,
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
 SELECT 'obra'::text AS tipo,
    o.id AS id_origem,
    o.user_id,
    o.created_at,
    to_char(o.created_at, 'YYYY-MM'::text) AS periodo_mes,
    EXTRACT(year FROM o.created_at)::integer AS periodo_ano,
    to_char(o.created_at, 'YYYY-MM-DD'::text) AS periodo_dia,
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
    o.progresso_pct::integer AS progresso_pct,
    NULL::boolean AS realizada,
    NULL::integer AS numero_parcela,
    NULL::date AS pago_em,
    NULL::date AS vencimento,
    (SELECT string_agg(s.value ->> 'tipo', ', ') FROM jsonb_array_elements(p.servicos) s(value)) AS servico,
    o.status::text AS status
   FROM obras o
     JOIN contratos ct ON ct.id = o.contrato_id
     JOIN clientes c ON c.id = ct.cliente_id
     LEFT JOIN propostas p ON p.id = ct.proposta_id
     LEFT JOIN leads l ON l.id = p.lead_id
UNION ALL
 SELECT 'financeiro'::text AS tipo,
    fp.id AS id_origem,
    fp.user_id,
    fp.created_at,
    to_char(fp.vencimento::timestamp with time zone, 'YYYY-MM'::text) AS periodo_mes,
    EXTRACT(year FROM fp.vencimento)::integer AS periodo_ano,
    to_char(fp.vencimento::timestamp with time zone, 'YYYY-MM-DD'::text) AS periodo_dia,
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
    (SELECT string_agg(s.value ->> 'tipo', ', ') FROM jsonb_array_elements(p.servicos) s(value)) AS servico,
    fp.status::text AS status
   FROM financeiro_parcelas fp
     JOIN contratos ct ON ct.id = fp.contrato_id
     JOIN clientes c ON c.id = ct.cliente_id
     LEFT JOIN propostas p ON p.id = ct.proposta_id
     LEFT JOIN leads l ON l.id = p.lead_id;