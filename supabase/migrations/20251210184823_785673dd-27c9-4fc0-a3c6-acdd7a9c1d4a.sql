-- Add payment method fields to propostas table
ALTER TABLE public.propostas 
ADD COLUMN IF NOT EXISTS valor_entrada numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS numero_parcelas integer DEFAULT 0;