-- Add management report columns to notificacao_preferencias
ALTER TABLE public.notificacao_preferencias
ADD COLUMN IF NOT EXISTS relatorio_gestao_ativo boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS relatorio_gestao_frequencia text NOT NULL DEFAULT 'diaria',
ADD COLUMN IF NOT EXISTS relatorio_gestao_hora time without time zone NOT NULL DEFAULT '08:00:00'::time without time zone,
ADD COLUMN IF NOT EXISTS relatorio_gestao_dia_semana integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS relatorio_gestao_dia_mes integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS relatorio_gestao_email boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS relatorio_gestao_inapp boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS relatorio_gestao_ultimo_envio timestamp with time zone;

-- Add constraint for frequencia values
ALTER TABLE public.notificacao_preferencias
DROP CONSTRAINT IF EXISTS check_gestao_frequencia;

ALTER TABLE public.notificacao_preferencias
ADD CONSTRAINT check_gestao_frequencia CHECK (relatorio_gestao_frequencia IN ('diaria', 'semanal', 'mensal'));

-- Add constraint for dia_semana (0-6, Sunday-Saturday)
ALTER TABLE public.notificacao_preferencias
DROP CONSTRAINT IF EXISTS check_gestao_dia_semana;

ALTER TABLE public.notificacao_preferencias
ADD CONSTRAINT check_gestao_dia_semana CHECK (relatorio_gestao_dia_semana >= 0 AND relatorio_gestao_dia_semana <= 6);

-- Add constraint for dia_mes (1-31)
ALTER TABLE public.notificacao_preferencias
DROP CONSTRAINT IF EXISTS check_gestao_dia_mes;

ALTER TABLE public.notificacao_preferencias
ADD CONSTRAINT check_gestao_dia_mes CHECK (relatorio_gestao_dia_mes >= 1 AND relatorio_gestao_dia_mes <= 31);