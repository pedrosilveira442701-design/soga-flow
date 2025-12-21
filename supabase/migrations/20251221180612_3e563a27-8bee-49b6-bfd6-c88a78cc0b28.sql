-- Recriar views com SECURITY INVOKER para respeitar RLS do usuário que consulta

-- View de Vendas
DROP VIEW IF EXISTS public.vw_vendas;
CREATE VIEW public.vw_vendas WITH (security_invoker = true) AS
SELECT 
  c.id,
  c.user_id,
  c.created_at,
  DATE(c.data_inicio) AS periodo_dia,
  TO_CHAR(c.data_inicio, 'YYYY-MM') AS periodo_mes,
  EXTRACT(YEAR FROM c.data_inicio)::INTEGER AS periodo_ano,
  cl.nome AS cliente,
  cl.cidade,
  cl.bairro,
  l.origem AS canal,
  p.tipo_piso AS servico,
  COALESCE(p.m2, 0) AS m2,
  c.valor_negociado AS valor_total,
  COALESCE(c.valor_negociado * (c.margem_pct / 100), 0) AS valor_liquido,
  COALESCE(c.margem_pct, 0) AS margem_pct,
  c.status,
  c.forma_pagamento
FROM contratos c
JOIN clientes cl ON cl.id = c.cliente_id
LEFT JOIN propostas p ON p.id = c.proposta_id
LEFT JOIN leads l ON l.id = p.lead_id;

-- View de Propostas
DROP VIEW IF EXISTS public.vw_propostas;
CREATE VIEW public.vw_propostas WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.user_id,
  p.created_at,
  DATE(p.data) AS periodo_dia,
  TO_CHAR(p.data, 'YYYY-MM') AS periodo_mes,
  EXTRACT(YEAR FROM p.data)::INTEGER AS periodo_ano,
  cl.nome AS cliente,
  cl.cidade,
  cl.bairro,
  l.origem AS canal,
  p.tipo_piso AS servico,
  p.m2,
  COALESCE(p.valor_total, 0) AS valor_total,
  COALESCE(p.liquido, 0) AS valor_liquido,
  CASE WHEN COALESCE(p.valor_total, 0) > 0 
    THEN COALESCE(p.liquido, 0) / p.valor_total * 100 
    ELSE 0 
  END AS margem_pct,
  p.status,
  p.forma_pagamento,
  p.desconto,
  EXTRACT(DAY FROM NOW() - p.created_at)::INTEGER AS dias_aberta
FROM propostas p
JOIN clientes cl ON cl.id = p.cliente_id
LEFT JOIN leads l ON l.id = p.lead_id;

-- View de Leads
DROP VIEW IF EXISTS public.vw_leads;
CREATE VIEW public.vw_leads WITH (security_invoker = true) AS
SELECT 
  l.id,
  l.user_id,
  l.created_at,
  DATE(l.created_at) AS periodo_dia,
  TO_CHAR(l.created_at, 'YYYY-MM') AS periodo_mes,
  EXTRACT(YEAR FROM l.created_at)::INTEGER AS periodo_ano,
  cl.nome AS cliente,
  cl.cidade,
  cl.bairro,
  l.origem AS canal,
  l.tipo_piso AS servico,
  COALESCE(l.medida, 0) AS m2,
  COALESCE(l.valor_potencial, 0) AS valor_potencial,
  l.estagio,
  l.motivo_perda,
  l.responsavel,
  EXTRACT(DAY FROM NOW() - l.created_at)::INTEGER AS dias_no_funil,
  l.first_response_minutes
FROM leads l
LEFT JOIN clientes cl ON cl.id = l.cliente_id;

-- View de Visitas
DROP VIEW IF EXISTS public.vw_visitas;
CREATE VIEW public.vw_visitas WITH (security_invoker = true) AS
SELECT 
  v.id,
  v.user_id,
  v.created_at,
  DATE(v.data) AS periodo_dia,
  TO_CHAR(v.data, 'YYYY-MM') AS periodo_mes,
  EXTRACT(YEAR FROM v.data)::INTEGER AS periodo_ano,
  COALESCE(cl.nome, v.cliente_manual_name) AS cliente,
  cl.cidade,
  cl.bairro,
  l.origem AS canal,
  v.assunto AS servico,
  COALESCE(v.m2_medido, 0) AS m2,
  v.status,
  v.realizada,
  v.responsavel
FROM visitas v
LEFT JOIN clientes cl ON cl.id = v.cliente_id
LEFT JOIN leads l ON l.id = v.lead_id;

-- View de Obras
DROP VIEW IF EXISTS public.vw_obras;
CREATE VIEW public.vw_obras WITH (security_invoker = true) AS
SELECT 
  o.id,
  o.user_id,
  o.created_at,
  DATE(o.started_at) AS periodo_dia,
  TO_CHAR(o.started_at, 'YYYY-MM') AS periodo_mes,
  EXTRACT(YEAR FROM o.started_at)::INTEGER AS periodo_ano,
  cl.nome AS cliente,
  cl.cidade,
  cl.bairro,
  p.tipo_piso AS servico,
  COALESCE(p.m2, 0) AS m2,
  c.valor_negociado AS valor_total,
  o.status,
  o.progresso_pct,
  o.responsavel_obra
FROM obras o
JOIN contratos c ON c.id = o.contrato_id
JOIN clientes cl ON cl.id = c.cliente_id
LEFT JOIN propostas p ON p.id = c.proposta_id;

-- View Financeiro
DROP VIEW IF EXISTS public.vw_financeiro;
CREATE VIEW public.vw_financeiro WITH (security_invoker = true) AS
SELECT 
  fp.id,
  fp.user_id,
  fp.created_at,
  DATE(fp.vencimento) AS periodo_dia,
  TO_CHAR(fp.vencimento, 'YYYY-MM') AS periodo_mes,
  EXTRACT(YEAR FROM fp.vencimento)::INTEGER AS periodo_ano,
  cl.nome AS cliente,
  cl.cidade,
  cl.bairro,
  fp.valor_liquido_parcela AS valor,
  fp.status,
  fp.numero_parcela,
  fp.forma,
  fp.data_pagamento,
  CASE 
    WHEN fp.status = 'pago' THEN 0
    WHEN fp.vencimento < CURRENT_DATE THEN EXTRACT(DAY FROM NOW() - fp.vencimento)::INTEGER
    ELSE 0
  END AS dias_atraso
FROM financeiro_parcelas fp
JOIN contratos c ON c.id = fp.contrato_id
JOIN clientes cl ON cl.id = c.cliente_id;

-- View de Clientes
DROP VIEW IF EXISTS public.vw_clientes;
CREATE VIEW public.vw_clientes WITH (security_invoker = true) AS
SELECT 
  cl.id,
  cl.user_id,
  cl.created_at,
  cl.nome AS cliente,
  cl.cidade,
  cl.bairro,
  cl.status,
  (SELECT COUNT(*) FROM contratos c WHERE c.cliente_id = cl.id) AS total_contratos,
  (SELECT COALESCE(SUM(valor_negociado), 0) FROM contratos c WHERE c.cliente_id = cl.id) AS valor_total_contratos,
  (SELECT COUNT(*) FROM propostas p WHERE p.cliente_id = cl.id) AS total_propostas
FROM clientes cl;