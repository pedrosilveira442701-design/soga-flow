
# Plano: Correção do Período de Propostas Fechadas no Relatório de Gestão

## ✅ CONCLUÍDO

### Diagnóstico

O relatório de gestão estava mostrando **16 propostas fechadas no ano** quando deveria mostrar apenas **2**. 

### Causa Raiz (Corrigida)
O código usava `updated_at` para filtrar propostas fechadas no período. O `updated_at` foi atualizado em massa durante a migração de versionamento (29/01/2026), então todas as 16 propostas fechadas apareciam como "fechadas em 2026".

---

## Alterações Implementadas

### 1. Query com filtro de versionamento e campos de data

**Arquivo**: `supabase/functions/send-management-report/index.ts`

```typescript
const { data: propostas } = await supabaseClient
  .from("propostas")
  .select("id, status, valor_total, liquido, data, data_fechamento, data_perda, created_at, updated_at, cliente:clientes(nome, bairro, cidade)")
  .eq("user_id", pref.user_id)
  .eq("is_current", true);  // Filtrar apenas versão corrente
```

### 2. Filtro corrigido para propostas fechadas

```typescript
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

### 3. Filtro corrigido para propostas perdidas

```typescript
const propostasPerdidasMes = (propostas || []).filter(p => {
  if (p.status !== "perdida") return false;
  const dataPerda = p.data_perda ? new Date(p.data_perda) : new Date(p.data);
  return dataPerda >= startOfMonth;
});
```

---

## Resultado

- **Propostas fechadas (ano)**: Agora usa `data_fechamento` → **2 propostas** (correto)
- **Propostas fechadas (mês)**: Propostas com `data_fechamento` em Fevereiro 2026
- **Sem duplicação**: Filtro `is_current = true` garante apenas versões ativas
