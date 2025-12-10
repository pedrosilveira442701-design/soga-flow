
-- Drop and recreate the trigger function to only create notifications for future dates
CREATE OR REPLACE FUNCTION public.criar_notificacao_financeira()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente_nome TEXT;
  v_contrato_id UUID;
  v_agendamento_3_dias TIMESTAMP WITH TIME ZONE;
  v_agendamento_1_dia TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get contract and client info
  SELECT c.nome, fp.contrato_id INTO v_cliente_nome, v_contrato_id
  FROM financeiro_parcelas fp
  JOIN contratos ct ON ct.id = fp.contrato_id
  JOIN clientes c ON c.id = ct.cliente_id
  WHERE fp.id = NEW.id;

  -- Calculate scheduled notification times
  v_agendamento_3_dias := NEW.vencimento - INTERVAL '3 days';
  v_agendamento_1_dia := NEW.vencimento - INTERVAL '1 day';

  -- Only create T-3 notification if it's in the future
  IF v_agendamento_3_dias > NOW() THEN
    INSERT INTO public.notificacoes (
      user_id,
      tipo,
      titulo,
      descricao,
      icone,
      entidade,
      entidade_id,
      agendamento
    ) VALUES (
      NEW.user_id,
      'financeiro',
      'Vencimento em 3 dias',
      'Parcela de ' || v_cliente_nome || ' vence em ' || TO_CHAR(NEW.vencimento, 'DD/MM/YYYY') || ' - R$ ' || NEW.valor_liquido_parcela::TEXT,
      'AlertCircle',
      'parcela',
      NEW.id,
      v_agendamento_3_dias
    );
  END IF;

  -- Only create T-24h notification if it's in the future
  IF v_agendamento_1_dia > NOW() THEN
    INSERT INTO public.notificacoes (
      user_id,
      tipo,
      titulo,
      descricao,
      icone,
      entidade,
      entidade_id,
      agendamento
    ) VALUES (
      NEW.user_id,
      'financeiro',
      'Vencimento amanhã',
      'Parcela de ' || v_cliente_nome || ' vence amanhã - R$ ' || NEW.valor_liquido_parcela::TEXT,
      'AlertTriangle',
      'parcela',
      NEW.id,
      v_agendamento_1_dia
    );
  END IF;

  RETURN NEW;
END;
$function$;
