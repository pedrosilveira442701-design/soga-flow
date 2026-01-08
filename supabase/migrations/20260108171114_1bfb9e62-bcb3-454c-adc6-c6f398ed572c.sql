-- Adicionar coluna order_index para ordenação das metas
ALTER TABLE public.metas ADD COLUMN order_index INTEGER DEFAULT 0;