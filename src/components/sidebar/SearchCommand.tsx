import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  FileCheck,
  DollarSign,
  TrendingUp,
  Calendar,
  FolderOpen,
  BarChart3,
  Search,
  Building2,
  StickyNote,
  FileBarChart,
} from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Leads", url: "/leads", icon: Target },
  { title: "Propostas", url: "/propostas", icon: FileText },
  { title: "Contratos", url: "/contratos", icon: FileCheck },
  { title: "Obras", url: "/obras", icon: Building2 },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Metas", url: "/metas", icon: TrendingUp },
  { title: "Visitas", url: "/visitas", icon: Calendar },
  { title: "Anotações", url: "/anotacoes", icon: StickyNote },
  { title: "Arquivos", url: "/arquivos", icon: FolderOpen },
];

export function SearchCommand() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-9 w-9"
      >
        <Search className="h-4 w-4" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar páginas..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Navegação">
            {menuItems.map((item) => (
              <CommandItem
                key={item.url}
                value={item.title}
                onSelect={() => handleSelect(item.url)}
                className="flex items-center gap-2"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
