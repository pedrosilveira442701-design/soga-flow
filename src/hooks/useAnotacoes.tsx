import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Anotacao = Tables<"anotacoes">;
export type AnotacaoInsert = TablesInsert<"anotacoes">;
export type AnotacaoUpdate = TablesUpdate<"anotacoes">;

export type AnotacaoStatus = "aberta" | "em_andamento" | "concluida" | "arquivada";
export type AnotacaoPriority = "baixa" | "media" | "alta";
export type AnotacaoType = "ligacao" | "orcamento" | "follow_up" | "visita" | "reuniao" | "outro";

export interface AnotacaoFilters {
  status?: AnotacaoStatus[];
  priority?: AnotacaoPriority[];
  type?: AnotacaoType[];
  tags?: string[];
  clientId?: string;
  dateRange?: { start: Date; end: Date };
  search?: string;
}

export const useAnotacoes = (filters?: AnotacaoFilters) => {
  const queryClient = useQueryClient();

  // LISTAR ANOTAÇÕES
  const { data: anotacoes = [], isLoading } = useQuery({
    queryKey: ["anotacoes", filters],
    queryFn: async () => {
      let query = supabase.from("anotacoes").select("*, clientes(nome)").order("created_at", { ascending: false });

      if (filters?.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }

      if (filters?.priority && filters.priority.length > 0) {
        query = query.in("priority", filters.priority);
      }

      if (filters?.type && filters.type.length > 0) {
        query = query.in("type", filters.type);
      }

      if (filters?.clientId) {
        query = query.eq("client_id", filters.clientId);
      }

      if (filters?.tags && filters.tags.length > 0) {
        // tags é TEXT[], então podemos usar contains
        query = query.contains("tags", filters.tags);
      }

      if (filters?.dateRange) {
        query = query
          .gte("reminder_datetime", filters.dateRange.start.toISOString())
          .lte("reminder_datetime", filters.dateRange.end.toISOString());
      }

      if (filters?.search) {
        const s = filters.search;
        query = query.or(`title.ilike.%${s}%,note.ilike.%${s}%,client_name.ilike.%${s}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Anotacao[];
    },
  });

  // CRIAR ANOTAÇÃO
  const createAnotacao = useMutation({
    mutationFn: async (anotacao: Omit<AnotacaoInsert, "user_id">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("anotacoes")
        .insert({ ...anotacao, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Anotacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anotacoes"] });
      toast.success("Anotação criada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating anotacao:", error);
      toast.error("Erro ao criar anotação");
    },
  });

  // ATUALIZAR ANOTAÇÃO
  const updateAnotacao = useMutation({
    mutationFn: async ({ id, ...updates }: AnotacaoUpdate & { id: string }) => {
      const { data, error } = await supabase.from("anotacoes").update(updates).eq("id", id).select().single();

      if (error) throw error;
      return data as Anotacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anotacoes"] });
      toast.success("Anotação atualizada!");
    },
    onError: (error) => {
      console.error("Error updating anotacao:", error);
      toast.error("Erro ao atualizar anotação");
    },
  });

  // CONCLUIR ANOTAÇÃO
  const completeAnotacao = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("anotacoes")
        .update({
          status: "concluida" as AnotacaoStatus,
          completed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Anotacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anotacoes"] });
      toast.success("Anotação concluída!");
    },
    onError: (error) => {
      console.error("Error completing anotacao:", error);
      toast.error("Erro ao concluir anotação");
    },
  });

  // EXCLUIR ANOTAÇÃO
  const deleteAnotacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("anotacoes").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anotacoes"] });
      toast.success("Anotação excluída!");
    },
    onError: (error) => {
      console.error("Error deleting anotacao:", error);
      toast.error("Erro ao excluir anotação");
    },
  });

  // SNOOZE (ADIAR) LEMBRETE
  const snoozeAnotacao = useMutation({
    mutationFn: async ({
      anotacaoId,
      originalDatetime,
      snoozedUntil,
    }: {
      anotacaoId: string;
      originalDatetime: string;
      snoozedUntil: string;
    }) => {
      const { error: snoozeError } = await supabase.from("anotacoes_snoozes").insert({
        anotacao_id: anotacaoId,
        original_datetime: originalDatetime,
        snoozed_until: snoozedUntil,
      });

      if (snoozeError) throw snoozeError;

      const { error: updateError } = await supabase
        .from("anotacoes")
        .update({ reminder_datetime: snoozedUntil })
        .eq("id", anotacaoId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anotacoes"] });
      toast.success("Lembrete adiado!");
    },
    onError: (error) => {
      console.error("Error snoozing anotacao:", error);
      toast.error("Erro ao adiar lembrete");
    },
  });

  return {
    anotacoes,
    isLoading,
    createAnotacao: createAnotacao.mutate,
    updateAnotacao: updateAnotacao.mutate,
    completeAnotacao: completeAnotacao.mutate,
    deleteAnotacao: deleteAnotacao.mutate,
    snoozeAnotacao: snoozeAnotacao.mutate,
    isCreating: createAnotacao.isPending,
    isUpdating: updateAnotacao.isPending,
  };
};
