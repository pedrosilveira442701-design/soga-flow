-- Add order_index column for manual ordering within status columns
ALTER TABLE public.anotacoes 
ADD COLUMN IF NOT EXISTS order_index numeric DEFAULT 0;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_anotacoes_status_order 
ON public.anotacoes (user_id, status, order_index);

-- Initialize order_index based on created_at for existing records
UPDATE public.anotacoes 
SET order_index = subquery.row_num * 100
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, status ORDER BY created_at) as row_num
  FROM public.anotacoes
) AS subquery
WHERE public.anotacoes.id = subquery.id;