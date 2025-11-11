-- Adicionar campo para armazenar motivo da perda de leads
ALTER TABLE public.leads 
ADD COLUMN motivo_perda TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.leads.motivo_perda IS 'Motivo pelo qual o lead foi marcado como perdido';