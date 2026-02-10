

# Plano: Nova Pagina /forecast -- Motor de Decisao Comercial

## Resumo

Criar uma pagina dedicada `/forecast` como produto analitico independente, focado em planejamento de faturamento com cenarios interativos, alavancas configuraveis e insights automaticos. Nao altera o modulo existente em `/analytics`.

---

## Arquitetura

```text
/forecast
+-----------------------------------------------------------+
|  Header: "Forecast" + subtitulo                           |
|  [Horizonte: 3|6|12m]  [Cenario: Conservador|Base|Agres.] |
+-----------------------------------------------------------+
|  Card "Controles do Cenario" (alavancas)                  |
|  [Volume propostas/mes] [Conversao %] [Ticket R$]         |
|  [Reset historico]                                        |
+-----------------------------------------------------------+
|  KPI Cards: Meta | Forecast | Gap | Propostas Necessarias |
|             Conversao (12m + ajuste) | Ticket (12m+ajuste)|
+-----------------------------------------------------------+
|  Grafico Forecast Mensal (barras + linha meta + banda)     |
+-----------------------------------------------------------+
|  Historico 12m (enviadas vs fechadas)  |  Projecao vs Meta |
+-----------------------------------------------------------+
|  Insights IA (cards com frases em linguagem de dono)       |
+-----------------------------------------------------------+
```

---

## Arquivos a Criar

### 1. `src/hooks/useForecastPage.tsx`

Hook dedicado para a pagina /forecast (separado do useForecast e usePlanejamentoFaturamento existentes).

**Dados calculados:**
- Janela movel 12 meses (mesma logica do usePlanejamentoFaturamento)
- Fechamentos = contratos vinculados a propostas (fonte de verdade)
- close_date = COALESCE(propostas.data_fechamento, contratos.created_at, contratos.data_inicio)
- ticket = COALESCE(contratos.valor_negociado, propostas.valor_total)
- Conversao = fechadas / enviadas (is_current, 12m)
- P25, P50, P75 do tempo de fechamento
- Volume historico mensal (12 meses)

**Parametros de entrada (cenario):**
- `horizonte`: 3 | 6 | 12 meses
- `volumeAjuste`: multiplicador relativo (-30% a +30%) sobre media mensal
- `conversaoAjuste`: multiplicador relativo sobre conversao real
- `ticketAjuste`: multiplicador relativo sobre ticket real
- `outlierLimit`: 180 (fixo, herdado da regra existente)

**Saida:**
- `baseStats`: { mediaEnviadasMes, conversaoReal, ticketReal, p25, p50, p75, totalFechadas12m, totalEnviadas12m, amostraPequena }
- `cenario`: { volumeMensal, conversao, ticket } (com ajustes aplicados)
- `forecastMensal[]`: { mes, mesKey, forecast, meta, gap, propostasNecessarias }
- `volumeHistorico[]`: { mes, enviadas, fechadas, taxaConversao }
- `metasAtivas[]`: lista de metas compativeis (tipo vendas/receita)
- `insights[]`: strings de insights gerados automaticamente

**Logica de projecao:**
- Para cada mes futuro (ate horizonte): `receita = volumeMensal * conversao * ticket`
- Meta mensal: extrair do array de metas ativas (prorrateado se multi-mes)
- Gap = meta - forecast
- Propostas necessarias = gap / (ticket * conversao)

**Insights automaticos (sem IA externa, regras locais):**
- Compara forecast do mes atual vs media 12m: "Voce esta X% abaixo/acima da media"
- Se gap > 0: "Para bater a meta, precisa de +Y propostas enviadas"
- Identifica gargalo: compara impacto de volume, conversao e ticket
- Se mantiver taxa atual: "O mes fecha em R$ ..."
- Se amostra < 10: "Dados insuficientes para previsao confiavel"

### 2. `src/pages/Forecast.tsx`

Pagina completa com:

**Header:**
- Titulo "Forecast" com icone TrendingUp
- Subtitulo "Planejamento do faturamento com base nos ultimos 12 meses"
- Direita: ToggleGroup para horizonte (3m, 6m, 12m) + ToggleGroup para cenario (Conservador, Base, Agressivo)

**Cenarios pre-configurados:**
- Conservador: volume -20%, conversao -15%, ticket -10%
- Base: sem ajustes (historico puro)
- Agressivo: volume +20%, conversao +10%, ticket +10%

**Card "Controles do Cenario":**
- Slider: Volume mensal de propostas (range: 50%-200% do historico, step 5%)
- Slider: Taxa de conversao (range: 50%-200% do historico, step 5%)
- Slider: Ticket medio (range: 50%-200% do historico, step 5%)
- Cada slider mostra: label, valor absoluto resultante, % vs historico
- Botao "Reset para historico (12m)"
- Todos os graficos reagem em tempo real aos sliders

**KPI Cards (6 cards):**
1. Meta do mes (R$) -- valor da meta ativa ou CTA "Criar meta"
2. Forecast do mes (R$) -- cenario selecionado, com delta vs media 12m
3. Gap (R$ e %) -- meta - forecast, cor verde/vermelho
4. Propostas necessarias (n) -- para zerar o gap
5. Conversao -- real 12m + ajuste do cenario
6. Ticket medio -- real 12m + ajuste do cenario

**Grafico Forecast Mensal (ComposedChart):**
- Barras: receita projetada por mes
- Linha: meta mensal
- Banda (area): intervalo conservador/agressivo (quando cenario = Base)
- Tooltip rico com meta, forecast, gap, propostas necessarias

**Historico 12m (lado esquerdo):**
- ComposedChart: barras enviadas + fechadas, linha conversao %

**Projecao vs Meta (lado direito):**
- BarChart: meta vs projetado vs gap, com badges de propostas necessarias

**Insights (cards na base):**
- 3-5 cards com icones e frases curtas em linguagem de dono
- Cor contextual (verde = positivo, amarelo = atencao, vermelho = critico)

### 3. Integracao de Metas

- Buscar metas ativas com tipo in ['vendas', 'vendas (r$)', 'receita', 'Vendas (R$)']
- Para cada mes projetado, verificar se existe meta cobrindo aquele mes
- Se nao houver meta para o mes, mostrar CTA: "Criar meta" (link para /metas com dialog aberto)
- Prorrateio: valor_alvo / meses_cobertura

---

## Arquivos a Modificar

### 4. `src/App.tsx`

Adicionar rota: `<Route path="/forecast" element={<ProtectedRoute><DashboardLayout><Forecast /></DashboardLayout></ProtectedRoute>} />`

### 5. `src/components/layout/Topbar.tsx`

Adicionar "Forecast" no grupo "Analise" do dropdown, com icone `TrendingUp`:
```
{ title: "Forecast", url: "/forecast", icon: TrendingUp }
```

### 6. `src/components/layout/TopbarMobile.tsx`

O item aparece automaticamente via `allMenuItems` exportado do Topbar.

---

## Detalhes Tecnicos

### Cenarios como multiplicadores

Os sliders manipulam um fator relativo (0.5 a 2.0) sobre os valores historicos reais:
- `volumeEfetivo = mediaEnviadasMes * fatorVolume`
- `conversaoEfetiva = conversaoReal * fatorConversao`
- `ticketEfetivo = ticketReal * fatorTicket`
- `forecastMes = volumeEfetivo * conversaoEfetiva * ticketEfetivo`

Os cenarios pre-definidos simplesmente setam os 3 fatores de uma vez.

### Motor de Insights (regras locais)

Sem chamada a API externa. Regras deterministicas:

| Condicao | Insight |
|----------|---------|
| forecast_mes >= meta | "Voce esta no caminho para bater a meta deste mes" (verde) |
| forecast_mes < meta | "Para bater a meta do mes, precisa de +N propostas" (amarelo) |
| conversao < media_12m * 0.8 | "Seu gargalo esta na conversao" (vermelho) |
| ticket < media_12m * 0.8 | "Seu gargalo esta no ticket medio" (vermelho) |
| volume < media_12m * 0.8 | "Seu gargalo esta no volume de propostas" (vermelho) |
| amostra < 10 | "Dados insuficientes" (cinza) |

### Responsividade

- Desktop: layout completo com graficos lado a lado
- Tablet: graficos empilhados, sliders em coluna
- Mobile: tudo empilhado, sliders com toque amigavel

---

## O que NAO muda

- `/analytics` e PlanejamentoFaturamentoSection -- intocados
- useForecast.tsx e usePlanejamentoFaturamento.tsx -- intocados
- Pagina de Metas -- intocada (apenas leitura de dados)
- Todas as outras paginas e hooks

---

## Resumo de Entregas

| # | Acao | Tipo |
|---|------|------|
| 1 | Criar `src/hooks/useForecastPage.tsx` | Novo arquivo |
| 2 | Criar `src/pages/Forecast.tsx` | Novo arquivo |
| 3 | Adicionar rota `/forecast` em `App.tsx` | Edicao |
| 4 | Adicionar link "Forecast" no dropdown Analise em `Topbar.tsx` | Edicao |

