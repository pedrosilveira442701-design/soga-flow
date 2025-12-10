import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type NotificationPreferences = Tables<"notificacao_preferencias">;

export const useNotificationPreferences = () => {
  const queryClient = useQueryClient();

  // Fetch preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notificacao_preferencias"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("notificacao_preferencias")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // If no preferences exist, create default ones
      if (!data) {
        const defaultPreferences: TablesInsert<"notificacao_preferencias"> = {
          user_id: user.id,
          financeiro_inapp: true,
          financeiro_email: false,
          visita_inapp: true,
          visita_email: false,
          visita_atrasada_inapp: true,
          visita_atrasada_email: false,
          lead_inapp: true,
          lead_email: false,
          proposta_inapp: true,
          proposta_email: false,
          contrato_inapp: true,
          contrato_email: false,
          obra_inapp: true,
          obra_email: false,
          resumo_diario_visitas: true,
          resumo_diario_hora: "08:00:00",
          relatorio_diario_ativo: false,
          relatorio_diario_hora: "08:00:00",
          relatorio_diario_timezone: "America/Sao_Paulo",
          relatorio_diario_email: true,
          relatorio_diario_inapp: false,
          relatorio_propostas_abertas: true,
          relatorio_propostas_repouso: true,
          relatorio_gestao_ativo: false,
          relatorio_gestao_frequencia: "diaria",
          relatorio_gestao_hora: "08:00:00",
          relatorio_gestao_dia_semana: 1,
          relatorio_gestao_dia_mes: 1,
          relatorio_gestao_email: true,
          relatorio_gestao_inapp: false,
        };

        const { data: newData, error: insertError } = await supabase
          .from("notificacao_preferencias")
          .insert(defaultPreferences)
          .select()
          .single();

        if (insertError) throw insertError;
        return newData as NotificationPreferences;
      }

      if (error) throw error;
      return data as NotificationPreferences;
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("notificacao_preferencias")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacao_preferencias"] });
      toast.success("Preferências atualizadas com sucesso");
    },
    onError: () => {
      toast.error("Erro ao atualizar preferências");
    },
  });

  // Reset to defaults mutation
  const resetToDefaultsMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const defaultPreferences = {
        financeiro_inapp: true,
        financeiro_email: false,
        visita_inapp: true,
        visita_email: false,
        visita_atrasada_inapp: true,
        visita_atrasada_email: false,
        lead_inapp: true,
        lead_email: false,
        proposta_inapp: true,
        proposta_email: false,
        contrato_inapp: true,
        contrato_email: false,
        obra_inapp: true,
        obra_email: false,
        resumo_diario_visitas: true,
        resumo_diario_hora: "08:00:00",
        email_customizado: null,
        relatorio_diario_ativo: false,
        relatorio_diario_hora: "08:00:00",
        relatorio_diario_timezone: "America/Sao_Paulo",
        relatorio_diario_email: true,
        relatorio_diario_inapp: false,
        relatorio_propostas_abertas: true,
        relatorio_propostas_repouso: true,
        relatorio_ultimo_envio: null,
        relatorio_gestao_ativo: false,
        relatorio_gestao_frequencia: "diaria",
        relatorio_gestao_hora: "08:00:00",
        relatorio_gestao_dia_semana: 1,
        relatorio_gestao_dia_mes: 1,
        relatorio_gestao_email: true,
        relatorio_gestao_inapp: false,
        relatorio_gestao_ultimo_envio: null,
      };

      const { error } = await supabase
        .from("notificacao_preferencias")
        .update(defaultPreferences)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacao_preferencias"] });
      toast.success("Preferências restauradas para o padrão");
    },
    onError: () => {
      toast.error("Erro ao restaurar preferências");
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferencesMutation.mutate,
    resetToDefaults: resetToDefaultsMutation.mutate,
  };
};
