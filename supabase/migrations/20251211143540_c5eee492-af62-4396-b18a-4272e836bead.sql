-- Fix historical proposals without lead_id but with existing leads for the same client
UPDATE propostas p
SET lead_id = (
  SELECT l.id FROM leads l 
  WHERE l.cliente_id = p.cliente_id 
  ORDER BY l.created_at DESC 
  LIMIT 1
)
WHERE p.lead_id IS NULL
  AND EXISTS (
    SELECT 1 FROM leads l WHERE l.cliente_id = p.cliente_id
  );