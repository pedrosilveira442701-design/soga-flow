-- Adicionar colunas de endereço estruturado à tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS uf text,
ADD COLUMN IF NOT EXISTS logradouro text,
ADD COLUMN IF NOT EXISTS numero text,
ADD COLUMN IF NOT EXISTS complemento text;