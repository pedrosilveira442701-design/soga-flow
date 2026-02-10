

# Plano: Refatorar /forecast para Motor Financeiro (R$)

## Problema Atual

O hook `useForecastPage.tsx` calcula tudo baseado em **contagem de propostas**:
- `conversaoReal = totalFechadas / totalEnviadas` (contagem)
- `mediaEnviadasMes = totalEnviadas / 12` (contagem)
- `forecast = volumeMensal * conversao * ticket` (contagem x taxa x valor)

A especificacao exige que **tudo seja em R$**:
- `conversao = valor_fechado / valor_enviado` (financeira)
- `receita_media_mensal = valor_fechado / 12` (financeira)
- `forecast = receita_media_mensal * fator_volume * fator_conversao * fator_ticket`

---

## O Que Muda

### 1. `src/hooks/useForecastPage.tsx` (reescrever logica central)

**Novas metricas base (todas em R$):**

| Metrica | Calculo |
|---------|---------|
| Valor total enviado (R$) | Soma de `propostas.valor_total` (is_current=true, 12m) |
| Valor total fechado (R$) | Soma de `COALESCE(contratos.valor_negociado, propostas.valor_total)` no periodo |
| Conversao financeira (%) | `valor_fechado / valor_enviado` |
| Ticket medio (R$) | `valor_fechado / numero_de_contratos` |
| Receita media mensal (R$) | `valor_fechado / 12` |

**Nova formula de forecast:**
```text
forecast_mensal = receita_media_mensal * fator_volume * fator_conversao * fator_ticket
```

**Interfaces atualizadas:**
- `BaseStats`: trocar `mediaEnviadasMes` e `conversaoReal` por `valorEnviado12m`, `valorFechado12m`, `conversaoFinanceira`, `receitaMediaMensal`, `ticketReal`, `numContratos12m`
- `VolumeHistorico`: trocar `enviadas`/`fechadas` (contagem) por `valorEnviado`/`valorFechado` (R$), manter `conversaoFinanceira` (%)
- `ForecastMensal`: adicionar `acaoNecessariaRS` (gap em R$ de propostas adicionais)
- `CenarioEfetivo`: trocar `volumeMensal` (contagem) por `receitaBase` (R$)

**Insights atualizados:**
- "Para bater a meta, precisa gerar +R$ Y em propostas" (em vez de "+N propostas")
- Manter calculo de "propostas equivalentes" como info secundaria: `gap / (ticket * conversao)`
- Gargalo: comparar impacto dos 3 fatores sobre o forecast

**Sliders:**
- Volume mensal de propostas (R$): base = media de `valor_total` enviado por mes nos 12m
- Conversao financeira (%): base = `valor_fechado / valor_enviado`
- Ticket medio (R$): base = `valor_fechado / num_contratos`

### 2. `src/pages/Forecast.tsx` (atualizar UI)

**Header:**
- Titulo: "Forecast de Faturamento"
- Subtitulo: "Planejamento financeiro baseado no comportamento real dos ultimos 12 meses"

**Controles do Cenario:**
- Slider "Volume mensal (R$)": mostra valor absoluto em R$ e % vs historico
- Slider "Conversao financeira (%)": mostra % absoluto e delta
- Slider "Ticket medio (R$)": mostra valor absoluto e delta
- Nao mostrar contagem de propostas como valor principal do slider

**KPI Cards (4 principais + 2 apoio):**
1. Receita Esperada (receita media mensal historica)
2. Receita Projetada (forecast do cenario)
3. Gap de Faturamento (R$ e %)
4. Acao Necessaria: valor em R$ de propostas + volume equivalente como sub-info
5. Conversao financeira (12m + ajuste)
6. Ticket medio (12m + ajuste)

**Grafico principal (Forecast vs Meta):**
- Barras: Forecast mensal (R$)
- Linha: Meta mensal
- Tooltip: forecast, meta, gap, acao necessaria em R$

**Historico 12m:**
- Barras: Valor enviado (R$) e Valor fechado (R$)
- Linha: Conversao financeira (%)
- Eixo Y em R$ (nao contagem)

**Insights:**
- Frases em R$: "Para bater a meta, precisa gerar +R$ X em propostas"
- Volume equivalente como informacao complementar entre parenteses

---

## O Que NAO Muda

- Rota `/forecast` e posicao no menu (ja existem)
- Estrutura visual geral (header, sliders, KPIs, graficos, insights)
- Logica de metas (leitura e prorrateio)
- Presets conservador/base/agressivo (mesmos fatores)
- Modulo `/analytics` e `PlanejamentoFaturamentoSection` (intocados)

---

## Resumo de Entregas

| # | Arquivo | Acao |
|---|---------|------|
| 1 | `src/hooks/useForecastPage.tsx` | Reescrever: metricas financeiras (R$), nova formula de forecast |
| 2 | `src/pages/Forecast.tsx` | Atualizar: labels, KPIs, sliders e graficos para refletir base financeira |

