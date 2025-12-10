-- Adicionar coluna forma_pagamento na tabela propostas
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;