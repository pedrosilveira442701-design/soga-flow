-- ============================================================================
-- WhatsApp -> Leads (Fase 1): ingestão automática + triagem por IA
-- Reusa a tabela `contatos` como fila de triagem (já tem o fluxo converter->lead).
-- ============================================================================

-- 1. Triagem nos contatos -----------------------------------------------------
-- Status da triagem por IA. 'pendente' = ainda não classificado ou IA falhou.
ALTER TABLE public.contatos
  ADD COLUMN IF NOT EXISTS triagem_status   TEXT NOT NULL DEFAULT 'pendente'
    CHECK (triagem_status IN ('pendente', 'potencial', 'ruido')),
  ADD COLUMN IF NOT EXISTS triagem_motivo   TEXT,
  ADD COLUMN IF NOT EXISTS canal_detectado  TEXT,        -- texto livre extraído pela IA
  ADD COLUMN IF NOT EXISTS whatsapp_jid     TEXT,        -- telefone normalizado (E.164 sem +)
  ADD COLUMN IF NOT EXISTS whatsapp_msg_id  TEXT,        -- id da 1ª mensagem (idempotência)
  ADD COLUMN IF NOT EXISTS texto_conversa   TEXT;        -- trecho das primeiras mensagens

-- Idempotência: o mesmo contato (telefone) não pode ser inserido duas vezes pelo
-- webhook para o mesmo dono. Já existe índice (user_id, telefone); aqui garantimos
-- unicidade para o upsert do webhook.
CREATE UNIQUE INDEX IF NOT EXISTS contatos_user_telefone_uniq
  ON public.contatos (user_id, telefone);

CREATE INDEX IF NOT EXISTS contatos_triagem_status_idx
  ON public.contatos (user_id, triagem_status);

-- 2. Log bruto de mensagens ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  jid         TEXT NOT NULL,               -- telefone normalizado
  push_name   TEXT,
  from_me     BOOLEAN NOT NULL DEFAULT false,
  texto       TEXT,
  message_id  TEXT NOT NULL,               -- id da mensagem no WhatsApp/Evolution
  message_ts  TIMESTAMPTZ NOT NULL,        -- horário real da mensagem
  contato_id  UUID REFERENCES public.contatos(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotência do webhook: o mesmo message_id nunca grava duas vezes.
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_mensagens_msgid_uniq
  ON public.whatsapp_mensagens (user_id, message_id);

CREATE INDEX IF NOT EXISTS whatsapp_mensagens_jid_idx
  ON public.whatsapp_mensagens (user_id, jid, message_ts DESC);

-- 3. Estado da conexão Evolution ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_conexao (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  instancia     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'desconectado'
    CHECK (status IN ('desconectado', 'conectando', 'conectado')),
  numero        TEXT,
  backfill_done BOOLEAN NOT NULL DEFAULT false,   -- garante varredura histórica única
  last_event_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_conexao_instancia_uniq
  ON public.whatsapp_conexao (user_id, instancia);

-- 4. RLS ----------------------------------------------------------------------
ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conexao   ENABLE ROW LEVEL SECURITY;

-- Leitura no app: cada dono vê o que é seu. Escrita é feita pelas edge functions
-- com service_role (bypassa RLS), então só precisamos das policies de leitura/gestão.
CREATE POLICY "own whatsapp_mensagens (select)"
  ON public.whatsapp_mensagens FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own whatsapp_conexao (select)"
  ON public.whatsapp_conexao FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own whatsapp_conexao (update)"
  ON public.whatsapp_conexao FOR UPDATE USING (auth.uid() = user_id);

-- 5. updated_at trigger para whatsapp_conexao --------------------------------
-- Reusa a função genérica já existente no schema (update_updated_at_column).
DROP TRIGGER IF EXISTS set_whatsapp_conexao_updated_at ON public.whatsapp_conexao;
CREATE TRIGGER set_whatsapp_conexao_updated_at
  BEFORE UPDATE ON public.whatsapp_conexao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
