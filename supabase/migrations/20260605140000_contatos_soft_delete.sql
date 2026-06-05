-- Soft-delete em contatos: apagar esconde da tela mas mantém a contagem de "leads gerados".
ALTER TABLE public.contatos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS contatos_deleted_at_idx ON public.contatos (user_id, deleted_at);
