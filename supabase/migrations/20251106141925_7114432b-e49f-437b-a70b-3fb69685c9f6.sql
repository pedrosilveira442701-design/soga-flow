-- Add desconto column to propostas table
ALTER TABLE public.propostas 
ADD COLUMN desconto numeric DEFAULT 0;