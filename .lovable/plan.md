

# Plano: Migrar Sidebar para Topbar Premium com Glassmorphism

## Resumo

Substituir a navegacao lateral (sidebar) por uma topbar horizontal fixa no topo com visual translucido (glassmorphism), mantendo todas as rotas, links, badges e funcionalidades existentes. Em mobile, a topbar compacta com menu drawer.

---

## Arquitetura da Mudanca

```text
ANTES:
+----------+---------------------------+
|          |  Header (trigger + bell)  |
| Sidebar  +---------------------------+
|  240px   |                           |
|          |     Main Content          |
|          |                           |
+----------+---------------------------+

DEPOIS:
+-------------------------------------------+
|  Logo | Nav links...  | Search Bell User  |  <- Topbar fixa (h-16)
+-------------------------------------------+
|                                           |
|            Main Content                   |
|         (padding-top para topbar)         |
|                                           |
+-------------------------------------------+

MOBILE:
+-------------------------------------------+
|  Logo           | Search  Bell  Hamburger |  <- Topbar compacta
+-------------------------------------------+
|            Main Content                   |
+-------------------------------------------+

  [Sheet/Drawer com nav completa ao clicar hamburger]
```

---

## Arquivos a Criar

### 1. `src/components/layout/Topbar.tsx` (novo)

Componente principal da topbar com:

- **Container**: `fixed top-0 w-full z-50 h-16`
- **Glassmorphism**: `backdrop-blur-xl bg-card/70 dark:bg-card/50 border-b border-border/50`
- **Sombra ao scroll**: Hook `useScrolled()` que adiciona `shadow-elev2` quando `scrollY > 0`
- **Esquerda**: Logo (imagem existente + texto "So Garagens")
- **Centro**: Links de navegacao horizontais (os 14 itens do menu atual agrupados em categorias com dropdowns)
- **Direita**: SearchCommand (botao icone), NotificationBell, UserMenu (avatar dropdown)

**Agrupamento dos links** (para caber na topbar):

| Grupo | Itens |
|-------|-------|
| Link direto | Dashboard |
| Dropdown "Comercial" | Leads, Propostas, Contratos, Clientes |
| Dropdown "Operacao" | Obras, Visitas, Anotacoes |
| Dropdown "Financeiro" | Financeiro, Metas |
| Dropdown "Analise" | Analytics, Relatorios |
| Link direto | Arquivos |

Cada dropdown usa `NavigationMenu` do Radix (ja instalado) com estilo translucido.

### 2. `src/components/layout/TopbarMobile.tsx` (novo)

Versao mobile (< 768px):

- Logo + botao de busca + NotificationBell + botao hamburger (Menu icon)
- Ao clicar hamburger: `Sheet` lateral com lista completa de navegacao
- Reutiliza os mesmos menuItems e badges do AppSidebar atual

---

## Arquivos a Modificar

### 3. `src/components/layout/DashboardLayout.tsx`

**Antes**: SidebarProvider + AppSidebar + header com SidebarTrigger

**Depois**: Remove SidebarProvider e AppSidebar. Usa Topbar + conteudo com `pt-16` (padding-top para compensar topbar fixa).

```typescript
export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      <main className="pt-16 p-6">
        {children}
      </main>
    </div>
  );
}
```

### 4. `src/components/sidebar/UserMenu.tsx`

Remover a prop `collapsed` e simplificar para uma unica versao (sempre mostra avatar compacto com dropdown). O dropdown mantem: Perfil, Preferencias, Notificacoes, Ajuda, ThemeToggle, Sair.

### 5. `src/components/sidebar/SearchCommand.tsx`

Adaptar o botao trigger para funcionar como icone na topbar (sem a barra de texto "Buscar..."). No mobile, tambem aparece como icone. O dialog de busca (CommandDialog) permanece igual.

### 6. `src/index.css`

Adicionar variaveis CSS para a topbar:

```css
--topbar-height: 64px;
--topbar-bg: hsl(var(--card) / 0.7);
--topbar-bg-dark: hsl(var(--card) / 0.5);
```

---

## Detalhes do Visual Glassmorphism

| Propriedade | Valor Light | Valor Dark |
|-------------|-------------|------------|
| Background | `bg-card/70` | `bg-card/50` |
| Backdrop blur | `backdrop-blur-xl` | `backdrop-blur-xl` |
| Borda inferior | `border-b border-border/50` | `border-b border-border/30` |
| Sombra (scroll) | `shadow-elev2` | `shadow-elev2` |
| Texto | `text-foreground` | `text-foreground` |

Os dropdowns de navegacao tambem terao efeito glassmorphism nos paineis abertos.

---

## Comportamento de Scroll

```typescript
function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return scrolled;
}
```

Quando `scrolled = true`, adiciona `shadow-elev2` e aumenta levemente a opacidade do fundo para reforcar separacao.

---

## Item Ativo na Navegacao

- Link ativo recebe: fundo sutil (`bg-primary/10`), texto na cor primary, indicador inferior (barra de 2px na base do link)
- Para dropdowns: se qualquer rota filha estiver ativa, o label do grupo fica destacado

---

## Responsividade

| Breakpoint | Comportamento |
|------------|---------------|
| >= 1024px (lg) | Topbar completa com links agrupados em dropdowns |
| 768-1023px (md) | Topbar com menos labels, mais icones |
| < 768px | Logo + icones (busca, bell) + hamburger. Nav em Sheet |

---

## Arquivos que NAO mudam

- Todas as 15+ paginas (Dashboard, Leads, Propostas, etc.) - nenhuma alteracao
- `src/App.tsx` - rotas permanecem identicas, DashboardLayout continua wrapping
- Hooks, contextos, logica de negocio - zero impacto

---

## O que sera removido/arquivado

- `src/components/AppSidebar.tsx` - substituido pela Topbar
- Componente `SidebarTrigger` no header - nao mais necessario
- As variaveis CSS `--sidebar-*` podem ser mantidas (nao causam conflito)

---

## Resumo de Entregas

| # | Acao | Tipo |
|---|------|------|
| 1 | Criar `Topbar.tsx` com glassmorphism, dropdowns, scroll shadow | Novo arquivo |
| 2 | Criar `TopbarMobile.tsx` com Sheet drawer | Novo arquivo |
| 3 | Atualizar `DashboardLayout.tsx` para usar Topbar | Edicao |
| 4 | Adaptar `UserMenu.tsx` para formato topbar | Edicao |
| 5 | Adaptar `SearchCommand.tsx` para icone compacto | Edicao |
| 6 | Adicionar variaveis CSS topbar em `index.css` | Edicao |
| 7 | Remover `AppSidebar.tsx` (substituido) | Remocao |

