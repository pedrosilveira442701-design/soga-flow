-- Add daily report settings to notificacao_preferencias
ALTER TABLE public.notificacao_preferencias
ADD COLUMN IF NOT EXISTS relatorio_diario_ativo boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS relatorio_diario_hora time without time zone NOT NULL DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS relatorio_diario_timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
ADD COLUMN IF NOT EXISTS relatorio_diario_email boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS relatorio_diario_inapp boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS relatorio_propostas_abertas boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS relatorio_propostas_repouso boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS relatorio_ultimo_envio timestamp with time zone;