import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface Recebivel {
  id: string;
  contrato_id: string;
  user_id: string;
  numero: number;
  valor: number;
  vencimento: string;
  status: "pendente" | "recebido";
  data_recebimento: string | null;
  created_at: string;
  updated_at: string;
}

export const useRecebiveis = (contratoId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: recebiveis = [], isLoading } = useQuery({
    queryKey: ["recebiveis", contratoId],
    queryFn: async () => {
      if (!user || !contratoId) return [];

      const { data, error } = await supabase
        .from("contrato_recebiveis")
        .select("*")
        .eq("contrato_id", contratoId)
        .eq("user_id", user.id)
        .order("numero", { ascending: true });

      if (error) throw error;
      return (data as any[]).map((r) => ({
        ...r,
        valor: Number(r.valor),
      })) as Recebivel[];
    },
    enabled: !!user && !!contratoId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["recebiveis", contratoId] });
  };

  const addMutation = useMutation({
    mutationFn: async (data: { valor: number; vencimento: string; numero?: number }) => {
      if (!user || !contratoId) throw new Error("Dados inválidos");

      const proximoNumero =
        data.numero || (recebiveis.length > 0 ? Math.max(...recebiveis.map((r) => r.numero)) + 1 : 1);

      const { error } = await supabase.from("contrato_recebiveis" as any).insert({
        user_id: user.id,
        contrato_id: contratoId,
        numero: proximoNumero,
        valor: data.valor,
        vencimento: data.vencimento,
        status: "pendente",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Recebível adicionado!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<Recebivel, "valor" | "vencimento">> }) => {
      const { error } = await supabase
        .from("contrato_recebiveis" as any)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Recebível atualizado!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const marcarRecebidoMutation = useMutation({
    mutationFn: async ({ id, dataRecebimento }: { id: string; dataRecebimento?: string }) => {
      const { error } = await supabase
        .from("contrato_recebiveis" as any)
        .update({
          status: "recebido",
          data_recebimento: dataRecebimento || new Date().toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Recebível marcado como recebido!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contrato_recebiveis" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Recebível excluído!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const bulkAddMutation = useMutation({
    mutationFn: async (items: Array<{ valor: number; vencimento: string; numero: number }>) => {
      if (!user || !contratoId) throw new Error("Dados inválidos");

      const rows = items.map((item) => ({
        user_id: user.id,
        contrato_id: contratoId,
        numero: item.numero,
        valor: item.valor,
        vencimento: item.vencimento,
        status: "pendente",
      }));

      const { error } = await supabase.from("contrato_recebiveis" as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Recebíveis gerados!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  return {
    recebiveis,
    isLoading,
    addRecebivel: addMutation.mutateAsync,
    updateRecebivel: updateMutation.mutateAsync,
    marcarRecebido: marcarRecebidoMutation.mutateAsync,
    deleteRecebivel: deleteMutation.mutateAsync,
    bulkAddRecebiveis: bulkAddMutation.mutateAsync,
  };
};
