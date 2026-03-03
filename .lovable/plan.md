

# Melhorar UX dos Recebíveis da Margem

## Problema

A seção "Recebíveis da Margem" está confusa para o usuário. Falta contexto explicativo, o nome é técnico demais, e não fica claro o que são, para que servem, e se estão conectados a outras partes do sistema (financeiro, relatórios).

## Abordagem

Melhorar a UX com foco em clareza, contexto e guia visual, sem alterar a lógica existente.

### Mudanças no `RecebiveisManager.tsx`

1. **Renomear título**: de "Recebíveis da Margem" para **"Meus Recebimentos (Lucro)"** -- linguagem mais próxima do usuário

2. **Adicionar texto explicativo** abaixo do título:
   > "Aqui você define quando vai receber o seu lucro neste contrato. O valor total do seu lucro é {margemTotal}. Divida em parcelas conforme negociado com sua célula de custos."

3. **Simplificar o botão "Gerar automático"**: transformar em um card de ação quando a lista está vazia, tipo onboarding:
   - Card com ícone, texto "Dividir meu lucro em parcelas iguais", input de quantidade e botão "Gerar"
   - Mais intuitivo que botão solto no header

4. **Resumo visual no topo** quando há recebíveis: mostrar uma barra de progresso com "Recebido X de Y" em verde, similar ao progresso de parcelas que já existe acima

5. **Remover a tabela de 6 colunas em telas pequenas** -- usar cards compactos para mobile com as informações essenciais (nº, valor, vencimento, status, ação)

6. **Nota informativa**: adicionar um texto discreto no rodapé:
   > "Estes recebimentos são independentes das parcelas do cliente acima. Alterações aqui não afetam o financeiro do contrato."

### Mudanças no `ContratoDetailsDialog.tsx`

- Envolver a seção de recebíveis em um `Collapsible` com título e badge mostrando status resumido ("3 parcelas · R$ 2.000 recebido"), para reduzir ruído visual quando o usuário não precisa interagir

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/components/contratos/RecebiveisManager.tsx` | Novo título, texto guia, empty state card, barra progresso, nota informativa, layout mobile |
| `src/components/contratos/ContratoDetailsDialog.tsx` | Envolver em Collapsible com resumo |

## O que NÃO muda

- Lógica de CRUD dos recebíveis
- Tabela `contrato_recebiveis`
- Hook `useRecebiveis`
- Financeiro, Forecast, Relatórios
- Parcelas do cliente

