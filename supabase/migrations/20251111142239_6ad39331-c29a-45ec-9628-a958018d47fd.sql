-- Adicionar coluna de observações
ALTER TABLE contatos 
ADD COLUMN observacoes TEXT;

-- Criar tipo enum para tags
CREATE TYPE contato_tag AS ENUM ('anuncio', 'descoberta', 'orcamento');

-- Adicionar coluna de tag
ALTER TABLE contatos
ADD COLUMN tag contato_tag;