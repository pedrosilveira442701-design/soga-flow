-- Fase 1: Atualizar view vw_propostas para filtrar apenas versões correntes
-- Primeiro, dropar a view existente para permitir alteração na estrutura
DROP VIEW IF EXISTS public.vw_propostas;

CREATE VIEW public.vw_propostas
WITH (security_invoker = on) AS
SELECT 
  p.id,
  p.user_id,
  p.status,
  p.m2,
  p.valor_total,
  p.liquido AS valor_liquido,
  p.margem_pct,
  p.desconto,
  p.data AS created_at,
  p.forma_pagamento,
  p.data_fechamento,
  p.data_perda,
  -- Campos de versionamento
  p.proposal_group_id,
  p.version_number,
  p.is_current,
  p.previous_version_id,
  p.replaced_by_id,
  p.replaced_at,
  p.changed_reason,
  p.changed_reason_detail,
  -- Campos calculados
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  l.origem AS canal,
  s.servico,
  (CURRENT_DATE - p.data)::integer AS dias_aberta,
  to_char(p.data, 'YYYY-MM') AS periodo_mes,
  p.data::text AS periodo_dia,
  EXTRACT(YEAR FROM p.data)::integer AS periodo_ano
FROM propostas p
LEFT JOIN clientes c ON c.id = p.cliente_id
LEFT JOIN leads l ON l.id = p.lead_id
LEFT JOIN LATERAL (
  SELECT string_agg(DISTINCT srv->>'tipo', ', ') AS servico
  FROM jsonb_array_elements(p.servicos) AS srv
) s ON true
WHERE p.is_current = true;