import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type LeadInteracao = Database["public"]["Tables"]["lead_interacoes"]["Row"];
type LeadInteracaoInsert = Database["public"]["Tables"]["lead_interacoes"]["Insert"];
type LeadInteracaoUpdate = Database["public"]["Tables"]["lead_interacoes"]["Update"];

export function useLeadInteracoes(leadId?: string) {
  const queryClient = useQueryClient();

  const { data: interacoes = [], isLoading } = useQuery({
    queryKey: ["lead-interacoes", leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from("lead_interacoes")
        .select("*")
        .eq("lead_id", leadId)
        .order("data_hora", { ascending: false });

      if (error) throw error;
      return data as LeadInteracao[];
    },
    enabled: !!leadId,
  });

  const createInteracao = useMutation({
    mutationFn: async (interacao: LeadInteracaoInsert) => {
      // 🔹 Obtém o usuário autenticado
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Usuário não autenticado");
      }

      // 🔹 Faz o insert incluindo o user_id
      const { data, error } = await supabase
        .from("lead_interacoes")
        .insert({
          ...interacao,
          lead_id: interacao.lead_id || leadId, // garante o leadId
          user_id: user.id, // 👈 ESSENCIAL
          data_hora: new Date().toISOString(), // timestamp padrão
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-interacoes", leadId] });
      toast.success("Interação registrada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao registrar interação: " + error.message);
    },
  });

  const updateInteracao = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: LeadInteracaoUpdate }) => {
      const { data, error } = await supabase.from("lead_interacoes").update(updates).eq("id", id).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-interacoes", leadId] });
      toast.success("Interação atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar interação: " + error.message);
    },
  });

  const deleteInteracao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_interacoes").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-interacoes", leadId] });
      toast.success("Interação removida!");
    },
    onError: (error) => {
      toast.error("Erro ao remover interação: " + error.message);
    },
  });

  return {
    interacoes,
    isLoading,
    createInteracao,
    updateInteracao,
    deleteInteracao,
  };
}
