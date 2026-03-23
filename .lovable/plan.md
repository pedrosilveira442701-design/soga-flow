

# Melhorar Visualização do Formulário de Contratos

## Problema
O formulário de contratos (`ContratoForm.tsx`) tem ícones pequenos, campos de input com altura insuficiente e espaçamento apertado, dificultando a escrita e leitura.

## Mudanças

### 1. Aumentar altura dos inputs e textareas globalmente
- **`src/components/ui/input.tsx`**: Aumentar de `h-10` para `h-12`, garantindo mais espaço para digitação
- **`src/components/ui/textarea.tsx`**: Aumentar `min-h` de `80px` para `120px`

### 2. Melhorar espaçamento no formulário de contratos
- **`src/components/forms/ContratoForm.tsx`**:
  - Aumentar gap entre campos de `space-y-4` para `space-y-5`
  - Aumentar padding das seções "Entrada" e "Parcelas" de `p-4` para `p-5`
  - Aumentar título da seção de `text-sm` para `text-base`
  - Garantir ícones com mínimo `h-5 w-5`
  - Aumentar espaçamento geral do form de `space-y-6` para `space-y-8`

### 3. Melhorar SelectTrigger
- **`src/components/ui/select.tsx`**: Aumentar altura do SelectTrigger de `h-10` para `h-12`

### 4. Labels mais legíveis
- **`src/components/ui/label.tsx`**: Nenhuma mudança necessária (já está `text-sm font-medium`)

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/components/ui/input.tsx` | `h-10` → `h-12` |
| `src/components/ui/textarea.tsx` | `min-h-[80px]` → `min-h-[120px]` |
| `src/components/ui/select.tsx` | SelectTrigger `h-10` → `h-12` |
| `src/components/forms/ContratoForm.tsx` | Espaçamentos maiores, títulos de seção maiores |

