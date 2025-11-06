-- Add margem_pct column to contratos table
ALTER TABLE public.contratos
ADD COLUMN margem_pct numeric DEFAULT 0;

-- Update existing contracts to copy margem_pct from their proposals
UPDATE public.contratos c
SET margem_pct = p.margem_pct
FROM public.propostas p
WHERE c.proposta_id = p.id
AND c.proposta_id IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.contratos.margem_pct IS 'Percentual de margem do contrato. Copiado da proposta ou informado manualmente.';