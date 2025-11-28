import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationItem } from "./NotificationItem";
import { useNotifications } from "@/hooks/useNotifications";
import { CheckCheck } from "lucide-react";

export const NotificationInbox = () => {
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");
  const { getFilteredNotifications, markAllAsRead, isLoading } = useNotifications();

  const notifications = getFilteredNotifications(activeTab);

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Notificações</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => markAllAsRead()}
          className="h-8 text-xs"
        >
          <CheckCheck className="h-4 w-4 mr-1" />
          Marcar todas como lidas
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b bg-transparent p-0">
          <TabsTrigger 
            value="all" 
            className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Todas
          </TabsTrigger>
          <TabsTrigger 
            value="unread"
            className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Não lidas
          </TabsTrigger>
          <TabsTrigger 
            value="read"
            className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Lidas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="flex-1 m-0">
          <ScrollArea className="h-[420px]">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="unread" className="flex-1 m-0">
          <ScrollArea className="h-[420px]">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma notificação não lida
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="read" className="flex-1 m-0">
          <ScrollArea className="h-[420px]">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma notificação lida
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
