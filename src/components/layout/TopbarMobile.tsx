import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NotificationBell } from "./NotificationBell";
import { SearchCommand } from "@/components/sidebar/SearchCommand";
import { UserMenu } from "@/components/sidebar/UserMenu";
import { allMenuItems } from "./Topbar";
import { cn } from "@/lib/utils";
import logoImage from "@/assets/logo.png";

interface TopbarMobileProps {
  getBadge: (title: string) => { count: number; variant: "destructive" | "secondary" } | null;
}

export function TopbarMobile({ getBadge }: TopbarMobileProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fixed top-0 w-full z-50 h-14 flex items-center px-3 backdrop-blur-xl border-b bg-card/70 dark:bg-card/50 border-border/50 dark:border-border/30">
      {/* Logo */}
      <NavLink to="/" className="flex items-center gap-2 mr-auto">
        <img src={logoImage} alt="Só Garagens" className="h-7 w-7 object-contain" />
        <span className="text-sm font-semibold text-foreground">SG</span>
      </NavLink>

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <SearchCommand />
        <NotificationBell />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0 backdrop-blur-xl bg-card/95 dark:bg-card/90">
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle className="flex items-center gap-2">
                <img src={logoImage} alt="Só Garagens" className="h-7 w-7 object-contain" />
                <span className="text-sm font-semibold">Só Garagens</span>
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col px-2 py-2 gap-0.5 flex-1 overflow-y-auto">
              {allMenuItems.map((item) => {
                const isActive = location.pathname === item.url;
                const badge = getBadge(item.title);
                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      "hover:bg-accent/50",
                      isActive && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2 : 1.5} />
                    <span className="flex-1">{item.title}</span>
                    {badge && (
                      <Badge variant={badge.variant} className="h-5 min-w-[20px] px-1.5 text-xs">
                        {badge.count}
                      </Badge>
                    )}
                  </NavLink>
                );
              })}
            </nav>
            <div className="border-t px-3 py-3">
              <UserMenu />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
