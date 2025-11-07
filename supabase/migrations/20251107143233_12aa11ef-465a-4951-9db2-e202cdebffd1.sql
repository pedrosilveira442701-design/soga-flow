-- Adicionar novo valor 'proposta_pendente' ao ENUM lead_stage
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'proposta_pendente' AFTER 'visita_realizada';