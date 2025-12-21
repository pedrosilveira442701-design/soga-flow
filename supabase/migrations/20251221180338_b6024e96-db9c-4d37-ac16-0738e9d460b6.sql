-- =============================================
-- VIEWS ANALÍTICAS PARA IA DE INSIGHTS
-- =============================================

-- View de Vendas (Contratos com dados completos)
CREATE OR REPLACE VIEW public.vw_vendas AS
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
CREATE OR REPLACE VIEW public.vw_propostas AS
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
CREATE OR REPLACE VIEW public.vw_leads AS
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
CREATE OR REPLACE VIEW public.vw_visitas AS
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
CREATE OR REPLACE VIEW public.vw_obras AS
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
CREATE OR REPLACE VIEW public.vw_financeiro AS
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
CREATE OR REPLACE VIEW public.vw_clientes AS
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

-- =============================================
-- TABELAS PARA RELATÓRIOS E INSIGHTS
-- =============================================

-- Tabela de relatórios salvos
CREATE TABLE IF NOT EXISTS public.insights_relatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  pergunta TEXT NOT NULL,
  sql_query TEXT NOT NULL,
  filtros JSONB DEFAULT '{}'::jsonb,
  chart_type TEXT DEFAULT 'bar',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de agendamentos de relatórios
CREATE TABLE IF NOT EXISTS public.insights_agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  relatorio_id UUID REFERENCES public.insights_relatorios(id) ON DELETE CASCADE,
  frequencia TEXT NOT NULL CHECK (frequencia IN ('diario', 'semanal', 'mensal')),
  hora TIME NOT NULL DEFAULT '08:00',
  dia_semana INTEGER CHECK (dia_semana BETWEEN 0 AND 6),
  dia_mes INTEGER CHECK (dia_mes BETWEEN 1 AND 31),
  destinatarios TEXT[] NOT NULL DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  ultimo_envio TIMESTAMPTZ,
  proximo_envio TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.insights_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pergunta TEXT NOT NULL,
  sql_executado TEXT NOT NULL,
  filtros JSONB DEFAULT '{}'::jsonb,
  tempo_execucao_ms INTEGER,
  linhas_retornadas INTEGER,
  confianca NUMERIC(3,2),
  sucesso BOOLEAN DEFAULT true,
  erro TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de cache de consultas
CREATE TABLE IF NOT EXISTS public.insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  pergunta TEXT NOT NULL,
  resultado JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE public.insights_relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights_agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights_cache ENABLE ROW LEVEL SECURITY;

-- Policies for insights_relatorios
CREATE POLICY "Users can view their own reports" ON public.insights_relatorios
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own reports" ON public.insights_relatorios
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reports" ON public.insights_relatorios
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reports" ON public.insights_relatorios
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for insights_agendamentos
CREATE POLICY "Users can view their own schedules" ON public.insights_agendamentos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own schedules" ON public.insights_agendamentos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own schedules" ON public.insights_agendamentos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own schedules" ON public.insights_agendamentos
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for insights_audit_logs
CREATE POLICY "Users can view their own logs" ON public.insights_audit_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own logs" ON public.insights_audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for insights_cache
CREATE POLICY "Users can view their own cache" ON public.insights_cache
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own cache" ON public.insights_cache
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cache" ON public.insights_cache
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_insights_cache_hash ON public.insights_cache(hash);
CREATE INDEX IF NOT EXISTS idx_insights_cache_expires ON public.insights_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_insights_audit_created ON public.insights_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_agendamentos_proximo ON public.insights_agendamentos(proximo_envio) WHERE ativo = true;