import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Proposta {
  id: string;
  user_id: string;
  cliente_id: string;
  m2: number;
  valor_m2: number;
  custo_m2: number;
  valor_total: number;
  liquido: number;
  margem_pct: number;
  data: string;
  tipo_piso: string;
  status: string;
  created_at: string;
  updated_at: string;
  clientes?: {
    nome: string;
    telefone?: string;
    cidade?: string;
  };
}

export interface PropostaInsert {
  cliente_id: string;
  m2: number;
  valor_m2: number;
  custo_m2: number;
  tipo_piso: string;
  data?: string;
  status?: string;
}

export interface PropostaUpdate extends PropostaInsert {
  id: string;
}

export const usePropostas = () => {
  const queryClient = useQueryClient();

  // Fetch all propostas
  const { data: propostas = [], isLoading } = useQuery({
    queryKey: ["propostas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select(`
          *,
          clientes:cliente_id (
            nome,
            telefone,
            cidade
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Proposta[];
    },
  });

  // Create proposta
  const createProposta = useMutation({
    mutationFn: async (data: PropostaInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const valor_total = data.m2 * data.valor_m2;
      const custo_total = data.m2 * data.custo_m2;
      const liquido = valor_total - custo_total;
      const margem_pct = valor_total > 0 ? (liquido / valor_total) * 100 : 0;

      const { data: proposta, error } = await supabase
        .from("propostas")
        .insert({
          ...data,
          user_id: user.id,
          valor_total,
          liquido,
          margem_pct,
          data: data.data || new Date().toISOString().split('T')[0],
          status: data.status || 'aberta',
        })
        .select()
        .single();

      if (error) throw error;
      return proposta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      toast.success("Proposta criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar proposta: " + error.message);
    },
  });

  // Update proposta
  const updateProposta = useMutation({
    mutationFn: async (data: PropostaUpdate) => {
      const valor_total = data.m2 * data.valor_m2;
      const custo_total = data.m2 * data.custo_m2;
      const liquido = valor_total - custo_total;
      const margem_pct = valor_total > 0 ? (liquido / valor_total) * 100 : 0;

      const { data: proposta, error } = await supabase
        .from("propostas")
        .update({
          cliente_id: data.cliente_id,
          m2: data.m2,
          valor_m2: data.valor_m2,
          custo_m2: data.custo_m2,
          tipo_piso: data.tipo_piso,
          data: data.data,
          status: data.status,
          valor_total,
          liquido,
          margem_pct,
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw error;
      return proposta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      toast.success("Proposta atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar proposta: " + error.message);
    },
  });

  // Update status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("propostas")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  // Delete proposta
  const deleteProposta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("propostas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      toast.success("Proposta excluída com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir proposta: " + error.message);
    },
  });

  return {
    propostas,
    isLoading,
    createProposta,
    updateProposta,
    updateStatus,
    deleteProposta,
  };
};
