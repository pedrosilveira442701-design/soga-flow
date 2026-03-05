

# Corrigir Datas de Referência nas Metas

## Problema

Nas queries de cálculo de progresso das metas em `useMetas.tsx`, as propostas estão sendo filtradas por `created_at` (data de criação do registro) em vez de `data` (data de envio da proposta -- o campo de data de negócio). Isso faz com que uma meta com `periodo_inicio = 2026-01-01` e `periodo_fim = 2026-03-31` busque propostas pela data errada, gerando cálculos incorretos.

Conforme a regra de negócio do projeto: **propostas usam `data` (data de envio)**, não `created_at`.

## Mudanças

### Arquivo: `src/hooks/useMetas.tsx`

Substituir `created_at` por `data` em **todas** as queries de propostas dentro de `calcularProgressoReal`:

1. **Propostas (R$)** (linhas ~80-81): `.gte('created_at', ...)` / `.lte('created_at', ...)` → `.gte('data', ...)` / `.lte('data', ...)`

2. **Propostas (#)** (linhas ~94-95): mesma correção

3. **Conversão (%)** (linhas ~107-108): mesma correção na query de propostas

4. **Novos Clientes (#)** (linhas ~140-141): clientes não têm campo de data de negócio, mantém `created_at` (exceção documentada)

Total: 3 queries corrigidas, 6 linhas alteradas (`gte` + `lte` em cada).

## O que NÃO muda

- MetaCard e MetaDetailsDialog já exibem `periodo_inicio` e `periodo_fim` corretamente
- Queries de contratos já usam `data_inicio` (correto)
- Hooks de forecast e planejamento não são afetados (usam metas apenas para buscar `valor_alvo` e período)
- Nenhuma alteração de banco de dados

