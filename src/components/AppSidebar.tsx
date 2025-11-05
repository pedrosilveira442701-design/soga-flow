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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useMetas } from "@/hooks/useMetas";
import { useVisitas } from "@/hooks/useVisitas";
import { SearchCommand } from "./sidebar/SearchCommand";
import { UserMenu } from "./sidebar/UserMenu";
import { cn } from "@/lib/utils";
import logoImage from "@/assets/logo.png";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Leads", url: "/leads", icon: Target },
  { title: "Propostas", url: "/propostas", icon: FileText },
  { title: "Contratos", url: "/contratos", icon: FileCheck },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Metas", url: "/metas", icon: TrendingUp },
  { title: "Visitas", url: "/visitas", icon: Calendar },
  { title: "Arquivos", url: "/arquivos", icon: FolderOpen },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { kpis } = useFinanceiro();
  const { kpis: metasKpis } = useMetas({ status: 'ativa' });
  const { kpis: visitasKpis } = useVisitas();

  const getBadgeForItem = (title: string) => {
    if (title === "Financeiro" && kpis.atrasadas > 0) {
      return { count: kpis.atrasadas, variant: "destructive" as const };
    }
    if (title === "Metas" && metasKpis.metasEmAlerta > 0) {
      return { count: metasKpis.metasEmAlerta, variant: "destructive" as const };
    }
    if (title === "Visitas" && visitasKpis && (visitasKpis.visitasHoje > 0 || visitasKpis.visitasAtrasadas > 0)) {
      return { count: visitasKpis.visitasHoje + visitasKpis.visitasAtrasadas, variant: "secondary" as const };
    }
    return null;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar 
        collapsible="icon"
        className={cn(
          "border-r bg-sidebar-background transition-all duration-200",
          open ? "w-[280px]" : "w-[72px]"
        )}
      >
        <SidebarContent className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="px-4 py-6 flex items-center justify-center min-h-[72px]">
            <AnimatePresence mode="wait">
              {open ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.16 }}
                  className="flex items-center gap-3"
                >
                  <img 
                    src={logoImage} 
                    alt="Só Garagens Logo" 
                    className="h-10 w-10 object-contain"
                  />
                  <span className="text-lg font-semibold text-foreground">
                    Só Garagens
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.16 }}
                >
                  <img 
                    src={logoImage} 
                    alt="Só Garagens" 
                    className="h-10 w-10 object-contain"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Separator className="opacity-50" />

          {/* Search */}
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.16, delay: 0.05 }}
              className="px-3 py-3"
            >
              <SearchCommand />
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex-1 px-3 py-2 overflow-y-auto">
            <SidebarGroup>
              {open && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.16 }}
                >
                  <SidebarGroupLabel className="text-xs text-muted-foreground px-3 mb-2 uppercase tracking-wider">
                    Navegação
                  </SidebarGroupLabel>
                </motion.div>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {menuItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    const badge = getBadgeForItem(item.title);

                    return (
                      <SidebarMenuItem key={item.title}>
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <NavLink
                              to={item.url}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative group",
                                "hover:bg-sidebar-hover",
                                isActive && "bg-sidebar-active text-sidebar-active-foreground shadow-sm",
                                !isActive && "text-sidebar-foreground",
                                !open && "justify-center"
                              )}
                            >
                              {/* Active Indicator */}
                              {isActive && (
                                <motion.div
                                  layoutId="sidebar-active"
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-active rounded-r-full"
                                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                              )}

                              <item.icon
                                className={cn(
                                  "h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110",
                                  isActive ? "opacity-100" : "opacity-70"
                                )}
                                strokeWidth={isActive ? 2 : 1.5}
                              />
                              
                              {open && (
                                <motion.span
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.16 }}
                                  className="text-sm font-medium flex-1"
                                >
                                  {item.title}
                                </motion.span>
                              )}

                              {open && badge && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                >
                                  <Badge variant={badge.variant} className="h-5 min-w-[20px] px-1.5 text-xs">
                                    {badge.count}
                                  </Badge>
                                </motion.div>
                              )}
                            </NavLink>
                          </TooltipTrigger>
                          {!open && (
                            <TooltipContent side="right" className="flex items-center gap-2">
                              <span>{item.title}</span>
                              {badge && (
                                <Badge variant={badge.variant} className="h-5 min-w-[20px] px-1.5 text-xs">
                                  {badge.count}
                                </Badge>
                              )}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>

          <Separator className="opacity-50" />

          {/* User Section */}
          <div className="p-3 space-y-2">
            <UserMenu collapsed={!open} />
            
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.16, delay: 0.05 }}
                className="text-xs text-muted-foreground text-center pt-2"
              >
                v1.0.0
              </motion.div>
            )}
          </div>
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
}
