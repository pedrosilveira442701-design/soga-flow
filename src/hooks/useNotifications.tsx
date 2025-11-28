import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type Notificacao = Tables<"notificacoes">;

export const useNotifications = () => {
  const queryClient = useQueryClient();

  // Fetch all notifications
  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("excluida", false)
        .lte("agendamento", new Date().toISOString())
        .order("agendamento", { ascending: false });

      if (error) throw error;
      return data as Notificacao[];
    },
  });

  // Count unread notifications
  const unreadCount = notificacoes.filter((n) => !n.lida).length;

  // Get notifications by filter
  const getFilteredNotifications = (filter: "all" | "unread" | "read") => {
    switch (filter) {
      case "unread":
        return notificacoes.filter((n) => !n.lida);
      case "read":
        return notificacoes.filter((n) => n.lida);
      default:
        return notificacoes;
    }
  };

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    },
    onError: () => {
      toast.error("Erro ao marcar notificação como lida");
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq("lida", false)
        .eq("excluida", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      toast.success("Todas as notificações foram marcadas como lidas");
    },
    onError: () => {
      toast.error("Erro ao marcar notificações como lidas");
    },
  });

  // Delete mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ excluida: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      toast.success("Notificação excluída");
    },
    onError: () => {
      toast.error("Erro ao excluir notificação");
    },
  });

  return {
    notificacoes,
    isLoading,
    unreadCount,
    getFilteredNotifications,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
  };
};
