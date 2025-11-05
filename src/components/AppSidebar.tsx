import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Kanban,
  FileText,
  FileSignature,
  DollarSign,
  Target,
  Calendar,
  FolderOpen,
} from "lucide-react";
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
  { title: "Leads", url: "/leads", icon: Kanban },
  { title: "Propostas", url: "/propostas", icon: FileText },
  { title: "Contratos", url: "/contratos", icon: FileSignature },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Visitas", url: "/visitas", icon: Calendar },
  { title: "Arquivos", url: "/arquivos", icon: FolderOpen },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="px-6 py-5">
          <h1 className={`font-bold text-xl text-primary transition-opacity ${!open && "opacity-0"}`}>
            Só Garagens
          </h1>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={!open ? "opacity-0" : ""}>
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground font-medium"
                            : "hover:bg-sidebar-accent"
                        }`}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
