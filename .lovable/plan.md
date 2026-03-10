

# Plano: Otimizar Lentidão ao Salvar Leads e Propostas

## Diagnóstico

Identifiquei 3 causas principais da lentidão ao salvar:

### 1. Propostas: Duas chamadas sequenciais ao banco
O `createProposta` faz INSERT + UPDATE separados (para setar `proposal_group_id = id`). São 2 round-trips ao Supabase em série.

### 2. Trigger `auto_register_contato` sem índice
Este trigger dispara em EVERY insert de leads e propostas. Ele faz `SELECT EXISTS(... FROM contatos WHERE user_id = X AND telefone = Y)` -- mas a tabela `contatos` não tem índice em `(user_id, telefone)`, apenas a PK.

### 3. Cascata de invalidações no frontend
Após salvar, `invalidateQueries` dispara refetch de múltiplas queries simultaneamente, causando percepção de lentidão na UI.

## Correções

### A. Migração SQL: Índice na tabela contatos
Criar índice composto para acelerar o trigger:
```sql
CREATE INDEX idx_contatos_user_telefone ON contatos(user_id, telefone);
```

### B. Propostas: Unificar insert + update em uma só chamada
Usar uma function SQL `SECURITY DEFINER` que faz INSERT e já seta `proposal_group_id = id` no mesmo comando, eliminando o segundo round-trip:
```sql
CREATE FUNCTION create_proposta_v1(...) RETURNS propostas AS $$
  INSERT INTO propostas (...) VALUES (...) RETURNING *;
  UPDATE propostas SET proposal_group_id = id WHERE id = lastval();
$$
```
Alternativamente (mais simples): usar `DEFAULT gen_random_uuid()` para `proposal_group_id` com um trigger `BEFORE INSERT` que seta `proposal_group_id = NEW.id` automaticamente.

### C. Frontend: Feedback imediato com optimistic updates
- No `usePropostas.tsx`, usar `onMutate` para fechar o dialog imediatamente e mostrar toast antes do refetch completar
- No `useLeads.tsx`, mesma abordagem -- fechar dialog no `onMutate` ao invés de esperar `mutateAsync`

### D. Frontend: Trocar `mutateAsync` por `mutate` onde possível
Nos handlers `handleCreate`, usar `mutate` (fire-and-forget) ao invés de `await mutateAsync`, permitindo que o dialog feche instantaneamente enquanto a operação continua em background.

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| **Migração SQL** | Índice `contatos(user_id, telefone)` + trigger `BEFORE INSERT` em propostas para setar `proposal_group_id` |
| `src/hooks/usePropostas.tsx` | Remover segundo update no `createProposta`, usar `mutate` em vez de `await mutateAsync` |
| `src/hooks/useLeads.tsx` | Nenhuma mudança estrutural necessária |
| `src/pages/Propostas.tsx` | Trocar `await mutateAsync` por `mutate` + fechar dialog imediatamente |
| `src/pages/Leads.tsx` | Trocar `await mutateAsync` por `mutate` + fechar dialog imediatamente |

## Impacto esperado

- Propostas: de 2 round-trips para 1 (50% mais rápido)
- Dialog fecha instantaneamente ao clicar "Salvar" (percepção de velocidade)
- Trigger `auto_register_contato` mais eficiente com índice

