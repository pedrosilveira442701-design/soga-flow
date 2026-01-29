
# Plano: Versionamento de Propostas

## Resumo Executivo

Implementar um sistema de versionamento de propostas que mantém histórico completo de todas as versões, permitindo rastrear mudanças de escopo/valores ao longo do ciclo de vendas sem perder dados históricos.

---

## Análise do Cenário Atual

### Dados Existentes
- 78 propostas no sistema (77 clientes distintos)
- Distribuicao: 9 abertas, 16 fechadas, 36 perdidas, 17 em repouso
- Propostas fechadas podem ter contratos vinculados

### Problema Central
Quando se edita uma proposta existente, o sistema sobrescreve os dados antigos, perdendo:
- Histórico de valores/condições anteriores
- Rastreabilidade de mudanças de escopo
- Métricas reais de "propostas geradas" vs "retrabalho"

---

## Arquitetura Proposta

### Abordagem: Proposta Group + Versões Imutáveis

```text
proposal_group (oportunidade)
    ├── proposta V1 (imutável após V2)
    ├── proposta V2 (imutável após V3)
    └── proposta V3 (versão ativa)
```

**Por que esta abordagem?**
- Mantém compatibilidade com contratos existentes (proposta_id continua válido)
- Permite navegação entre versões
- KPIs claros: V1 = nova oportunidade, V2+ = retrabalho
- Evita duplicação excessiva de dados na mesma linha

---

## Alterações no Banco de Dados

### Novos Campos na Tabela `propostas`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `proposal_group_id` | uuid | ID do grupo/oportunidade |
| `version_number` | integer | Número da versão (1, 2, 3...) |
| `previous_version_id` | uuid | Link para versão anterior |
| `changed_reason` | text | Motivo da mudança (dropdown) |
| `changed_reason_detail` | text | Detalhes adicionais |
| `is_current` | boolean | Se é a versão ativa |
| `replaced_by_id` | uuid | ID da versão que substituiu |
| `replaced_at` | timestamptz | Data da substituição |

### Nova Enum `proposal_change_reason`

```sql
CREATE TYPE proposal_change_reason AS ENUM (
  'mudanca_escopo',      -- Cliente alterou produtos/serviços
  'reajuste_preco',      -- Ajuste de valores
  'correcao_erro',       -- Correção de erro de cálculo
  'nova_condicao',       -- Novas condições comerciais
  'desconto_adicional',  -- Desconto negociado
  'atualizacao_dados',   -- Dados do cliente/obra
  'outro'                -- Outro motivo
);
```

### Migração de Dados Existentes

```sql
-- Propostas existentes viram V1 com group_id = id
UPDATE propostas SET
  proposal_group_id = id,
  version_number = 1,
  is_current = true
WHERE proposal_group_id IS NULL;
```

---

## Novos Status

Proposta de enum de status atualizado:

| Status | Descrição | Pode editar? |
|--------|-----------|--------------|
| `aberta` | Nova proposta | Sim (cria versão) |
| `enviada` | Enviada ao cliente | Não (criar versão) |
| `aceita` | Cliente aceitou | Não (criar versão) |
| `recusada` | Cliente recusou | Não (apenas consulta) |
| `cancelada` | Cancelada internamente | Não |
| `substituida` | Substituída por nova versão | Não |
| `repouso` | Em espera | Não (criar versão) |
| `fechada` | Converteu em contrato | Não |

---

## Fluxo de Usuário

### Cenário 1: Criar Nova Proposta
1. Usuário abre formulário de nova proposta
2. Sistema cria registro com `version_number=1`, `is_current=true`
3. `proposal_group_id` recebe o próprio `id`

### Cenário 2: Editar Proposta (Criar Nova Versão)
1. Usuário clica em "Editar" numa proposta existente
2. Sistema detecta se há mudança material (serviços, valores, custos, desconto)
3. Se houver mudança material:
   - Modal aparece pedindo "Motivo da Mudança"
   - Sistema cria NOVA proposta com:
     - `version_number = anterior + 1`
     - `proposal_group_id = anterior.proposal_group_id`
     - `previous_version_id = anterior.id`
     - `is_current = true`
   - Proposta anterior recebe:
     - `is_current = false`
     - `status = 'substituida'`
     - `replaced_by_id = nova.id`
     - `replaced_at = now()`
4. Se não houver mudança material (só observações, por exemplo):
   - Permite edição simples sem versionar

### Cenário 3: Visualizar Histórico
1. No diálogo de detalhes, aparece seção "Histórico de Versões"
2. Lista todas as versões do mesmo `proposal_group_id`
3. Clicar em versão anterior abre em modo read-only

---

## Alterações no Frontend

### 1. PropostaDetailsDialog
- Exibir badge "V#" no topo
- Nova seção "Histórico de Versões" com lista clicável
- Botão "Criar Nova Versão (V#+1)" quando status permite

### 2. ProposalForm
- Novo modo: `mode = 'create' | 'edit' | 'new_version'`
- Campo obrigatório "Motivo da Mudança" quando `mode = 'new_version'`
- Campo opcional "Detalhes da Mudança"
- Pré-popular com dados da versão anterior

### 3. Página Propostas
- Coluna "Versão" na tabela (V1, V2...)
- Filtro para mostrar apenas versões correntes
- Badge visual diferenciando retrabalho de nova proposta

### 4. Listagem/KPIs
- KPI "Novas Propostas": contar apenas V1
- KPI "Retrabalho": contar V2+
- Gráfico de motivos de mudança mais frequentes

---

## Regras de Negócio Implementadas

1. **Imutabilidade**: Versão anterior fica somente-leitura após substituição
2. **Guardail de edição**: Proposta com status `enviada`, `aceita`, `fechada` bloqueia edição direta
3. **Herança de contrato**: Contrato vinculado permanece na versão original
4. **Auditoria**: `created_at` + `created_by` (user_id) registram quem criou cada versão
5. **Navegabilidade**: `previous_version_id` e `replaced_by_id` permitem ir e voltar no histórico

---

## Detalhes Técnicos

### Hook `usePropostas` - Novas Funções

```typescript
// Criar nova versão
createNewVersion: (previousId: string, data: PropostaUpdate, reason: ChangeReason) => Promise<Proposta>

// Buscar histórico de versões
getVersionHistory: (groupId: string) => Promise<Proposta[]>

// Verificar se pode editar
canEdit: (proposta: Proposta) => boolean
```

### Migration SQL

```sql
-- 1. Criar enum de motivos
CREATE TYPE proposal_change_reason AS ENUM (...);

-- 2. Adicionar colunas
ALTER TABLE propostas ADD COLUMN proposal_group_id uuid;
ALTER TABLE propostas ADD COLUMN version_number integer DEFAULT 1;
ALTER TABLE propostas ADD COLUMN previous_version_id uuid REFERENCES propostas(id);
ALTER TABLE propostas ADD COLUMN replaced_by_id uuid REFERENCES propostas(id);
ALTER TABLE propostas ADD COLUMN replaced_at timestamptz;
ALTER TABLE propostas ADD COLUMN changed_reason text;
ALTER TABLE propostas ADD COLUMN changed_reason_detail text;
ALTER TABLE propostas ADD COLUMN is_current boolean DEFAULT true;

-- 3. Migrar dados existentes
UPDATE propostas SET
  proposal_group_id = id,
  version_number = 1,
  is_current = true
WHERE proposal_group_id IS NULL;

-- 4. Índices
CREATE INDEX idx_propostas_group_id ON propostas(proposal_group_id);
CREATE INDEX idx_propostas_current ON propostas(is_current) WHERE is_current = true;
```

---

## Impacto em Outras Partes do Sistema

### Views Analíticas
- `vw_propostas`: Adicionar `version_number`, `proposal_group_id`
- Filtrar por `is_current = true` em análises padrão

### Relatórios
- Novo relatório: "Propostas Geradas vs Retrabalho"
- Novo relatório: "Motivos de Reemissão por Período"

### Contratos
- Manter compatibilidade: `proposta_id` continua referenciando a versão específica
- Contrato mostra "Proposta V# (de X versões)"

### Leads
- Sincronização de status continua funcionando via `lead_id`

---

## Fases de Implementação

### Fase 1: Banco de Dados
1. Criar migration com novos campos
2. Executar migração de dados existentes
3. Atualizar types.ts

### Fase 2: Hook e Lógica
1. Atualizar `usePropostas` com novas funções
2. Implementar lógica de criação de versão
3. Implementar verificação de mudança material

### Fase 3: UI - Visualização
1. Badge de versão no PropostaDetailsDialog
2. Seção de histórico de versões
3. Modo read-only para versões antigas

### Fase 4: UI - Criação de Versão
1. Modal de motivo da mudança
2. Botão "Criar Nova Versão"
3. ProposalForm em modo versioning

### Fase 5: Listagem e KPIs
1. Coluna versão na tabela
2. Filtros de versão
3. KPIs separados (V1 vs V2+)

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Performance com muitas versões | Índice em `proposal_group_id` + `is_current` |
| Usuário confuso sobre versões | UX clara com badge V#, tooltip explicativo |
| Dados antigos inconsistentes | Migration robusta marcando todas como V1 |
| Contrato órfão | Contrato mantém `proposta_id` original |

---

## Resultado Esperado

**Antes:**
- Editar = sobrescrever dados
- Histórico perdido
- Métricas infladas por retrabalho

**Depois:**
- Editar escopo = criar nova versão
- Histórico completo navegável
- Métricas precisas: V1 = nova oportunidade, V2+ = retrabalho
- Auditoria: quem, quando, por quê
