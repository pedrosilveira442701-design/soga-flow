-- Limpar todas as tabelas de dados (mantendo profiles e user_roles)
-- Ordem respeitando dependências

-- 1. Arquivos (sem dependências críticas)
DELETE FROM public.arquivos;

-- 2. Parcelas financeiras (depende de contratos)
DELETE FROM public.financeiro_parcelas;

-- 3. Contratos (depende de clientes e propostas)
DELETE FROM public.contratos;

-- 4. Propostas (depende de clientes)
DELETE FROM public.propostas;

-- 5. Leads (depende de clientes)
DELETE FROM public.leads;

-- 6. Visitas (depende de clientes)
DELETE FROM public.visitas;

-- 7. Metas (independente)
DELETE FROM public.metas;

-- 8. Clientes (último porque outros dependem dele)
DELETE FROM public.clientes;