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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    label: "Operacao",
    items: [
      { title: "Obras", url: "/obras", icon: Building2 },
      { title: "Visitas", url: "/visitas", icon: Calendar },
      { title: "Anotacoes", url: "/anotacoes", icon: StickyNote },
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
    label: "Analise",
    items: [
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Forecast", url: "/forecast", icon: TrendingUp },
      { title: "Relatorios", url: "/relatorios", icon: FileBarChart },
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
        "fixed top-0 w-full z-50 h-14 flex items-center px-5 transition-all duration-300",
        "backdrop-blur-2xl backdrop-saturate-150 border-b",
        "bg-card/75 dark:bg-card/60 border-border/30",
        scrolled && "shadow-elev1 bg-card/85 dark:bg-card/70"
      )}
    >
      {/* Left: Logo */}
      <NavLink to="/" className="flex items-center gap-2.5 mr-6 shrink-0">
        <img src={logoImage} alt="So Garagens" className="h-10 w-10 object-contain" />
        <span className="text-[15px] font-semibold text-foreground hidden lg:inline tracking-tight">So Garagens</span>
      </NavLink>

      {/* Center: Navigation */}
      <NavigationMenu className="flex-1 hidden md:flex">
        <NavigationMenuList className="gap-0.5">
          {/* Dashboard direct link */}
          {directLinks.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <NavigationMenuItem key={item.url}>
                <NavLink
                  to={item.url}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-all relative",
                    "hover:bg-foreground/[0.04]",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2 : 1.75} />
                  <span className="hidden lg:inline">{item.title}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full" />
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
                    "h-9 px-3 text-[13px] font-medium bg-transparent hover:bg-foreground/[0.04] data-[state=open]:bg-foreground/[0.06] rounded-lg relative",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <span>{group.label}</span>
                  {groupHasBadge && (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-destructive inline-block" />
                  )}
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full" />
                  )}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 backdrop-blur-2xl bg-card/95 dark:bg-card/90 border border-border/40 rounded-xl p-1.5 min-w-[200px] shadow-elev3">
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.url;
                      const badge = getBadge(item.title);
                      return (
                        <li key={item.url}>
                          <NavLink
                            to={item.url}
                            className={cn(
                              "flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] transition-colors",
                              "hover:bg-foreground/[0.04]",
                              isActive ? "bg-primary/8 text-primary font-medium" : "text-foreground/70"
                            )}
                          >
                            <div className={cn(
                              "p-1.5 rounded-md shrink-0 transition-colors",
                              isActive ? "bg-primary/10" : "bg-foreground/[0.06]"
                            )}>
                              <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2 : 1.75} />
                            </div>
                            <span className="flex-1">{item.title}</span>
                            {badge && (
                              <Badge variant={badge.variant} className="h-5 min-w-[20px] px-1.5 text-[11px]">
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
                    "inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-all relative",
                    "hover:bg-foreground/[0.04]",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2 : 1.75} />
                  <span className="hidden lg:inline">{item.title}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full" />
                  )}
                </NavLink>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 ml-auto shrink-0">
        <SearchCommand />
        <NotificationBell />
        <div className="ml-0.5">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
