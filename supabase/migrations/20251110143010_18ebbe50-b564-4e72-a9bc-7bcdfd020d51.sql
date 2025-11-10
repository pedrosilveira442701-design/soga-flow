-- Adicionar campo para identificar interações automáticas
ALTER TABLE lead_interacoes 
ADD COLUMN automatica BOOLEAN DEFAULT false;

-- Criar função para registrar mudanças de estágio automaticamente
CREATE OR REPLACE FUNCTION registrar_mudanca_estagio()
RETURNS TRIGGER AS $$
BEGIN
  -- Só registra se o estágio mudou
  IF (TG_OP = 'UPDATE' AND OLD.estagio IS DISTINCT FROM NEW.estagio) THEN
    INSERT INTO lead_interacoes (
      lead_id,
      user_id,
      tipo_interacao,
      data_hora,
      observacao,
      automatica
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'Mudança de Estágio',
      NOW(),
      CASE NEW.estagio
        WHEN 'novo' THEN 'Lead movido para: Novo'
        WHEN 'contato' THEN 'Lead movido para: Contato'
        WHEN 'negociacao' THEN 'Lead movido para: Negociação'
        WHEN 'proposta_enviada' THEN 'Lead movido para: Proposta Enviada'
        WHEN 'fechado_ganho' THEN 'Lead movido para: Fechado Ganho'
        WHEN 'perdido' THEN 'Lead movido para: Perdido'
        ELSE 'Lead movido para: ' || NEW.estagio
      END,
      true
    );
  -- Registra a criação do lead
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO lead_interacoes (
      lead_id,
      user_id,
      tipo_interacao,
      data_hora,
      observacao,
      automatica
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'Criação',
      NEW.created_at,
      'Lead criado',
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para registrar mudanças
DROP TRIGGER IF EXISTS trigger_registrar_mudanca_estagio ON leads;
CREATE TRIGGER trigger_registrar_mudanca_estagio
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION registrar_mudanca_estagio();

-- Inserir registros de criação para leads existentes que não têm interações
INSERT INTO lead_interacoes (lead_id, user_id, tipo_interacao, data_hora, observacao, automatica)
SELECT 
  l.id,
  l.user_id,
  'Criação',
  l.created_at,
  'Lead criado',
  true
FROM leads l
WHERE NOT EXISTS (
  SELECT 1 FROM lead_interacoes li 
  WHERE li.lead_id = l.id AND li.tipo_interacao = 'Criação'
);