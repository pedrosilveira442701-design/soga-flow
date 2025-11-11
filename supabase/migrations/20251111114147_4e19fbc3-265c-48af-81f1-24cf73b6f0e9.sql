-- Função para registrar contato automaticamente quando lead, visita, proposta ou contrato é criado
CREATE OR REPLACE FUNCTION auto_register_contato()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_telefone TEXT;
  v_origem TEXT;
  v_data_hora TIMESTAMP WITH TIME ZONE;
  v_lead_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Buscar telefone do cliente
  SELECT telefone INTO v_telefone
  FROM clientes
  WHERE id = NEW.cliente_id;

  -- Se cliente não tem telefone, usa placeholder
  IF v_telefone IS NULL OR v_telefone = '' THEN
    v_telefone := 'Não informado';
  END IF;

  -- Verificar se já existe contato para este user_id e telefone
  SELECT EXISTS(
    SELECT 1 FROM contatos
    WHERE user_id = NEW.user_id
    AND telefone = v_telefone
    LIMIT 1
  ) INTO v_exists;

  -- Se já existe, não fazer nada
  IF v_exists THEN
    RETURN NEW;
  END IF;

  -- Definir origem baseada na tabela de origem
  CASE TG_TABLE_NAME
    WHEN 'leads' THEN
      v_origem := 'Lead Direto';
      v_data_hora := NEW.created_at;
      v_lead_id := NEW.id;
    WHEN 'visitas' THEN
      v_origem := 'Visita Agendada';
      v_data_hora := NEW.created_at;
      v_lead_id := NEW.lead_id;
    WHEN 'propostas' THEN
      v_origem := 'Proposta Direta';
      v_data_hora := NEW.created_at;
      v_lead_id := NEW.lead_id;
    WHEN 'contratos' THEN
      v_origem := 'Contrato Direto';
      v_data_hora := NEW.created_at;
      v_lead_id := NULL;
    ELSE
      v_origem := 'Sistema';
      v_data_hora := NOW();
      v_lead_id := NULL;
  END CASE;

  -- Inserir contato automaticamente
  INSERT INTO contatos (
    user_id,
    telefone,
    data_hora,
    origem,
    converteu_lead,
    lead_id,
    created_at,
    updated_at
  ) VALUES (
    NEW.user_id,
    v_telefone,
    v_data_hora,
    v_origem,
    TRUE,
    v_lead_id,
    v_data_hora,
    v_data_hora
  );

  RETURN NEW;
END;
$$;

-- Trigger para LEADS
CREATE TRIGGER trigger_auto_register_contato_lead
AFTER INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION auto_register_contato();

-- Trigger para VISITAS
CREATE TRIGGER trigger_auto_register_contato_visita
AFTER INSERT ON visitas
FOR EACH ROW
EXECUTE FUNCTION auto_register_contato();

-- Trigger para PROPOSTAS
CREATE TRIGGER trigger_auto_register_contato_proposta
AFTER INSERT ON propostas
FOR EACH ROW
EXECUTE FUNCTION auto_register_contato();

-- Trigger para CONTRATOS
CREATE TRIGGER trigger_auto_register_contato_contrato
AFTER INSERT ON contratos
FOR EACH ROW
EXECUTE FUNCTION auto_register_contato();