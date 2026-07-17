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
import { MobileTopNav } from "./MobileTopNav";
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
    <header className="fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] backdrop-blur-2xl backdrop-saturate-150 border-b bg-card/80 dark:bg-card/65 border-border/30">
      {/* Top row */}
      <div className="h-[56px] flex items-center px-3">
      {/* Logo */}
      <NavLink to="/" className="flex items-center gap-2 mr-auto">
        <img src={logoImage} alt="Só Garagens" className="h-9 w-9 object-contain" />
        <span className="text-[13px] font-semibold text-foreground tracking-tight">SG</span>
      </NavLink>

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <SearchCommand />
        <NotificationBell />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex w-[85vw] max-w-[320px] flex-col p-0 backdrop-blur-2xl bg-card/95 dark:bg-card/90"
          >
            <SheetHeader className="shrink-0 px-4 pt-4 pb-3">
              <SheetTitle className="flex items-center gap-2">
                <img src={logoImage} alt="Só Garagens" className="h-9 w-9 object-contain" />
                <span className="text-[14px] font-semibold tracking-tight">Só Garagens</span>
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col px-2 py-1 gap-0.5 flex-1 overflow-y-auto">
              {allMenuItems.map((item) => {
                const isActive = location.pathname === item.url;
                const badge = getBadge(item.title);
                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-3 rounded-lg text-[15px] min-h-[48px] transition-colors",
                      "hover:bg-foreground/[0.04]",
                      isActive && "bg-primary/8 text-primary font-medium"
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2 : 1.5} />
                    <span className="flex-1">{item.title}</span>
                    {badge && (
                      <Badge variant={badge.variant} className="h-[18px] min-w-[18px] px-1 text-[10px]">
                        {badge.count}
                      </Badge>
                    )}
                  </NavLink>
                );
              })}
            </nav>
            <div className="shrink-0 border-t border-border/40 px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              <UserMenu />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      </div>

      {/* Persistent always-visible page navigation */}
      <MobileTopNav getBadge={getBadge} />
    </header>
  );
}
