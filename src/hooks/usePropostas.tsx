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
  desconto: number;
  data: string;
  tipo_piso: string;
  status: string;
  created_at: string;
  updated_at: string;
  servicos?: Array<{
    tipo: string;
    tipo_outro?: string;
    m2: number;
    valor_m2: number;
    custo_m2: number;
  }>;
  clientes?: {
    nome: string;
    telefone?: string;
    cidade?: string;
  };
}

export interface PropostaInsert {
  cliente_id: string;
  servicos?: Array<{
    tipo: string;
    tipo_outro?: string;
    m2: number;
    valor_m2: number;
    custo_m2: number;
  }>;
  desconto?: number;
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
      
      // Parse servicos from JSON
      return (data || []).map(p => ({
        ...p,
        servicos: Array.isArray(p.servicos) ? p.servicos : []
      })) as unknown as Proposta[];
    },
  });

  // Create proposta
  const createProposta = useMutation({
    mutationFn: async (data: PropostaInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Calcular totais a partir dos serviços
      const servicos = data.servicos || [];
      const desconto = Number(data.desconto) || 0;
      const m2_total = servicos.reduce((acc, s) => acc + (Number(s.m2) || 0), 0);
      const valor_bruto = servicos.reduce((acc, s) => acc + ((Number(s.m2) || 0) * (Number(s.valor_m2) || 0)), 0);
      const valor_total = Number((valor_bruto - desconto).toFixed(2));
      const custo_total = servicos.reduce((acc, s) => acc + ((Number(s.m2) || 0) * (Number(s.custo_m2) || 0)), 0);
      const liquido = Number((valor_total - custo_total).toFixed(2));
      const margem_pct = valor_total > 0 ? Number(((liquido / valor_total) * 100).toFixed(2)) : 0;

      // Para compatibilidade, usar valores do primeiro serviço nos campos antigos
      const primeiroServico = servicos[0] || { m2: 0, valor_m2: 0, custo_m2: 0 };

      const { data: proposta, error } = await supabase
        .from("propostas")
        .insert({
          user_id: user.id,
          cliente_id: data.cliente_id,
          servicos: servicos,
          desconto,
          m2: m2_total,
          valor_m2: primeiroServico.valor_m2,
          custo_m2: primeiroServico.custo_m2,
          tipo_piso: servicos.map(s => s.tipo === "Outro" && s.tipo_outro ? s.tipo_outro : s.tipo).join(", "),
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
      // Calcular totais a partir dos serviços
      const servicos = data.servicos || [];
      const desconto = Number(data.desconto) || 0;
      const m2_total = servicos.reduce((acc, s) => acc + (Number(s.m2) || 0), 0);
      const valor_bruto = servicos.reduce((acc, s) => acc + ((Number(s.m2) || 0) * (Number(s.valor_m2) || 0)), 0);
      const valor_total = Number((valor_bruto - desconto).toFixed(2));
      const custo_total = servicos.reduce((acc, s) => acc + ((Number(s.m2) || 0) * (Number(s.custo_m2) || 0)), 0);
      const liquido = Number((valor_total - custo_total).toFixed(2));
      const margem_pct = valor_total > 0 ? Number(((liquido / valor_total) * 100).toFixed(2)) : 0;

      // Para compatibilidade, usar valores do primeiro serviço nos campos antigos
      const primeiroServico = servicos[0] || { m2: 0, valor_m2: 0, custo_m2: 0 };

      const { data: proposta, error } = await supabase
        .from("propostas")
        .update({
          cliente_id: data.cliente_id,
          servicos: servicos,
          desconto,
          m2: m2_total,
          valor_m2: primeiroServico.valor_m2,
          custo_m2: primeiroServico.custo_m2,
          tipo_piso: servicos.map(s => s.tipo === "Outro" && s.tipo_outro ? s.tipo_outro : s.tipo).join(", "),
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
