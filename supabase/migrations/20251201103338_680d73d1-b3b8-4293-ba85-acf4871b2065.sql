-- Create enums for anotacoes
CREATE TYPE anotacao_status AS ENUM ('aberta', 'em_andamento', 'concluida', 'arquivada');
CREATE TYPE anotacao_priority AS ENUM ('baixa', 'media', 'alta');
CREATE TYPE anotacao_type AS ENUM ('ligacao', 'orcamento', 'follow_up', 'visita', 'reuniao', 'outro');

-- Create anotacoes table
CREATE TABLE public.anotacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  status anotacao_status NOT NULL DEFAULT 'aberta',
  priority anotacao_priority NOT NULL DEFAULT 'media',
  type anotacao_type NOT NULL DEFAULT 'outro',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  client_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  client_name TEXT,
  reminder_datetime TIMESTAMP WITH TIME ZONE,
  notify_push BOOLEAN DEFAULT false,
  notify_email BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  assignee UUID,
  attachments JSONB DEFAULT '[]'::JSONB,
  activity_log JSONB DEFAULT '[]'::JSONB,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create anotacoes_snoozes table
CREATE TABLE public.anotacoes_snoozes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anotacao_id UUID NOT NULL REFERENCES public.anotacoes(id) ON DELETE CASCADE,
  original_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  snoozed_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create anotacoes_saved_views table
CREATE TABLE public.anotacoes_saved_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anotacoes_snoozes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anotacoes_saved_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for anotacoes
CREATE POLICY "Users can view their own anotacoes"
  ON public.anotacoes FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = assignee);

CREATE POLICY "Users can create their own anotacoes"
  ON public.anotacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own anotacoes"
  ON public.anotacoes FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = assignee);

CREATE POLICY "Users can delete their own anotacoes"
  ON public.anotacoes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for anotacoes_snoozes
CREATE POLICY "Users can view snoozes of their anotacoes"
  ON public.anotacoes_snoozes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.anotacoes
    WHERE anotacoes.id = anotacoes_snoozes.anotacao_id
    AND (anotacoes.user_id = auth.uid() OR anotacoes.assignee = auth.uid())
  ));

CREATE POLICY "Users can create snoozes for their anotacoes"
  ON public.anotacoes_snoozes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.anotacoes
    WHERE anotacoes.id = anotacoes_snoozes.anotacao_id
    AND (anotacoes.user_id = auth.uid() OR anotacoes.assignee = auth.uid())
  ));

CREATE POLICY "Users can delete snoozes of their anotacoes"
  ON public.anotacoes_snoozes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.anotacoes
    WHERE anotacoes.id = anotacoes_snoozes.anotacao_id
    AND (anotacoes.user_id = auth.uid() OR anotacoes.assignee = auth.uid())
  ));

-- RLS Policies for anotacoes_saved_views
CREATE POLICY "Users can view their own saved views"
  ON public.anotacoes_saved_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved views"
  ON public.anotacoes_saved_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved views"
  ON public.anotacoes_saved_views FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved views"
  ON public.anotacoes_saved_views FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_anotacoes_updated_at
  BEFORE UPDATE ON public.anotacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_anotacoes_saved_views_updated_at
  BEFORE UPDATE ON public.anotacoes_saved_views
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to add activity log entry
CREATE OR REPLACE FUNCTION public.add_anotacao_activity(
  p_anotacao_id UUID,
  p_activity_type TEXT,
  p_description TEXT
) RETURNS void AS $$
BEGIN
  UPDATE public.anotacoes
  SET activity_log = activity_log || jsonb_build_array(
    jsonb_build_object(
      'timestamp', now(),
      'type', p_activity_type,
      'description', p_description,
      'user_id', auth.uid()
    )
  )
  WHERE id = p_anotacao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create notification from anotacao
CREATE OR REPLACE FUNCTION public.criar_notificacao_anotacao()
RETURNS TRIGGER AS $$
DECLARE
  v_titulo TEXT;
  v_descricao TEXT;
BEGIN
  -- Only create notification if reminder_datetime is set and notify_push is true
  IF NEW.reminder_datetime IS NOT NULL AND NEW.notify_push = true THEN
    v_titulo := 'Lembrete: ' || NEW.title;
    v_descricao := COALESCE(LEFT(NEW.note, 100), 'Sem descrição');
    
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
      'lembrete',
      v_titulo,
      v_descricao,
      'Bell',
      'anotacao',
      NEW.id,
      NEW.reminder_datetime
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER criar_notificacao_anotacao_trigger
  AFTER INSERT OR UPDATE OF reminder_datetime, notify_push
  ON public.anotacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_notificacao_anotacao();

-- Indexes for performance
CREATE INDEX idx_anotacoes_user_id ON public.anotacoes(user_id);
CREATE INDEX idx_anotacoes_status ON public.anotacoes(status);
CREATE INDEX idx_anotacoes_reminder_datetime ON public.anotacoes(reminder_datetime);
CREATE INDEX idx_anotacoes_client_id ON public.anotacoes(client_id);
CREATE INDEX idx_anotacoes_tags ON public.anotacoes USING GIN(tags);
CREATE INDEX idx_anotacoes_snoozes_anotacao_id ON public.anotacoes_snoozes(anotacao_id);