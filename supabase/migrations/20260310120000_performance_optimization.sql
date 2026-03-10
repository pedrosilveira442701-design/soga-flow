-- =============================================================
-- Migration: Performance Optimization
-- Data: 2026-03-10
-- Etapa 1: Índice contatos + trigger BEFORE INSERT propostas
-- Etapa 2: Índices notificações + otimização triggers
-- =============================================================

-- =====================
-- ETAPA 1A: Índice composto em contatos(user_id, telefone)
-- Acelera o trigger auto_register_contato que roda em todo INSERT de leads/propostas
-- =====================
CREATE INDEX IF NOT EXISTS idx_contatos_user_telefone
  ON contatos(user_id, telefone);

-- =====================
-- ETAPA 1B: Trigger BEFORE INSERT em propostas para auto-setar proposal_group_id
-- Elimina o segundo round-trip (UPDATE) no frontend
-- =====================
CREATE OR REPLACE FUNCTION set_proposal_group_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se proposal_group_id não foi informado, setar para o próprio id
  IF NEW.proposal_group_id IS NULL THEN
    NEW.proposal_group_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_proposal_group_id ON propostas;
CREATE TRIGGER trigger_set_proposal_group_id
  BEFORE INSERT ON propostas
  FOR EACH ROW
  EXECUTE FUNCTION set_proposal_group_id();

-- =====================
-- ETAPA 2A: Índices em tabelas de notificações e insights
-- =====================
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_created
  ON notificacoes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notificacoes_user_lida
  ON notificacoes(user_id, lida)
  WHERE lida = false;

CREATE INDEX IF NOT EXISTS idx_insights_cache_user
  ON insights_cache(user_id);

CREATE INDEX IF NOT EXISTS idx_insights_audit_user
  ON insights_audit_logs(user_id);

-- =====================
-- ETAPA 2B: Otimizar trigger auto_register_contato
-- Adicionar early return se cliente não tem telefone válido
-- =====================
CREATE OR REPLACE FUNCTION auto_register_contato()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_telefone TEXT;
  v_nome TEXT;
  v_origem TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Buscar telefone e nome do cliente
  SELECT telefone, nome INTO v_telefone, v_nome
  FROM clientes
  WHERE id = NEW.cliente_id;

  -- Early return: se não tem telefone válido, não criar contato
  IF v_telefone IS NULL OR v_telefone = '' OR v_telefone = 'Não informado' THEN
    RETURN NEW;
  END IF;

  -- Verificar duplicata usando o novo índice (user_id, telefone)
  SELECT EXISTS(
    SELECT 1 FROM contatos
    WHERE user_id = NEW.user_id AND telefone = v_telefone
  ) INTO v_exists;

  IF v_exists THEN
    RETURN NEW;
  END IF;

  -- Determinar origem baseada na tabela
  CASE TG_TABLE_NAME
    WHEN 'leads' THEN v_origem := 'Lead Direto';
    WHEN 'visitas' THEN v_origem := 'Visita Agendada';
    WHEN 'propostas' THEN v_origem := 'Proposta Direta';
    WHEN 'contratos' THEN v_origem := 'Contrato Direto';
    ELSE v_origem := 'Outros';
  END CASE;

  -- Inserir contato
  INSERT INTO contatos (user_id, telefone, nome, origem, converteu_lead, lead_id)
  VALUES (
    NEW.user_id,
    v_telefone,
    v_nome,
    v_origem,
    TRUE,
    CASE WHEN TG_TABLE_NAME = 'leads' THEN NEW.id ELSE NULL END
  );

  RETURN NEW;
END;
$$;
