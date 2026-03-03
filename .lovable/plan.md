

# Cronograma de Recebíveis (Negociação de Margem)

## Problema

Hoje a margem é calculada uniformemente como percentual de cada parcela do cliente. O usuário precisa poder negociar com sua célula de custos um cronograma próprio de recebimentos da margem, independente do cronograma do cliente. Ex: margem total R$3.000, receber R$2.000 na primeira e R$1.000 na segunda.

## Solução

Criar uma seção "Recebíveis" dentro do detalhe do contrato, com um cronograma editável de recebimentos da margem, totalmente independente das parcelas do cliente.

## Mudanças

### 1. Nova tabela `contrato_recebiveis` (migration)

```sql
CREATE TABLE public.contrato_recebiveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  numero integer NOT NULL,
  valor numeric NOT NULL,
  vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'pendente', -- pendente | recebido
  data_recebimento date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contrato_recebiveis ENABLE ROW LEVEL SECURITY;

-- RLS policies (CRUD para o próprio usuário)
CREATE POLICY "Users can view own recebiveis" ON contrato_recebiveis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own recebiveis" ON contrato_recebiveis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recebiveis" ON contrato_recebiveis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recebiveis" ON contrato_recebiveis FOR DELETE USING (auth.uid() = user_id);
```

### 2. Novo hook `src/hooks/useRecebiveis.tsx`

CRUD simples para a tabela `contrato_recebiveis`, similar ao `useParcelas`:
- Listar por `contrato_id`
- Adicionar recebível
- Editar valor/vencimento
- Marcar como recebido
- Excluir

### 3. Novo componente `src/components/contratos/RecebiveisManager.tsx`

Seção que aparece abaixo das parcelas no `ContratoDetailsDialog`:
- Tabela com colunas: Nº, Vencimento, Valor, Status, Data Recebimento, Ações
- Botão "Adicionar Recebível"
- Botão "Gerar automático" que divide a margem total igualmente em N parcelas
- Footer com: Total Recebíveis, Total Recebido, Pendente, e alerta se soma ≠ margem total
- Editar e excluir em cada linha (mesma UX das parcelas)
- Marcar como "Recebido" com data

### 4. Integrar no `ContratoDetailsDialog.tsx`

Adicionar o `<RecebiveisManager>` abaixo do `<ParcelasManager>`, passando `contratoId`, `margemTotal` (valor_negociado * margem_pct / 100).

## Comportamento

- Contratos antigos: seção aparece vazia, usuário pode adicionar recebíveis a qualquer momento
- Se soma dos recebíveis ≠ margem total, exibir alerta amarelo informativo (não bloqueante)
- Todos os campos são editáveis pelo usuário
- Independente das parcelas do cliente (são dois cronogramas separados)

## O que NÃO muda

- Parcelas do cliente (cronograma existente)
- Cálculo de margem percentual
- Financeiro
- Forecast
- Nenhum componente existente é alterado além do `ContratoDetailsDialog`

## Arquivos

| # | Arquivo | Ação |
|---|---------|------|
| 1 | Migration SQL | Criar tabela `contrato_recebiveis` |
| 2 | `src/hooks/useRecebiveis.tsx` | Novo hook CRUD |
| 3 | `src/components/contratos/RecebiveisManager.tsx` | Novo componente |
| 4 | `src/components/contratos/ContratoDetailsDialog.tsx` | Incluir RecebiveisManager |

