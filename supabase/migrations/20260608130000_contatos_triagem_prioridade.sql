-- Triagem WhatsApp: prioridade + próximo passo sugerido (peneira antes do funil).
ALTER TABLE public.contatos
  ADD COLUMN IF NOT EXISTS prioridade   TEXT CHECK (prioridade IN ('alta','media','baixa')),
  ADD COLUMN IF NOT EXISTS proximo_passo TEXT;
