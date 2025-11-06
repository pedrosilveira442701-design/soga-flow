-- Add produtos column to leads table to store multiple products with their measurements
ALTER TABLE public.leads
ADD COLUMN produtos jsonb DEFAULT '[]'::jsonb;