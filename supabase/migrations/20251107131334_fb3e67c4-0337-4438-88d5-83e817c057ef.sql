-- Migração: Atualizar campo origem em leads
-- Substituir "Whatsapp" por "Instagram" nos registros existentes
UPDATE leads 
SET origem = REPLACE(origem, 'Whatsapp', 'Instagram')
WHERE origem LIKE '%Whatsapp%';

-- Comentário: A migração atualiza todos os registros que contêm "Whatsapp" 
-- (incluindo os que têm formato "Whatsapp: descrição") para "Instagram"