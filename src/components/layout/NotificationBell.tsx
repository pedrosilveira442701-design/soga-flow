import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationInbox } from "./NotificationInbox";
import { useNotifications } from "@/hooks/useNotifications";

export const NotificationBell = () => {
  const { unreadCount } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notificações">
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
          {unreadCount > 0 && (
            // Contido dentro do botão (top-0.5/right-0.5) para nunca ser
            // cortado pelo header; ring separa do sino sem parecer sobreposto
            <span className="absolute top-0.5 right-0.5 h-[15px] min-w-[15px] flex items-center justify-center rounded-full bg-destructive text-[9px] font-bold leading-none text-destructive-foreground px-[3px] ring-2 ring-background pointer-events-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-1.5rem)] max-w-96 p-0"
        align="end"
        sideOffset={8}
      >
        <NotificationInbox />
      </PopoverContent>
    </Popover>
  );
};
