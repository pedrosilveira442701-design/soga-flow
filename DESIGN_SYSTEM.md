# Só Garagens - Sistema de Design

## Idealização por Jony Ive

Um sistema que expressa precisão, leveza e respeito ao tempo do usuário. Sem ornamentos. Cada pixel aponta para o valor líquido, o verdadeiro coração do negócio.

---

## 1. Princípios

- **Clareza radical** — hierarquia tipográfica e espaços generosos. Nada disputa atenção com o dado essencial.
- **Material honesto** — cores neutras, superfícies claras, sombras sutis; componentes assumem sua função sem simular o físico.
- **Silêncio funcional** — a interface é discreta para que conteúdo e decisões ocupem o palco.

---

## 2. Identidade Visual

### Personalidade
Confiável, técnica, humana.

### Paleta de Cores

#### Cores Primárias
```
Primária (Ação):       #2E90FA
Hover:                 #1570EF
Focus Ring:            #84CAFF
Ênfase Valor Líquido:  #12B76A
```

#### Cores de Custo/Neutros
```
Ink (Texto Principal): #0F172A
Gray 900:              #111827
Gray 600:              #6B7280
Gray 400:              #9CA3AF
Gray 200:              #E5E7EB
Gray 50:               #F9FAFB
Surface:               #FFFFFF
```

#### Cores de Estado
```
Erro:     #F04438
Atenção:  #FDB022
Info:     #2E90FA
```

### Conversão HSL (para CSS Variables)
```css
--brand-primary: 210 92% 57%;        /* #2E90FA */
--brand-primary-hover: 210 92% 48%;  /* #1570EF */
--brand-ring: 210 92% 76%;           /* #84CAFF */
--brand-liquid: 145 63% 39%;         /* #12B76A */
--brand-cost: 220 9% 66%;            /* #9CA3AF */
--brand-danger: 4 90% 58%;           /* #F04438 */
--brand-warn: 36 96% 57%;            /* #FDB022 */
--brand-ink: 222 47% 11%;            /* #0F172A */
```

---

## 3. Tipografia

### Fonte Principal
**SF Pro Text** / fallback: `-apple-system, BlinkMacSystemFont, Inter, Roboto, "Helvetica Neue", Arial, sans-serif`

### Escala Tipográfica

| Classe      | Tamanho/Altura | Peso      | Uso                           |
|-------------|----------------|-----------|-------------------------------|
| `.text-h1`  | 32px/38px      | Semibold  | Títulos principais            |
| `.text-h2`  | 24px/30px      | Semibold  | Subtítulos de seção           |
| `.text-h3`  | 20px/28px      | Medium    | Cabeçalhos de card            |
| `.text-body`| 16px/24px      | Regular   | Texto padrão                  |
| `.text-caption` | 13px/18px  | Regular   | Legendas, metadados           |
| `.text-kpi` | —              | 600       | Números (com `tabular-nums`)  |

### Ícones
- **Stroke width:** 1.5px
- **Biblioteca:** Lucide React
- **Cor padrão:** `hsl(var(--brand-ink) / 0.6)`
- **Classe:** `.icon-thin`

---

## 4. Espaçamento & Grid

### Escala de Espaçamento
```
4, 8, 12, 16, 24, 32, 48px
```

### Grid
- **12 colunas**
- **Gutter:** 24px

---

## 5. Cantos & Sombras

### Border Radius
```
sm:   8px
md:   12px
lg:   16px  (base)
xl:   16px
2xl:  16px
3xl:  24px
```

### Sombras
```css
--shadow-elev1: 0 1px 2px rgba(16,24,40,.06);
--shadow-elev2: 0 4px 10px rgba(16,24,40,.08);
```

---

## 6. Componentes Nucleares

### KPI Card
**Arquivo:** `src/components/kpi/KPICard.tsx`

Características:
- Título pequeno (`.text-caption`)
- Valor grande com `tabular-nums` e peso 600
- Delta com ▲/▼ em 12px com cor de estado
- Variante `liquid` usa cor verde #12B76A
- Box com `shadow-elev1` e `hover:shadow-elev2`

**Exemplo de Uso:**
```tsx
<KPICard
  title="Valor Líquido"
  value="R$ 92.700"
  delta={{ value: "+15%", direction: "up" }}
  variant="liquid"
  icon={Target}
/>
```

### Tabela
**Arquivo:** `src/components/ui/table.tsx`

Características:
- Cabeçalho sticky
- Densidade confortável
- Sort por coluna (cursor pointer)
- Células de valor com alinhamento à direita
- Tags/badges para status

### Formulário de Proposta
**Arquivo:** `src/components/forms/ProposalForm.tsx`

Características:
- Multi-seção com títulos H3
- Validação inline (Zod + React Hook Form)
- Campos monetários com máscara
- Prévia de Total/Custo/Líquido/Margem em tempo real
- Animação fade-up quando valores mudam

### Cartão Kanban
**Arquivo:** `src/components/kanban/KanbanCard.tsx`

Layout:
- Linha 1: Nome cliente + idade interação ("há 2d")
- Linha 2: Valor estimado + tag tipo piso
- Rodapé: ações rápidas (WhatsApp, anexo, tarefa) + avatar
- Animação snap ao fazer drop (Framer Motion)

### Empty State
**Arquivo:** `src/components/states/EmptyState.tsx`

Características:
- Ilustração monocromática (Lucide icon grande)
- Texto objetivo
- CTA único e claro

### Error Message
**Arquivo:** `src/components/feedback/ErrorMessage.tsx`

Características:
- Ícone de alerta
- Mensagem específica (nunca genérica)
- Ação de recuperação clara
- Animação shake

---

## 7. Layouts Nucleares

### App Shell
- **Navegação lateral:** 80px colapsada, 240px expandida (fixa à esquerda)
- **Topo:** busca, filtros globais (período/responsável) à direita
- **Transição:** 220ms cubic-bezier(0.4, 0, 0.2, 1)

### Dashboard
- **Faixa superior:** 4-6 KPI Cards (Bruto, Custo, **Líquido**, Margem%, A Receber)
- **Abaixo:** gráficos (tempo e funil)
- **Rodapé:** tabelas

### Detalhes (Cliente/Lead/Proposta/Contrato)
**Arquivo:** `src/components/layout/DetailLayout.tsx`

Layout em 2 painéis:
- **Esquerda (70%):** conteúdo principal
- **Direita (30%):** sumário financeiro fixo, destacando Valor Líquido

---

## 8. Microinterações & Movimento

### Durações
- Padrão: **150-220ms**
- Easing: `cubic-bezier(0.4, 0.0, 0.2, 1)`

### Animações Disponíveis

#### Fade Up
```tsx
<motion.div
  initial={{ opacity: 0, y: 5 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.15 }}
>
```

#### Shake (Erros)
```css
.animate-shake
```

#### Snap (Kanban)
```tsx
<motion.div
  whileHover={{ scale: 1.02 }}
  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
>
```

---

## 9. Visualização de Dados

### Cores por Métrica
- **Bruto:** #2E90FA
- **Custo:** #9CA3AF
- **Líquido:** #12B76A
- **A Receber:** #FDB022
- **Em atraso:** #F04438

### Características
- Linhas 2px
- Grade mínima (20% opacidade)
- Tooltips com contraste alto
- Legenda clicável (toggle séries)

### Componentes
- **TimelineChart:** `src/components/charts/TimelineChart.tsx`
- **FunnelChart:** `src/components/charts/FunnelChart.tsx`

---

## 10. Acessibilidade

### Contraste
- **AA mínimo** para todo texto
- **AAA** para texto crítico (valores, CTAs)

### Focus Ring
```css
*:focus-visible {
  outline: 2px solid hsl(var(--brand-ring));
  outline-offset: 2px;
  border-radius: 4px;
}
```

### Alvos de Toque
- Mínimo **44×44px**

### Navegação por Teclado
- Kanban: Tab entre cards, Enter para abrir, Esc para fechar
- Tabelas: Arrow keys para navegar células
- Formulários: Tab order lógico

---

## 11. Estados

### Empty States
Usar componente `EmptyState` com:
- Ilustração monocromática
- Texto objetivo
- CTA único

### Loading
- Preferir **skeletons lineares** a spinners
- Evitar spinners prolongados

### Erro
Usar componente `ErrorMessage` com:
- Mensagem específica
- Ação de recuperação
- Animação shake

---

## 12. Padrões de Cópia (Voz)

- **Tom:** Claro, direto, educado
- **Exemplos:** "Proposta enviada", "Falamos com você em breve?", "Valor líquido atualizado"
- **Jargão:** Evitar; sempre explicitar siglas na primeira aparição

---

## 13. Como Usar no Código

### Cores
Sempre usar tokens semânticos:
```tsx
// ❌ ERRADO
<div className="text-white bg-blue-500">

// ✅ CORRETO
<div className="text-primary-foreground bg-primary">
<div style={{ color: '#12B76A' }}> // Apenas quando for brand-liquid específico
```

### Tipografia
```tsx
<h1 className="text-h1">Dashboard</h1>
<h2 className="text-h2">Seção</h2>
<h3 className="text-h3">Card</h3>
<p className="text-body">Texto</p>
<span className="text-caption">Legenda</span>
<span className="text-kpi">42.500</span>
```

### Ícones
```tsx
<Icon className="icon-thin" strokeWidth={1.5} />
```

### Animações
```tsx
// Fade up em cálculos
<motion.div
  key={valor}
  initial={{ opacity: 0, y: 5 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.15 }}
>

// Shake em erro
<div className="animate-shake">
```

---

## 14. Checklist de Implementação

- [x] Design tokens no `tailwind.config.ts`
- [x] CSS variables no `src/index.css`
- [x] Classes utilitárias de tipografia
- [x] Fonte Inter configurada (fallback para SF Pro)
- [x] Componente KPICard
- [x] Componente EmptyState
- [x] Componente ErrorMessage
- [x] Componente TimelineChart
- [x] Componente FunnelChart
- [x] Componente DetailLayout
- [x] Componente KanbanCard
- [x] Componente ProposalForm
- [x] Componente DragDropUpload
- [x] AppSidebar atualizado
- [x] Dashboard atualizado
- [x] Tabela com sticky header
- [x] Focus ring global
- [x] Framer Motion instalado

---

## 15. Próximos Passos

1. **Implementar página de Leads com Kanban**
2. **Implementar CRUD de Clientes**
3. **Implementar página de Propostas com o ProposalForm**
4. **Adicionar filtros globais no DashboardLayout**
5. **Criar página de detalhes de Cliente usando DetailLayout**
6. **Implementar upload de arquivos com DragDropUpload**
7. **Adicionar estados de loading com skeletons**
8. **Criar variantes de botões específicas do design system**

---

## 16. Botões de Ação - Padrão de Implementação

### Nova Variante: size="action"

**Especificações:**
- Altura: 48px (h-12)
- Padding: px-6 py-3
- Border radius: rounded-xl (16px)
- Font size: text-base (16px)
- Gap entre ícone e texto: 12px (gap-3)
- Ícones: h-6 w-6 (24px) - 50% maiores para melhor visibilidade

### Mudança Estrutural

**Removido:** `[&_svg]:size-4` do buttonVariants
**Motivo:** Permitir ícones customizáveis sem restrições de tamanho

### Padrões de Uso

**Botões de Ação Principais (Ver, Editar):**
```tsx
<Button variant="default" size="action" onClick={handleView}>
  <Eye className="h-6 w-6" />
  Ver
</Button>

<Button variant="default" size="action" onClick={handleEdit}>
  <Pencil className="h-6 w-6" />
  Editar
</Button>
```

**Botões de Ação Destrutivos (Excluir, Cancelar):**
```tsx
<Button 
  variant="outline" 
  size="action"
  className="border-2 border-destructive text-destructive hover:bg-destructive/10"
  onClick={handleDelete}
>
  <Trash2 className="h-6 w-6" />
  Excluir
</Button>

<Button 
  variant="outline" 
  size="action"
  className="border-2 border-primary text-primary hover:bg-primary/10"
  onClick={handleCancel}
>
  <X className="h-6 w-6" />
  Cancelar
</Button>
```

**Layout em Tabelas:**
```tsx
<TableCell className="text-right">
  <div className="flex justify-end gap-2 flex-wrap">
    {/* Botões de ação */}
  </div>
</TableCell>
```

### Páginas Padronizadas

✅ **Contratos** - Botões inline: Ver, Editar, Cancelar
✅ **Propostas** - Botões inline: Ver, Excluir
✅ **Clientes** - Botões inline: Ver, Editar, WhatsApp, Deletar
✅ **Visitas** - Cards com dropdown menu mantido
✅ **Obras** - Cards clicáveis
✅ **Financeiro** - Tabela sem ações diretas

### Benefícios da Padronização

1. **Visibilidade:** Ícones 50% maiores (24px vs 16px)
2. **Acessibilidade:** Alvos de toque de 48px seguem Lei de Fitts
3. **Consistência:** Mesmo padrão visual em todo o sistema
4. **UX Profissional:** Botões maiores e mais claros
5. **Responsivo:** flex-wrap permite adaptação em mobile

---

Este documento é vivo e deve ser atualizado conforme o sistema evolui.
