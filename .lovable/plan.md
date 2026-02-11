

# Adicionar Receita Real, Margem Real e Delta vs Forecast

## Resumo

Adicionar 3 novos KPI cards no topo da pagina /forecast que mostram dados reais do mes foco selecionado, sem alterar nenhuma logica existente de forecast.

## Fonte de Dados

**Receita Real do mes foco**: soma de `contratos.valor_negociado` onde o contrato tem close date dentro do mes foco. Close date segue a regra existente: `COALESCE(propostas.data_fechamento, contratos.created_at, contratos.data_inicio)`.

**Custo Real**: calculado como `valor_negociado * (1 - margem_pct / 100)` por contrato. So contratos com `margem_pct > 0` sao considerados.

**Margem Real**: `(Receita Real - Custo Real) / Receita Real * 100`.

**Delta**: `Receita Real - Receita Projetada (forecastTotal do mes foco)`.

## Mudancas

### 1. Hook `src/hooks/useForecastPage.tsx`

- Na query paralela de contratos, incluir o campo `margem_pct` que ja existe na tabela
- Criar um mapa `receitaRealPorMes` e `custoRealPorMes` agrupando fechamentos por mesKey
- Adicionar ao `ForecastMensal` 3 novos campos opcionais:
  - `receitaReal: number` (soma dos valores fechados naquele mes)
  - `custoReal: number` (soma de valor * (1 - margem/100))
  - `margemReal: number | null` (percentual, null se receita = 0)
- Preencher esses campos no loop de construcao do `forecastMensal`
- Os fechamentos ja estao calculados em `fechamentos12m` com mesKey; basta reutiliza-los e adicionar margem_pct

### 2. Pagina `src/pages/Forecast.tsx`

- Adicionar uma nova linha de 4 cards entre o seletor de mes foco e os KPIs existentes:

```text
| Receita Projetada | Receita Real | Margem Real | Delta vs Forecast |
```

Detalhes visuais:
- **Receita Projetada**: valor existente (`forecastTotal`), mantido para contexto lado a lado
- **Receita Real**: `fmtBRL(receitaReal)`, exibe "--" se 0
- **Margem Real**: `X.X%`, exibe "--" se receita = 0
- **Delta vs Forecast**: `fmtBRL(delta)`, cor verde se positivo, vermelho se negativo, cinza se zero. Subinfo: "acima/abaixo do projetado"

Os 6 KPI cards existentes permanecem inalterados abaixo.

## O que NAO muda

- Logica de forecast (baseline, pipeline, incremental)
- Simulador de esforco
- Graficos existentes
- Historico 12m
- Pipeline breakdown
- Insights
- Metas
- Estrutura do banco

## Detalhe tecnico

Para incluir `margem_pct` nos contratos, a query existente:
```text
supabase.from("contratos").select("proposta_id, created_at, data_inicio, valor_negociado")
```
Passa a ser:
```text
supabase.from("contratos").select("proposta_id, created_at, data_inicio, valor_negociado, margem_pct")
```

Os fechamentos ja calculados passam a incluir `margemPct` para permitir calculo de custo real por mes.

