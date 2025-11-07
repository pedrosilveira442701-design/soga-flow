-- Criar tabela para histórico de downloads de arquivos
CREATE TABLE public.arquivo_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  arquivo_id UUID NOT NULL,
  entidade TEXT NOT NULL,
  cliente_nome TEXT,
  tipo_arquivo TEXT,
  nome_arquivo TEXT NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.arquivo_downloads ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own download history"
ON public.arquivo_downloads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own download records"
ON public.arquivo_downloads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Índices para melhor performance
CREATE INDEX idx_arquivo_downloads_user_id ON public.arquivo_downloads(user_id);
CREATE INDEX idx_arquivo_downloads_downloaded_at ON public.arquivo_downloads(downloaded_at DESC);