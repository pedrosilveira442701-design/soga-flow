-- Add lead_id column to propostas table
ALTER TABLE public.propostas
ADD COLUMN lead_id uuid;

-- Add foreign key constraint
ALTER TABLE public.propostas
ADD CONSTRAINT propostas_lead_id_fkey 
FOREIGN KEY (lead_id) 
REFERENCES public.leads(id) 
ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_propostas_lead_id ON public.propostas(lead_id);

-- Add comment for documentation
COMMENT ON COLUMN public.propostas.lead_id IS 'Optional reference to the lead that originated this proposal';