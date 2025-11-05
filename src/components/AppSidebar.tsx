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
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { motion } from "framer-motion";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
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
  const { signOut, user } = useAuth();

  const getUserInitials = (email?: string) => {
    if (!email) return "U";
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        initial={false}
        animate={{ width: open ? 240 : 80 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <Sidebar className="border-r border-sidebar-border shadow-elev1">
          <SidebarContent className="flex flex-col h-full">
            {/* Logo/Header */}
            <div className="px-16 py-24 flex items-center justify-center">
              {open ? (
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="text-h3 text-brand-primary"
                >
                  Só Garagens
                </motion.h1>
              ) : (
                <div className="text-h3 font-semibold text-brand-primary">SG</div>
              )}
            </div>

            {/* Navigation */}
            <SidebarGroup className="px-12">
              {open && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  <SidebarGroupLabel className="text-caption text-brand-cost px-3 mb-8">
                    Navegação
                  </SidebarGroupLabel>
                </motion.div>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-4">
                  {menuItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    const itemContent = (
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-12 px-12 py-8 rounded-md transition-all duration-200 ${
                          isActive
                            ? "bg-brand-primary text-white shadow-elev2"
                            : "hover:bg-brand-surface hover:shadow-elev1 hover:scale-[1.02]"
                        }`}
                        aria-label={item.title}
                      >
                        <item.icon
                          className={`h-5 w-5 flex-shrink-0 ${
                            isActive ? "opacity-100" : "icon-thin"
                          }`}
                          strokeWidth={1.5}
                        />
                        {open && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            className="text-body"
                          >
                            {item.title}
                          </motion.span>
                        )}
                      </NavLink>
                    );

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          {!open ? (
                            <Tooltip>
                              <TooltipTrigger asChild>{itemContent}</TooltipTrigger>
                              <TooltipContent side="right" className="text-body">
                                {item.title}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            itemContent
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* User Section */}
            <div className="mt-auto p-12 space-y-12 border-t border-sidebar-border">
              {open ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-12"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-[11px] bg-brand-surface text-brand-ink">
                      {getUserInitials(user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-caption text-brand-cost truncate">
                      {user?.email}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex justify-center">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-[11px] bg-brand-surface text-brand-ink">
                      {getUserInitials(user?.email)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}

              {open ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-8 hover:shadow-elev1"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4 flex-shrink-0 icon-thin" strokeWidth={1.5} />
                  <span className="text-body">Sair</span>
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-full hover:shadow-elev1"
                      onClick={() => signOut()}
                      aria-label="Sair"
                    >
                      <LogOut className="h-4 w-4 icon-thin" strokeWidth={1.5} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-body">
                    Sair
                  </TooltipContent>
                </Tooltip>
              )}

              {open && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="text-[11px] text-brand-cost text-center"
                >
                  v1.0.0
                </motion.div>
              )}
            </div>
          </SidebarContent>
        </Sidebar>
      </motion.div>
    </TooltipProvider>
  );
}
