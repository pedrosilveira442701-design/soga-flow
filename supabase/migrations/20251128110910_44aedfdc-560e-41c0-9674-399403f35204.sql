-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('financeiro', 'visita', 'visita_atrasada', 'lead', 'proposta', 'contrato', 'obra')),
  titulo TEXT NOT NULL,
  descricao TEXT,
  icone TEXT,
  entidade TEXT,
  entidade_id UUID,
  agendamento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  lida_em TIMESTAMP WITH TIME ZONE,
  excluida BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notificacao_preferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  financeiro_inapp BOOLEAN NOT NULL DEFAULT TRUE,
  financeiro_email BOOLEAN NOT NULL DEFAULT FALSE,
  visita_inapp BOOLEAN NOT NULL DEFAULT TRUE,
  visita_email BOOLEAN NOT NULL DEFAULT FALSE,
  visita_atrasada_inapp BOOLEAN NOT NULL DEFAULT TRUE,
  visita_atrasada_email BOOLEAN NOT NULL DEFAULT FALSE,
  lead_inapp BOOLEAN NOT NULL DEFAULT TRUE,
  lead_email BOOLEAN NOT NULL DEFAULT FALSE,
  proposta_inapp BOOLEAN NOT NULL DEFAULT TRUE,
  proposta_email BOOLEAN NOT NULL DEFAULT FALSE,
  contrato_inapp BOOLEAN NOT NULL DEFAULT TRUE,
  contrato_email BOOLEAN NOT NULL DEFAULT FALSE,
  obra_inapp BOOLEAN NOT NULL DEFAULT TRUE,
  obra_email BOOLEAN NOT NULL DEFAULT FALSE,
  resumo_diario_visitas BOOLEAN NOT NULL DEFAULT TRUE,
  resumo_diario_hora TIME NOT NULL DEFAULT '08:00:00',
  email_customizado TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_id ON public.notificacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON public.notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON public.notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_excluida ON public.notificacoes(excluida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_agendamento ON public.notificacoes(agendamento);

-- Enable RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacao_preferencias ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notificacoes
CREATE POLICY "Users can view their own notifications"
  ON public.notificacoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notifications"
  ON public.notificacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notificacoes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notificacoes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for notificacao_preferencias
CREATE POLICY "Users can view their own preferences"
  ON public.notificacao_preferencias FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.notificacao_preferencias FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.notificacao_preferencias FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_notificacoes_updated_at
  BEFORE UPDATE ON public.notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notificacao_preferencias_updated_at
  BEFORE UPDATE ON public.notificacao_preferencias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create financial notifications (T-3 days and T-24h)
CREATE OR REPLACE FUNCTION public.criar_notificacao_financeira()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_nome TEXT;
  v_contrato_id UUID;
BEGIN
  -- Get contract and client info
  SELECT c.nome, fp.contrato_id INTO v_cliente_nome, v_contrato_id
  FROM financeiro_parcelas fp
  JOIN contratos ct ON ct.id = fp.contrato_id
  JOIN clientes c ON c.id = ct.cliente_id
  WHERE fp.id = NEW.id;

  -- Create notification for T-3 days
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
    NEW.vencimento - INTERVAL '3 days'
  );

  -- Create notification for T-24h
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
    NEW.vencimento - INTERVAL '1 day'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create visit notification (T-24h)
CREATE OR REPLACE FUNCTION public.criar_notificacao_visita()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_nome TEXT;
  v_data_hora TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only create notification if visit is scheduled (status = 'marcada')
  IF NEW.status = 'marcada' AND NEW.data IS NOT NULL AND NEW.hora IS NOT NULL THEN
    -- Get client name
    IF NEW.cliente_id IS NOT NULL THEN
      SELECT nome INTO v_cliente_nome FROM clientes WHERE id = NEW.cliente_id;
    ELSE
      v_cliente_nome := COALESCE(NEW.cliente_manual_name, 'Cliente não informado');
    END IF;

    -- Combine date and time
    v_data_hora := (NEW.data || ' ' || NEW.hora)::TIMESTAMP WITH TIME ZONE;

    -- Create notification for T-24h before visit
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
      'visita',
      'Visita amanhã',
      'Visita agendada com ' || v_cliente_nome || ' - ' || NEW.assunto || ' às ' || TO_CHAR(NEW.hora, 'HH24:MI'),
      'Calendar',
      'visita',
      NEW.id,
      v_data_hora - INTERVAL '1 day'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create late visit notification
CREATE OR REPLACE FUNCTION public.criar_notificacao_visita_atrasada()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_nome TEXT;
BEGIN
  -- Only notify if status changed to 'atrasada'
  IF NEW.status = 'atrasada' AND (OLD.status IS NULL OR OLD.status != 'atrasada') THEN
    -- Get client name
    IF NEW.cliente_id IS NOT NULL THEN
      SELECT nome INTO v_cliente_nome FROM clientes WHERE id = NEW.cliente_id;
    ELSE
      v_cliente_nome := COALESCE(NEW.cliente_manual_name, 'Cliente não informado');
    END IF;

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
      'visita_atrasada',
      'Visita atrasada',
      'Visita com ' || v_cliente_nome || ' - ' || NEW.assunto || ' está atrasada',
      'AlertTriangle',
      'visita',
      NEW.id,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
CREATE TRIGGER trigger_notificacao_financeira
  AFTER INSERT ON public.financeiro_parcelas
  FOR EACH ROW
  WHEN (NEW.status = 'pendente')
  EXECUTE FUNCTION public.criar_notificacao_financeira();

CREATE TRIGGER trigger_notificacao_visita
  AFTER INSERT OR UPDATE ON public.visitas
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_notificacao_visita();

CREATE TRIGGER trigger_notificacao_visita_atrasada
  AFTER UPDATE ON public.visitas
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_notificacao_visita_atrasada();