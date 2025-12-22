-- Add data_perda column to propostas table
ALTER TABLE public.propostas 
ADD COLUMN data_perda timestamp with time zone;

-- Drop dependent view first
DROP VIEW IF EXISTS public.vw_insights_pool;

-- Drop and recreate vw_propostas with correct dias_aberta logic
DROP VIEW IF EXISTS public.vw_propostas;

CREATE VIEW public.vw_propostas AS
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
  p.status,
  p.forma_pagamento,
  p.data::text AS periodo_dia,
  to_char(p.data::timestamp with time zone, 'YYYY-MM'::text) AS periodo_mes,
  EXTRACT(year FROM p.data)::integer AS periodo_ano,
  p.data AS created_at,
  -- Correct dias_aberta calculation by status
  CASE 
    -- Perdida: use data_perda (fallback to updated_at)
    WHEN p.status = 'perdida' THEN
      EXTRACT(day FROM COALESCE(p.data_perda, p.updated_at) - p.data::timestamp with time zone)::integer
    -- Fechada/Aceita/Contrato: use data_fechamento (fallback to updated_at)
    WHEN p.status IN ('fechada', 'aceita', 'contrato') THEN
      EXTRACT(day FROM COALESCE(p.data_fechamento, p.updated_at) - p.data::timestamp with time zone)::integer
    -- Aberta/Repouso/Others: calculate from today
    ELSE 
      EXTRACT(day FROM now() - p.data::timestamp with time zone)::integer
  END AS dias_aberta,
  (SELECT s.value ->> 'tipo'
   FROM jsonb_array_elements(p.servicos) s(value)
   LIMIT 1) AS servico,
  l.origem AS canal
FROM propostas p
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN leads l ON p.lead_id = l.id;

-- Recreate vw_insights_pool
CREATE VIEW public.vw_insights_pool AS
-- Leads
SELECT 
  l.user_id,
  l.id AS id_origem,
  'lead' AS tipo,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  l.created_at,
  to_char(l.created_at, 'YYYY-MM-DD') AS periodo_dia,
  to_char(l.created_at, 'YYYY-MM') AS periodo_mes,
  EXTRACT(year FROM l.created_at)::integer AS periodo_ano,
  l.estagio::text AS estagio,
  l.estagio::text AS status,
  l.responsavel,
  l.origem AS canal,
  l.tipo_piso AS servico,
  l.medida AS m2,
  l.valor_potencial AS valor,
  NULL::numeric AS valor_total,
  NULL::numeric AS valor_liquido,
  NULL::numeric AS margem_pct,
  NULL::text AS forma_pagamento,
  NULL::date AS vencimento,
  NULL::date AS pago_em,
  NULL::integer AS numero_parcela,
  NULL::boolean AS realizada,
  NULL::integer AS progresso_pct,
  l.motivo_perda,
  l.first_response_minutes,
  EXTRACT(day FROM now() - l.status_changed_at)::integer AS dias_no_funil,
  NULL::integer AS dias_aberta
FROM leads l
LEFT JOIN clientes c ON l.cliente_id = c.id

UNION ALL

-- Propostas
SELECT 
  vp.user_id,
  vp.id AS id_origem,
  'proposta' AS tipo,
  vp.cliente,
  vp.cidade,
  vp.bairro,
  vp.created_at::timestamp with time zone AS created_at,
  vp.periodo_dia,
  vp.periodo_mes,
  vp.periodo_ano,
  NULL AS estagio,
  vp.status,
  NULL AS responsavel,
  vp.canal,
  vp.servico,
  vp.m2,
  vp.valor_total AS valor,
  vp.valor_total,
  vp.valor_liquido,
  vp.margem_pct,
  vp.forma_pagamento,
  NULL AS vencimento,
  NULL AS pago_em,
  NULL AS numero_parcela,
  NULL AS realizada,
  NULL AS progresso_pct,
  NULL AS motivo_perda,
  NULL AS first_response_minutes,
  NULL AS dias_no_funil,
  vp.dias_aberta
FROM vw_propostas vp

UNION ALL

-- Visitas
SELECT 
  v.user_id,
  v.id AS id_origem,
  'visita' AS tipo,
  c.nome AS cliente,
  c.cidade,
  c.bairro,
  v.created_at,
  v.data::text AS periodo_dia,
  to_char(v.data::timestamp with time zone, 'YYYY-MM') AS periodo_mes,
  EXTRACT(year FROM v.data)::integer AS periodo_ano,
  NULL AS estagio,
  v.status::text AS status,
  v.responsavel,
  NULL AS canal,
  NULL AS servico,
  v.m2_medido AS m2,
  NULL AS valor,
  NULL AS valor_total,
  NULL AS valor_liquido,
  NULL AS margem_pct,
  NULL AS forma_pagamento,
  NULL AS vencimento,
  NULL AS pago_em,
  NULL AS numero_parcela,
  v.realizada,
  NULL AS progresso_pct,
  NULL AS motivo_perda,
  NULL AS first_response_minutes,
  NULL AS dias_no_funil,
  NULL AS dias_aberta
FROM visitas v
LEFT JOIN clientes c ON v.cliente_id = c.id

UNION ALL

-- Obras
SELECT 
  vo.user_id,
  vo.id AS id_origem,
  'obra' AS tipo,
  vo.cliente,
  vo.cidade,
  vo.bairro,
  vo.created_at,
  vo.periodo_dia::text AS periodo_dia,
  vo.periodo_mes,
  vo.periodo_ano,
  NULL AS estagio,
  vo.status::text AS status,
  vo.responsavel_obra AS responsavel,
  NULL AS canal,
  vo.servico,
  vo.m2,
  vo.valor_total AS valor,
  vo.valor_total,
  NULL AS valor_liquido,
  NULL AS margem_pct,
  NULL AS forma_pagamento,
  NULL AS vencimento,
  NULL AS pago_em,
  NULL AS numero_parcela,
  NULL AS realizada,
  vo.progresso_pct::integer AS progresso_pct,
  NULL AS motivo_perda,
  NULL AS first_response_minutes,
  NULL AS dias_no_funil,
  NULL AS dias_aberta
FROM vw_obras vo

UNION ALL

-- Financeiro
SELECT 
  vf.user_id,
  vf.id AS id_origem,
  'financeiro' AS tipo,
  vf.cliente,
  vf.cidade,
  vf.bairro,
  vf.created_at,
  vf.periodo_dia::text AS periodo_dia,
  vf.periodo_mes,
  vf.periodo_ano,
  NULL AS estagio,
  vf.status::text AS status,
  NULL AS responsavel,
  NULL AS canal,
  NULL AS servico,
  NULL AS m2,
  vf.valor,
  vf.valor_bruto AS valor_total,
  vf.valor AS valor_liquido,
  vf.margem_pct,
  vf.forma,
  vf.periodo_dia AS vencimento,
  vf.data_pagamento AS pago_em,
  vf.numero_parcela,
  NULL AS realizada,
  NULL AS progresso_pct,
  NULL AS motivo_perda,
  NULL AS first_response_minutes,
  NULL AS dias_no_funil,
  NULL AS dias_aberta
FROM vw_financeiro vf;

-- Create trigger to auto-populate data_fechamento and data_perda on status change
CREATE OR REPLACE FUNCTION public.update_proposta_status_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Set data_fechamento when status changes to fechada/aceita/contrato
  IF NEW.status IN ('fechada', 'aceita', 'contrato') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('fechada', 'aceita', 'contrato'))
     AND NEW.data_fechamento IS NULL THEN
    NEW.data_fechamento := NOW();
  END IF;
  
  -- Set data_perda when status changes to perdida
  IF NEW.status = 'perdida' 
     AND (OLD.status IS NULL OR OLD.status != 'perdida')
     AND NEW.data_perda IS NULL THEN
    NEW.data_perda := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_proposta_status_dates ON propostas;
CREATE TRIGGER trigger_proposta_status_dates
  BEFORE UPDATE ON propostas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_proposta_status_dates();