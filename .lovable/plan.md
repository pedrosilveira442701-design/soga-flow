
# Auto-preencher Preco/m2 e Sugerir Custo/m2 ao Importar Lead

## Problema Atual

Quando um lead e selecionado no formulario de proposta, o sistema importa tipo e metragem mas deixa `valor_m2` e `custo_m2` como 0, exigindo preenchimento manual.

## Solucao

### 1. Preco/m2 (valor_m2) -- Calculo direto do lead

Cada produto do lead tem `valor` (valor total em R$) e `medida` (m2). O preco por m2 sera:

```text
valor_m2 = parseFloat(produto.valor) / parseFloat(produto.medida)
```

Se medida = 0 ou valor nao existe, manter valor_m2 = 0.

### 2. Custo/m2 (custo_m2) -- Sugestao historica

Buscar propostas anteriores do usuario que contenham o mesmo tipo de servico e calcular a mediana do custo/m2 historico.

**Query**: Buscar todas as propostas do usuario com `is_current = true`, extrair do campo JSON `servicos` os registros onde `tipo` bata com o tipo sendo importado, coletar os valores de `custo_m2`, e calcular a mediana.

**Implementacao**: Uma nova query no `ProposalForm` que busca propostas historicas quando o lead e auto-preenchido. A query roda uma vez e gera um mapa `tipo -> mediana_custo_m2`.

### Mudancas Tecnicas

**Arquivo**: `src/components/forms/ProposalForm.tsx`

1. **Nova query** `historicalCosts`: busca propostas do usuario com `is_current = true`, seleciona apenas o campo `servicos`. Processa client-side para criar um mapa de tipo para mediana de custo_m2.

2. **Atualizar o useEffect de auto-fill** (linhas 146-181): ao montar os `servicosPreenchidos` a partir do lead:
   - `valor_m2`: calcular como `valor / medida` (ambos parseFloat do lead)
   - `custo_m2`: buscar do mapa de historico. Se encontrado, usar a mediana. Se nao, manter 0.

3. **Badge visual**: quando custo_m2 for preenchido por sugestao historica, exibir um texto discreto "(sugestao)" ao lado do campo para o usuario saber que pode alterar.

4. Todos os campos permanecem editaveis pelo usuario (nenhuma mudanca em `readOnly`).

## Detalhes da Mediana

Para calcular a mediana de custo por tipo:
- Coletar todos os `custo_m2` > 0 de servicos historicos do mesmo tipo
- Ordenar
- Pegar o valor do meio (ou media dos dois do meio)
- Se nao houver historico para aquele tipo, retornar 0

## O que NAO muda

- Schema do formulario (campos continuam obrigatorios e editaveis)
- Logica de calculo de totais
- Nenhuma alteracao no banco de dados
- Nenhuma alteracao no LeadForm
- Logica de versionamento de propostas
