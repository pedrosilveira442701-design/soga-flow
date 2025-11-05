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

  return (
    <Sidebar className={`border-r border-sidebar-border transition-all duration-200 ${open ? "w-60" : "w-20"}`}>
      <SidebarContent>
        <div className="px-6 py-5">
          <h1 className={`text-h3 text-primary transition-opacity duration-200 ${!open && "opacity-0"}`}>
            Só Garagens
          </h1>
        </div>

        <SidebarGroup>
          {open && <SidebarGroupLabel className="text-caption">Navegação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                          isActive
                            ? "bg-primary text-primary-foreground font-medium"
                            : "hover:bg-sidebar-accent"
                        }`}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
                        {open && <span className="text-body">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 space-y-3">
          {open && (
            <div className="text-caption text-muted-foreground truncate">
              {user?.email}
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start" 
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
            {open && <span className="ml-2">Sair</span>}
          </Button>
          {open && (
            <div className="text-[11px] text-muted-foreground">
              v1.0.0
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
