
# Plano: Correção do Versionamento de Propostas em Todos os Módulos

## Resumo Executivo

O sistema de versionamento foi implementado na Fase 1-3, mas os módulos analíticos (Dashboard, Analytics, Metas, Relatorios) ainda não filtram pela versão corrente (`is_current = true`). Isso significa que KPIs podem estar duplicando valores ao somar V1 + V2 da mesma proposta.

---

## Diagnóstico Atual

| Módulo | Status | Problema |
|--------|--------|----------|
| `usePropostas` | OK | Já filtra `is_current = true` |
| `vw_propostas` (view) | PENDENTE | Não filtra `is_current` |
| `useDashboard` | PENDENTE | Consulta direta sem filtro de versão |
| `useAnalytics` | PENDENTE | Consulta direta sem filtro de versão |
| `useMetas` | PENDENTE | Consulta direta sem filtro de versão |
| `useRelatorios` | PENDENTE | Usa `vw_propostas` (view) sem filtro |

---

## Fase 1: Atualizar View `vw_propostas`

**Objetivo**: A view deve retornar apenas propostas correntes por padrão.

**Alteração SQL**:
```sql
CREATE OR REPLACE VIEW public.vw_propostas
WITH (security_invoker = on) AS
SELECT 
  p.id, p.user_id, p.cliente_id, p.status, p.tipo_piso,
  p.m2, p.valor_m2, p.custo_m2, p.valor_total, p.liquido,
  p.margem_pct, p.desconto, p.data, p.forma_pagamento,
  p.observacao, p.created_at, p.updated_at,
  -- Campos de versionamento
  p.proposal_group_id, p.version_number, p.is_current,
  p.previous_version_id, p.replaced_by_id, p.replaced_at,
  p.changed_reason, p.changed_reason_detail,
  -- Campos calculados
  c.nome AS cliente,
  c.cidade, c.bairro,
  l.origem AS canal,
  s.servico,
  (CURRENT_DATE - p.data)::integer AS dias_aberta,
  to_char(p.data, 'YYYY-MM') AS periodo_mes,
  p.data AS periodo_dia,
  EXTRACT(YEAR FROM p.data)::integer AS periodo_ano
FROM propostas p
LEFT JOIN clientes c ON c.id = p.cliente_id
LEFT JOIN leads l ON l.id = p.lead_id
LEFT JOIN LATERAL (
  SELECT string_agg(DISTINCT srv->>'tipo', ', ') AS servico
  FROM jsonb_array_elements(p.servicos) AS srv
) s ON true
WHERE p.is_current = true;  -- FILTRO ADICIONADO
```

**Impacto**: 
- `useRelatorios` automaticamente passará a mostrar apenas versões correntes
- Dashboard de Relatórios corrigido

---

## Fase 2: Atualizar `useDashboard`

**Arquivo**: `src/hooks/useDashboard.tsx`

**Alterações necessárias**:

1. **Query de propostas** (linha ~75): Adicionar filtro `is_current = true`
```typescript
const { data: propostas = [] } = useQuery({
  queryFn: async () => {
    const { data, error } = await supabase
      .from("propostas")
      .select("*")
      .eq("user_id", user!.id)
      .eq("is_current", true)  // ADICIONAR
      .gte("data", startDateStr)
      .lte("data", endDateStr);
    // ...
  }
});
```

2. **Query de propostas anteriores** (linha ~160): Mesmo filtro
```typescript
.eq("is_current", true)
```

3. **Query de timeline** (linha ~110): Mesmo filtro
```typescript
.eq("is_current", true)
```

---

## Fase 3: Atualizar `useAnalytics`

**Arquivo**: `src/hooks/useAnalytics.tsx`

**Queries que precisam do filtro `is_current = true`**:

1. **Scatter Preço x Margem** (~linha 270)
2. **Waterfall de Margem** (~linha 337)
3. **Performance por Responsável** - propostas query (~linha 551)
4. **Análise por Tipo de Piso** (se existir)
5. **Dados Geográficos** (se usar propostas)

Para cada query de propostas, adicionar:
```typescript
.eq("is_current", true)
```

---

## Fase 4: Atualizar `useMetas`

**Arquivo**: `src/hooks/useMetas.tsx`

**Função `calcularProgressoReal`** (linhas 54-150):

Para metas do tipo `propostas (r$)` e `propostas (#)`:
```typescript
case 'propostas (r$)': {
  const { data: propostas } = await supabase
    .from('propostas')
    .select('valor_total')
    .eq('user_id', user_id)
    .eq('is_current', true)  // ADICIONAR
    .gte('created_at', periodo_inicio)
    .lte('created_at', periodo_fim);
  // ...
}

case 'propostas (#)': {
  const { count } = await supabase
    .from('propostas')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user_id)
    .eq('is_current', true)  // ADICIONAR
    .gte('created_at', periodo_inicio)
    .lte('created_at', periodo_fim);
  // ...
}

case 'conversão (%)': {
  const { count: totalPropostas } = await supabase
    .from('propostas')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user_id)
    .eq('is_current', true)  // ADICIONAR
    .gte('created_at', periodo_inicio)
    .lte('created_at', periodo_fim);
  // ...
}
```

---

## Fase 5: KPIs da Página de Propostas

**Arquivo**: `src/pages/Propostas.tsx`

A página já usa `usePropostas()` que filtra `is_current = true`, então os KPIs já estão corretos.

**Melhoria sugerida**: Adicionar coluna "Versão" na tabela:

```typescript
// Na tabela, adicionar coluna:
<TableHead>Versão</TableHead>

// Na célula:
<TableCell>
  <Badge variant="outline">V{proposta.version_number || 1}</Badge>
</TableCell>
```

---

## Fase 6: (Opcional) KPIs Separados para V1 vs V2+

Adicionar no Dashboard métricas de eficiência comercial:

```text
┌────────────────────┬────────────────────┐
│ Propostas Novas    │ Retrabalho         │
│ (V1 apenas)        │ (V2+)              │
│ R$ XXX.XXX         │ R$ XXX.XXX         │
│ 45 propostas       │ 8 revisões         │
└────────────────────┴────────────────────┘
```

**Implementação**:
```typescript
// Em useDashboard
const propostasV1 = propostas.filter(p => p.version_number === 1);
const propostasRetrabalho = propostas.filter(p => (p.version_number || 1) > 1);

const kpis = {
  // ...existentes...
  propostasNovas: {
    value: formatCurrency(sumV1),
    count: propostasV1.length,
  },
  retrabalho: {
    value: formatCurrency(sumRetrabalho),
    count: propostasRetrabalho.length,
  },
};
```

---

## Resumo das Alterações

| Arquivo/Recurso | Tipo | Alteração |
|-----------------|------|-----------|
| `vw_propostas` | SQL Migration | Adicionar `WHERE is_current = true` |
| `src/hooks/useDashboard.tsx` | Código | Adicionar `.eq("is_current", true)` em 4 queries |
| `src/hooks/useAnalytics.tsx` | Código | Adicionar `.eq("is_current", true)` em 3+ queries |
| `src/hooks/useMetas.tsx` | Código | Adicionar `.eq("is_current", true)` em 3 queries |
| `src/pages/Propostas.tsx` | Código | Adicionar coluna "Versão" na tabela |

---

## Ordem de Execução

1. Migração SQL para `vw_propostas` (corrige Relatórios automaticamente)
2. Atualizar `useDashboard.tsx`
3. Atualizar `useAnalytics.tsx`
4. Atualizar `useMetas.tsx`
5. Adicionar coluna Versão em `Propostas.tsx`
6. (Opcional) Adicionar KPIs V1 vs Retrabalho

---

## Resultado Esperado

Depois das correções:
- KPIs do Dashboard mostrarão apenas valores da versão corrente
- Relatórios exportados terão apenas a última versão de cada proposta
- Metas calcularão progresso corretamente
- Analytics não terá duplicação de dados
- Tabela de propostas mostrará a versão (V1, V2, etc.)
