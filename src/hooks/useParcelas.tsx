import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface Parcela {
  id: string;
  contrato_id: string;
  user_id: string;
  numero_parcela: number;
  valor_liquido_parcela: number;
  vencimento: string;
  status: "pendente" | "pago" | "vencido" | "cancelado";
  data_pagamento?: string;
  forma?: string;
  created_at: string;
  updated_at: string;
}

export interface ParcelaUpdate {
  valor_liquido_parcela?: number;
  vencimento?: string;
  status?: "pendente" | "pago" | "atrasado";
  data_pagamento?: string;
  forma?: string;
}

export const useParcelas = (contratoId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: parcelas = [], isLoading } = useQuery({
    queryKey: ["parcelas", contratoId],
    queryFn: async () => {
      if (!user || !contratoId) return [];

      const { data, error } = await supabase
        .from("financeiro_parcelas")
        .select("*")
        .eq("contrato_id", contratoId)
        .eq("user_id", user.id)
        .order("numero_parcela", { ascending: true });

      if (error) throw error;
      return data as Parcela[];
    },
    enabled: !!user && !!contratoId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ParcelaUpdate }) => {
      const { error } = await supabase
        .from("financeiro_parcelas")
        .update(data)
        .eq("id", id);

      if (error) throw error;

      // Verificar se todas as parcelas do contrato foram pagas
      if (data.status === "pago" && contratoId) {
        const { data: todasParcelas } = await supabase
          .from("financeiro_parcelas")
          .select("status")
          .eq("contrato_id", contratoId);

        const todasPagas = todasParcelas?.every((p) => p.status === "pago");

        if (todasPagas) {
          await supabase
            .from("contratos")
            .update({ status: "concluido" })
            .eq("id", contratoId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelas", contratoId] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Parcela atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar parcela: ${error.message}`);
    },
  });

  const marcarComoPagoMutation = useMutation({
    mutationFn: async (id: string) => {
      const hoje = new Date().toISOString().split("T")[0];
      
      const { error } = await supabase
        .from("financeiro_parcelas")
        .update({
          status: "pago",
          data_pagamento: hoje,
        })
        .eq("id", id);

      if (error) throw error;

      // Verificar se todas as parcelas foram pagas
      if (contratoId) {
        const { data: todasParcelas } = await supabase
          .from("financeiro_parcelas")
          .select("status")
          .eq("contrato_id", contratoId);

        const todasPagas = todasParcelas?.every((p) => p.status === "pago");

        if (todasPagas) {
          await supabase
            .from("contratos")
            .update({ status: "concluido" })
            .eq("id", contratoId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelas", contratoId] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Parcela marcada como paga!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao marcar parcela como paga: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Verificar se a parcela está paga
      const { data: parcela } = await supabase
        .from("financeiro_parcelas")
        .select("status")
        .eq("id", id)
        .single();

      if (parcela?.status === "pago") {
        throw new Error("Não é possível excluir parcela já paga");
      }

      const { error } = await supabase
        .from("financeiro_parcelas")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelas", contratoId] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Parcela excluída com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir parcela: ${error.message}`);
    },
  });

  const addParcelaMutation = useMutation({
    mutationFn: async (data: {
      valor: number;
      vencimento: string;
      numero?: number;
    }) => {
      if (!user || !contratoId) throw new Error("Dados inválidos");

      // Buscar o número da próxima parcela
      const { data: parcelas } = await supabase
        .from("financeiro_parcelas")
        .select("numero_parcela")
        .eq("contrato_id", contratoId)
        .order("numero_parcela", { ascending: false })
        .limit(1);

      const proximoNumero = data.numero || (parcelas?.[0]?.numero_parcela || 0) + 1;

      const { error } = await supabase.from("financeiro_parcelas").insert({
        user_id: user.id,
        contrato_id: contratoId,
        numero_parcela: proximoNumero,
        valor_liquido_parcela: data.valor,
        vencimento: data.vencimento,
        status: "pendente",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelas", contratoId] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Parcela adicionada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar parcela: ${error.message}`);
    },
  });

  return {
    parcelas,
    isLoading,
    updateParcela: updateMutation.mutateAsync,
    marcarComoPago: marcarComoPagoMutation.mutateAsync,
    deleteParcela: deleteMutation.mutateAsync,
    addParcela: addParcelaMutation.mutateAsync,
  };
};
