

# Corrigir Posicionamento dos Dropdowns do Menu

## Problema

O componente `NavigationMenu` do Radix usa um **viewport compartilhado** (`NavigationMenuViewport`) que e posicionado com `absolute left-0 top-full` relativo ao root do menu. Isso faz com que todos os dropdowns aparecam alinhados a esquerda, independente de qual trigger foi clicado (ex: clicar em "Analise" abre o dropdown embaixo de "Comercial").

## Solucao

Trocar a estrategia de posicionamento: em vez de usar o viewport compartilhado do Radix, fazer cada `NavigationMenuContent` renderizar posicionado diretamente abaixo do seu proprio trigger (`NavigationMenuItem`).

## Mudancas Tecnicas

### 1. `src/components/ui/navigation-menu.tsx`

- Remover o `<NavigationMenuViewport />` que e auto-incluido dentro do componente `NavigationMenu`
- Isso fara com que o conteudo renderize diretamente no DOM em vez de ser teleportado para o viewport compartilhado

Mudanca concreta:
```text
// ANTES (inclui viewport automaticamente)
<NavigationMenuPrimitive.Root ...>
  {children}
  <NavigationMenuViewport />
</NavigationMenuPrimitive.Root>

// DEPOIS (sem viewport, conteudo renderiza in-place)
<NavigationMenuPrimitive.Root ...>
  {children}
</NavigationMenuPrimitive.Root>
```

### 2. `src/components/layout/Topbar.tsx`

- Adicionar `position: relative` ao `NavigationMenuItem` de cada grupo dropdown
- Ajustar o `NavigationMenuContent` para usar posicionamento absoluto relativo ao seu pai (`top-full left-0` ou `left-1/2 -translate-x-1/2` para centralizar)
- Garantir `z-50` no conteudo para nao ficar atras de outros elementos

Mudanca no `NavigationMenuContent`:
```text
// Adicionar classes de posicionamento direto
className="absolute top-full left-1/2 -translate-x-1/2 mt-2 ..."
```

E no `NavigationMenuItem` pai:
```text
<NavigationMenuItem key={group.label} className="relative">
```

## Resultado

- Cada dropdown aparecera centralizado abaixo do seu proprio trigger
- "Comercial" -> dropdown abaixo de "Comercial"
- "Analise" -> dropdown abaixo de "Analise"
- Animacoes de abertura/fechamento continuam funcionando

## Arquivos

| # | Arquivo | Acao |
|---|---------|------|
| 1 | `src/components/ui/navigation-menu.tsx` | Remover auto-include do `NavigationMenuViewport` |
| 2 | `src/components/layout/Topbar.tsx` | Posicionar cada dropdown relativo ao seu trigger |

