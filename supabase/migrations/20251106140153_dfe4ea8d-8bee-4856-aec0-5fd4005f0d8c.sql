-- Add servicos column to propostas table to store multiple services
ALTER TABLE public.propostas 
ADD COLUMN servicos jsonb DEFAULT '[]'::jsonb;