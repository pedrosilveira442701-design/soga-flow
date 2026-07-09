import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { allMenuItems } from "./Topbar";
import { cn } from "@/lib/utils";

interface MobileTopNavProps {
  getBadge: (title: string) => { count: number; variant: "destructive" | "secondary" } | null;
}

/**
 * Persistent, always-visible horizontal navigation for mobile.
 * Sits directly under the mobile topbar so the user never has to open the
 * drawer to move between pages. Horizontally scrollable (Material scrollable
 * tabs pattern); the active item auto-scrolls into view.
 */
export function MobileTopNav({ getBadge }: MobileTopNavProps) {
  const location = useLocation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  // Keep the current page visible without jumping the whole page.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [location.pathname]);

  return (
    <div className="relative border-b border-border/30 bg-card/70 dark:bg-card/50">
      {/* Edge fades hint that the strip scrolls horizontally */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r from-card/90 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-l from-card/90 to-transparent" />

      <nav
        ref={scrollerRef}
        aria-label="Navegação principal"
        className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-3 py-2 [scroll-padding-inline:1rem]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {allMenuItems.map((item) => {
          const isActive = location.pathname === item.url;
          const badge = getBadge(item.title);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              ref={isActive ? activeRef : undefined}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 shrink-0 h-9 pl-3 pr-3.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-foreground/[0.05] text-muted-foreground active:bg-foreground/[0.1]"
              )}
            >
              <item.icon className="h-[15px] w-[15px] shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
              <span>{item.title}</span>
              {badge && (
                <Badge
                  variant={isActive ? "secondary" : badge.variant}
                  className="h-[16px] min-w-[16px] px-1 text-[10px] leading-none"
                >
                  {badge.count}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
