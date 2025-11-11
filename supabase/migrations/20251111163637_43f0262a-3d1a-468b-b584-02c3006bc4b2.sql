-- Atualizar a função de trigger para usar os novos valores do enum lead_stage
CREATE OR REPLACE FUNCTION public.registrar_mudanca_estagio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
        WHEN 'contrato' THEN 'Lead movido para: Fechou Contrato'
        WHEN 'execucao' THEN 'Lead movido para: Em Execução'
        WHEN 'finalizado' THEN 'Lead movido para: Finalizado'
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