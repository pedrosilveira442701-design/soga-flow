-- ============================================
-- FASE 1: Reestruturação do Banco de Dados
-- Funil Comercial + Operacional (6 etapas)
-- ============================================

-- 1.1 Atualizar enum lead_stage
-- Criar novo enum com as 6 etapas do funil
CREATE TYPE lead_stage_new AS ENUM (
  'contato',           -- Entrou em contato
  'visita_agendada',   -- Gerou visita (agendada)
  'visita_realizada',  -- Visita concluída
  'proposta',          -- Gerou proposta
  'contrato',          -- Fechou contrato
  'execucao',          -- Em execução
  'finalizado',        -- Finalizado
  'perdido'            -- Perdido
);

-- Remover default temporariamente
ALTER TABLE leads ALTER COLUMN estagio DROP DEFAULT;

-- Migrar dados existentes com mapeamento
ALTER TABLE leads 
  ALTER COLUMN estagio TYPE lead_stage_new 
  USING (
    CASE estagio::text
      WHEN 'novo' THEN 'contato'::lead_stage_new
      WHEN 'contato' THEN 'contato'::lead_stage_new
      WHEN 'negociacao' THEN 'visita_agendada'::lead_stage_new
      WHEN 'proposta_enviada' THEN 'proposta'::lead_stage_new
      WHEN 'fechado_ganho' THEN 'contrato'::lead_stage_new
      ELSE 'contato'::lead_stage_new
    END
  );

-- Definir novo default
ALTER TABLE leads ALTER COLUMN estagio SET DEFAULT 'contato'::lead_stage_new;

-- Remover enum antigo e renomear novo
DROP TYPE lead_stage;
ALTER TYPE lead_stage_new RENAME TO lead_stage;

-- 1.2 Expandir tabela visitas
ALTER TABLE visitas
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS m2_medido NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS complexidade NUMERIC(3,2) CHECK (complexidade >= 0 AND complexidade <= 1),
  ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS done_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_visitas_lead_id ON visitas(lead_id);
CREATE INDEX IF NOT EXISTS idx_visitas_done_at ON visitas(done_at);

COMMENT ON COLUMN visitas.lead_id IS 'Lead que originou esta visita';
COMMENT ON COLUMN visitas.m2_medido IS 'Área em m² medida durante a visita';
COMMENT ON COLUMN visitas.complexidade IS 'Coeficiente 0-1 indicando complexidade da obra';
COMMENT ON COLUMN visitas.fotos IS 'Array de URLs das fotos: [{url, tipo, timestamp}]';
COMMENT ON COLUMN visitas.done_at IS 'Data/hora de conclusão da visita';

-- 1.3 Adicionar visita_id em propostas
ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS visita_id UUID REFERENCES visitas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_propostas_visita_id ON propostas(visita_id);

-- 1.4 Criar enum obra_status e tabela obras
CREATE TYPE obra_status AS ENUM (
  'mobilizacao',
  'execucao',
  'acabamento',
  'concluida',
  'pausada'
);

CREATE TABLE IF NOT EXISTS obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL UNIQUE REFERENCES contratos(id) ON DELETE CASCADE,
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status obra_status DEFAULT 'mobilizacao',
  progresso_pct NUMERIC(5,2) DEFAULT 0 CHECK (progresso_pct >= 0 AND progresso_pct <= 100),
  
  responsavel_obra TEXT,
  equipe JSONB DEFAULT '[]'::jsonb,
  
  fotos JSONB DEFAULT '[]'::jsonb,
  ocorrencias JSONB DEFAULT '[]'::jsonb,
  marcos JSONB DEFAULT '[]'::jsonb,
  termo_conclusao_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE obras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own obras"
  ON obras FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own obras"
  ON obras FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own obras"
  ON obras FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own obras"
  ON obras FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_obras_contrato_id ON obras(contrato_id);
CREATE INDEX IF NOT EXISTS idx_obras_status ON obras(status);
CREATE INDEX IF NOT EXISTS idx_obras_started_at ON obras(started_at);
CREATE INDEX IF NOT EXISTS idx_obras_user_id ON obras(user_id);

CREATE TRIGGER update_obras_updated_at
  BEFORE UPDATE ON obras
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 1.5 Adicionar campos de SLA em leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_response_minutes INTEGER;

CREATE INDEX IF NOT EXISTS idx_leads_first_response ON leads(first_response_minutes);

-- Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('visitas-fotos', 'visitas-fotos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('obras-fotos', 'obras-fotos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('obras-termos', 'obras-termos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies Storage - Visitas
CREATE POLICY "Users can upload their own visita photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'visitas-fotos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own visita photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'visitas-fotos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own visita photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'visitas-fotos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policies Storage - Obras
CREATE POLICY "Users can upload their own obra photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'obras-fotos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own obra photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'obras-fotos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own obra photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'obras-fotos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policies Storage - Termos
CREATE POLICY "Users can upload their own obra terms"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'obras-termos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own obra terms"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'obras-termos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own obra terms"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'obras-termos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);