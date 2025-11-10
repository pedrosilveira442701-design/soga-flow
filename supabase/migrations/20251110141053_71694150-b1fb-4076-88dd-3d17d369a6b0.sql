-- Create lead_interacoes table for tracking interactions with leads
CREATE TABLE public.lead_interacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  user_id UUID NOT NULL,
  tipo_interacao TEXT NOT NULL,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lead_interacoes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own lead interactions"
ON public.lead_interacoes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lead interactions"
ON public.lead_interacoes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lead interactions"
ON public.lead_interacoes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lead interactions"
ON public.lead_interacoes
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lead_interacoes_updated_at
BEFORE UPDATE ON public.lead_interacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_lead_interacoes_lead_id ON public.lead_interacoes(lead_id);
CREATE INDEX idx_lead_interacoes_data_hora ON public.lead_interacoes(data_hora DESC);