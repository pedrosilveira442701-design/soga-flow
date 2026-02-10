

# Plano: Corrigir Forecast para Variar Mês a Mês

## Problema

O hook atual soma `receitaMediaMensal` (constante) + `pipelinePorMes` (concentrado em 1-2 meses) resultando em valores quase iguais na maioria dos meses. O `forecastBase` inclui a baseline dentro dele, impossibilitando separar visualmente os 3 componentes no grafico.

## Solucao

### 1. Hook `src/hooks/useForecastPage.tsx` -- Separar 3 series independentes

**Interface `ForecastMensal` atualizada:**

| Campo | Descricao |
|-------|-----------|
| `baseline` | `valor_fechado_12m / 12` (constante) |
| `pipelineAlloc` | Valor ponderado do pipeline distribuido naquele mes (variavel) |
| `incrementalAlloc` | Receita incremental do esforco comercial naquele mes (variavel, com delay) |
| `forecastTotal` | `baseline + pipelineAlloc + incrementalAlloc` |
| `meta` | Meta mensal prorrateada |
| `gap` | `max(0, meta - forecastTotal)` |
| `acaoNecessariaRS` | `gap / conversaoFinanceira` |
| `propostasEquiv` | `gap / (ticketReal * conversaoFinanceira)` |

**Distribuicao do pipeline com spread (nao ponto unico):**

Atualmente cada proposta cai em um unico mes. Mudanca: distribuir em 3 meses ao redor do ponto estimado de fechamento:
- 30% no mes anterior ao estimado
- 50% no mes estimado
- 20% no mes seguinte

Isso gera uma curva suave e realista em vez de "degraus".

**Incremental com delay recorrente:**

Para cada mes `i` no horizonte:
```text
se i >= mesesDeDelay:
  incrementalAlloc[i] = valorAdicionalMensal * conversaoMarginal
senao:
  incrementalAlloc[i] = 0
```

Isso ja existe na logica atual, mas sera separado como campo proprio.

### 2. Pagina `src/pages/Forecast.tsx` -- Stacked bars + Mes foco

**Grafico principal (stacked bar):**

3 barras empilhadas:
- Baseline (azul escuro)
- Pipeline (azul medio)
- Esforco Adicional (azul claro) -- so aparece quando `valorAdicional > 0`

Linha tracejada: Meta mensal

**Tooltip rico:**

```text
[mes]
Baseline:      R$ X
Pipeline:      R$ Y
Incremental:   R$ Z
───────────────
Total:         R$ T
Meta:          R$ M
Gap:           R$ G
Acao:          +R$ A em propostas (~N propostas)
```

**Seletor de mes foco:**

Adicionar um ToggleGroup acima dos KPIs com os meses do horizonte (ex: "fev/26", "mar/26", ...).
Default: mes atual (indice 0).
Ao clicar num mes, os 6 KPI cards passam a refletir aquele mes.

**KPIs atualizados com mes foco:**

| KPI | Valor |
|-----|-------|
| Receita s/ Esforco | `baseline[mesFoco] + pipelineAlloc[mesFoco]` |
| Receita Projetada | `forecastTotal[mesFoco]` |
| Gap vs Meta | `gap[mesFoco]` |
| Acao Necessaria | `acaoNecessariaRS[mesFoco]` + subinfo propostas equiv |
| Pipeline Vivo | Total ponderado (global, nao varia por mes) |
| Conversao (12m) | Conversao financeira base (global) |

**Horizonte (3/6/12m):**

Ao trocar, o array `forecastMensal` muda de tamanho, o grafico renderiza mais/menos barras, o seletor de mes foco se ajusta e o mesFoco reseta para 0.

### 3. Detalhe do simulador

Adicionar linha informativa no card:
```text
"Impacto comeca em ~{tempoMedioFechamentoDias} dias (mes {mesLabel})"
```

---

## Arquivos

| # | Arquivo | Acao |
|---|---------|------|
| 1 | `src/hooks/useForecastPage.tsx` | Separar baseline/pipelineAlloc/incrementalAlloc no ForecastMensal; distribuir pipeline em 3 meses |
| 2 | `src/pages/Forecast.tsx` | Stacked bar chart; seletor de mes foco; tooltip rico; KPIs por mes |

## O que NAO muda

- Rota, menu, navegacao
- Logica de metas (leitura/prorrateio)
- Historico 12m (grafico inferior)
- Pipeline breakdown por estagio
- Insights engine (ja funciona sobre forecastMensal[0])

