-- Adicionar o valor 'repouso' ao enum lead_stage
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'repouso';

-- Adicionar campo status_changed_at para tracking de tempo em cada etapa
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Inicializar status_changed_at para leads existentes (usar updated_at como referência)
UPDATE leads 
SET status_changed_at = updated_at 
WHERE status_changed_at IS NULL;

-- Criar trigger para atualizar status_changed_at automaticamente quando o estágio muda
CREATE OR REPLACE FUNCTION update_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.estagio IS DISTINCT FROM NEW.estagio) THEN
    NEW.status_changed_at = NOW();
  ELSIF (TG_OP = 'INSERT') THEN
    NEW.status_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_status_changed_at ON leads;
CREATE TRIGGER trigger_update_status_changed_at
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_status_changed_at();

-- Atualizar a função registrar_mudanca_estagio para incluir 'repouso'
CREATE OR REPLACE FUNCTION public.registrar_mudanca_estagio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        WHEN 'contato' THEN 'Lead movido para: Entrou em Contato'
        WHEN 'visita_agendada' THEN 'Lead movido para: Visita Agendada'
        WHEN 'visita_realizada' THEN 'Lead movido para: Visita Realizada'
        WHEN 'proposta_pendente' THEN 'Lead movido para: Proposta Pendente'
        WHEN 'proposta' THEN 'Lead movido para: Gerou Proposta'
        WHEN 'em_analise' THEN 'Lead movido para: Em análise'
        WHEN 'contrato' THEN 'Lead movido para: Fechou Contrato'
        WHEN 'execucao' THEN 'Lead movido para: Em Execução'
        WHEN 'finalizado' THEN 'Lead movido para: Finalizado'
        WHEN 'repouso' THEN 'Lead movido para: Repouso'
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
$function$;