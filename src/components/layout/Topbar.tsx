import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  Building2,
  StickyNote,
  FileBarChart,
  ChevronDown,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "@/components/sidebar/UserMenu";
import { SearchCommand } from "@/components/sidebar/SearchCommand";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useMetas } from "@/hooks/useMetas";
import { useVisitas } from "@/hooks/useVisitas";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import logoImage from "@/assets/logo.png";
import { TopbarMobile } from "./TopbarMobile";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return scrolled;
}

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
}

const directLinks: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
];

const dropdownGroups = [
  {
    label: "Comercial",
    items: [
      { title: "Leads", url: "/leads", icon: Target },
      { title: "Propostas", url: "/propostas", icon: FileText },
      { title: "Contratos", url: "/contratos", icon: FileCheck },
      { title: "Clientes", url: "/clientes", icon: Users },
    ],
  },
  {
    label: "Operação",
    items: [
      { title: "Obras", url: "/obras", icon: Building2 },
      { title: "Visitas", url: "/visitas", icon: Calendar },
      { title: "Anotações", url: "/anotacoes", icon: StickyNote },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Financeiro", url: "/financeiro", icon: DollarSign },
      { title: "Metas", url: "/metas", icon: TrendingUp },
    ],
  },
  {
    label: "Análise",
    items: [
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Forecast", url: "/forecast", icon: TrendingUp },
      { title: "Relatórios", url: "/relatorios", icon: FileBarChart },
    ],
  },
];

const directLinksEnd: NavItem[] = [
  { title: "Arquivos", url: "/arquivos", icon: FolderOpen },
];

export const allMenuItems: NavItem[] = [
  ...directLinks,
  ...dropdownGroups.flatMap((g) => g.items),
  ...directLinksEnd,
];

export function Topbar() {
  const isMobile = useIsMobile();
  const scrolled = useScrolled();
  const location = useLocation();
  const { kpis } = useFinanceiro();
  const { kpis: metasKpis } = useMetas({ status: "ativa" });
  const { kpis: visitasKpis } = useVisitas();

  const getBadge = (title: string) => {
    if (title === "Financeiro" && kpis.atrasadas > 0)
      return { count: kpis.atrasadas, variant: "destructive" as const };
    if (title === "Metas" && metasKpis.metasEmAlerta > 0)
      return { count: metasKpis.metasEmAlerta, variant: "destructive" as const };
    if (title === "Visitas" && visitasKpis && (visitasKpis.visitasHoje > 0 || visitasKpis.visitasAtrasadas > 0))
      return { count: visitasKpis.visitasHoje + visitasKpis.visitasAtrasadas, variant: "secondary" as const };
    return null;
  };

  const isGroupActive = (items: NavItem[]) =>
    items.some((i) => location.pathname === i.url);

  if (isMobile) {
    return <TopbarMobile getBadge={getBadge} />;
  }

  return (
    <header
      className={cn(
        "fixed top-0 w-full z-50 h-[72px] flex items-center px-6 transition-all duration-200",
        "backdrop-blur-xl border-b",
        "bg-card/70 dark:bg-card/50 border-border/50 dark:border-border/30",
        scrolled && "shadow-[var(--shadow-elev2)] bg-card/85 dark:bg-card/65"
      )}
    >
      {/* Left: Logo */}
      <NavLink to="/" className="flex items-center gap-3 mr-8 shrink-0">
        <img src={logoImage} alt="Só Garagens" className="h-9 w-9 object-contain" />
        <span className="text-base font-semibold text-foreground hidden lg:inline">Só Garagens</span>
      </NavLink>

      {/* Center: Navigation */}
      <NavigationMenu className="flex-1 hidden md:flex">
        <NavigationMenuList className="gap-1">
          {/* Dashboard direct link */}
          {directLinks.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <NavigationMenuItem key={item.url}>
                <NavLink
                  to={item.url}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors relative",
                    "hover:bg-accent/50 hover:text-accent-foreground",
                    isActive && "text-primary bg-primary/10"
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
                  <span className="hidden lg:inline">{item.title}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                  )}
                </NavLink>
              </NavigationMenuItem>
            );
          })}

          {/* Dropdown groups */}
          {dropdownGroups.map((group) => {
            const active = isGroupActive(group.items);
            const groupHasBadge = group.items.some((i) => getBadge(i.title));
            return (
              <NavigationMenuItem key={group.label} className="relative">
                <NavigationMenuTrigger
                  className={cn(
                    "h-10 px-4 text-sm font-medium bg-transparent hover:bg-accent/50 data-[state=open]:bg-accent/50 rounded-lg relative",
                    active && "text-primary"
                  )}
                >
                  <span>{group.label}</span>
                  {groupHasBadge && (
                    <span className="ml-1.5 h-2 w-2 rounded-full bg-destructive inline-block" />
                  )}
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                  )}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 backdrop-blur-xl bg-card/95 dark:bg-card/90 border border-border/50 rounded-xl p-2.5 min-w-[220px] shadow-lg">
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.url;
                      const badge = getBadge(item.title);
                      return (
                        <li key={item.url}>
                          <NavLink
                            to={item.url}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                              "hover:bg-accent/50",
                              isActive && "bg-primary/10 text-primary font-medium"
                            )}
                          >
                            <item.icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
                            <span className="flex-1">{item.title}</span>
                            {badge && (
                              <Badge variant={badge.variant} className="h-5 min-w-[20px] px-1.5 text-xs">
                                {badge.count}
                              </Badge>
                            )}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            );
          })}

          {/* Arquivos direct link */}
          {directLinksEnd.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <NavigationMenuItem key={item.url}>
                <NavLink
                  to={item.url}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors relative",
                    "hover:bg-accent/50 hover:text-accent-foreground",
                    isActive && "text-primary bg-primary/10"
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
                  <span className="hidden lg:inline">{item.title}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                  )}
                </NavLink>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <SearchCommand />
        <NotificationBell />
        <div className="ml-1">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
