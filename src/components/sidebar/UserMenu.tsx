import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, HelpCircle, LogOut, Bell } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const getUserInitials = (email?: string) => {
    if (!email) return "U";
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center hover:opacity-80 transition-opacity">
          <Avatar className="h-7 w-7">
            <AvatarImage src="" />
            <AvatarFallback className="text-[11px] font-medium bg-primary/10 text-primary">
              {getUserInitials(user?.email)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-52">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-0.5">
            <p className="text-[13px] font-medium">Conta</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/conta/perfil")} className="text-[13px]">
          <User className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/conta/preferencias")} className="text-[13px]">
          <Settings className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Preferencias
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/configuracoes/notificacoes")} className="text-[13px]">
          <Bell className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Notificacoes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/conta/ajuda")} className="text-[13px]">
          <HelpCircle className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Ajuda
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <ThemeToggle />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="text-destructive text-[13px]">
          <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
