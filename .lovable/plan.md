
# Plano: Correção do Período de Propostas Fechadas no Relatório de Gestão

## Diagnóstico

O relatório de gestão está mostrando **16 propostas fechadas no ano** quando deveria mostrar apenas **2**. 

### Causa Raiz
O código atual na edge function `send-management-report` usa `updated_at` para filtrar propostas fechadas no período:

```typescript
// Linha 426 - PROBLEMA
const propostasFechadasAno = (propostas || []).filter(
  p => p.status === "fechada" && new Date(p.updated_at) >= startOfYear
);
```

O `updated_at` foi atualizado em massa durante a migração de versionamento (29/01/2026), então todas as 16 propostas fechadas aparecem como "fechadas em 2026".

### Dados Reais do Banco

| Campo usado | Propostas fechadas em 2026 |
|-------------|---------------------------|
| `updated_at` | 16 (incorreto) |
| `data_fechamento` | 2 (correto) |
| `data` (envio) | 1 |

---

## Alterações Necessárias

### 1. Adicionar filtro de versionamento e campo `data_fechamento`

**Arquivo**: `supabase/functions/send-management-report/index.ts`

**Mudança na query (linhas 419-422)**:
```typescript
// ANTES
const { data: propostas } = await supabaseClient
  .from("propostas")
  .select("id, status, valor_total, liquido, created_at, updated_at, cliente:clientes(nome, bairro, cidade)")
  .eq("user_id", pref.user_id);

// DEPOIS
const { data: propostas } = await supabaseClient
  .from("propostas")
  .select("id, status, valor_total, liquido, data, data_fechamento, data_perda, created_at, updated_at, cliente:clientes(nome, bairro, cidade)")
  .eq("user_id", pref.user_id)
  .eq("is_current", true);  // Filtrar apenas versão corrente
```

### 2. Corrigir filtro de período para propostas fechadas

**Mudança nos filtros (linhas 425-427)**:
```typescript
// ANTES - usa updated_at (incorreto)
const propostasFechadasMes = (propostas || []).filter(
  p => p.status === "fechada" && new Date(p.updated_at) >= startOfMonth
);
const propostasFechadasAno = (propostas || []).filter(
  p => p.status === "fechada" && new Date(p.updated_at) >= startOfYear
);

// DEPOIS - usa data_fechamento com fallback para data
const propostasFechadasMes = (propostas || []).filter(p => {
  if (p.status !== "fechada") return false;
  const dataFechamento = p.data_fechamento ? new Date(p.data_fechamento) : new Date(p.data);
  return dataFechamento >= startOfMonth;
});

const propostasFechadasAno = (propostas || []).filter(p => {
  if (p.status !== "fechada") return false;
  const dataFechamento = p.data_fechamento ? new Date(p.data_fechamento) : new Date(p.data);
  return dataFechamento >= startOfYear;
});
```

### 3. Corrigir filtro para propostas perdidas

```typescript
// DEPOIS - usa data_perda com fallback
const propostasPerdidasMes = (propostas || []).filter(p => {
  if (p.status !== "perdida") return false;
  const dataPerda = p.data_perda ? new Date(p.data_perda) : new Date(p.data);
  return dataPerda >= startOfMonth;
});
```

---

## Resumo das Correções

| Problema | Solução |
|----------|---------|
| Não filtra versão corrente | Adicionar `.eq("is_current", true)` |
| Usa `updated_at` para fechamento | Usar `data_fechamento` (fallback: `data`) |
| Usa `updated_at` para perda | Usar `data_perda` (fallback: `data`) |
| Falta campos na query | Adicionar `data`, `data_fechamento`, `data_perda` |

---

## Resultado Esperado

Após a correção:
- **Propostas fechadas (mês)**: Propostas com `data_fechamento` em Fevereiro 2026
- **Propostas fechadas (ano)**: Propostas com `data_fechamento` em 2026 → **2 propostas** (em vez de 16)
- Sem duplicação de versões antigas

---

## Seção Técnica

### Campos de data no modelo de propostas

| Campo | Uso |
|-------|-----|
| `data` | Data de envio da proposta ao cliente |
| `data_fechamento` | Data em que a proposta foi aceita/fechada |
| `data_perda` | Data em que a proposta foi perdida |
| `created_at` | Timestamp de criação do registro (auditoria) |
| `updated_at` | Timestamp da última modificação (auditoria) |

### Trigger existente
Já existe a função `update_proposta_status_dates()` que preenche automaticamente `data_fechamento` quando o status muda para `fechada`/`aceita`. Propostas antigas podem ter `data_fechamento = null` (antes do trigger existir).
