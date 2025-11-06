-- Adicionar coluna país à tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS pais text DEFAULT 'Brasil';