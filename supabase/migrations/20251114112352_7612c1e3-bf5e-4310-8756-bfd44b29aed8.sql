-- Adicionar o valor 'em_analise' ao enum lead_stage
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'em_analise';