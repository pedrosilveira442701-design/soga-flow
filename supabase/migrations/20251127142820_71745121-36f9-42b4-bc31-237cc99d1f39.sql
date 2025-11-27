-- Add status enum type for visitas
CREATE TYPE visita_status AS ENUM ('agendar', 'marcada', 'atrasada', 'concluida');

-- Add status column to visitas table
ALTER TABLE visitas ADD COLUMN status visita_status DEFAULT 'agendar';

-- Add cliente_manual_name column for visits without a client record
ALTER TABLE visitas ADD COLUMN cliente_manual_name TEXT;

-- Migrate existing data based on current date/time and realizada flag
UPDATE visitas
SET status = CASE
  WHEN realizada = true THEN 'concluida'::visita_status
  WHEN data IS NULL OR hora IS NULL THEN 'agendar'::visita_status
  WHEN (data::text || ' ' || hora::text)::timestamp < NOW() THEN 'atrasada'::visita_status
  ELSE 'marcada'::visita_status
END;

-- Create index for better query performance
CREATE INDEX idx_visitas_status ON visitas(status);
CREATE INDEX idx_visitas_data_hora ON visitas(data, hora);

-- Add comment
COMMENT ON COLUMN visitas.status IS 'Status da visita: agendar (sem data), marcada (agendada futuro), atrasada (passou data sem concluir), concluida';
COMMENT ON COLUMN visitas.cliente_manual_name IS 'Nome do cliente quando não há cadastro (campo livre)';