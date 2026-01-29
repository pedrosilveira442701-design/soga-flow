import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProposalChangeReason, canCreateNewVersion, isReadOnly } from "@/lib/proposalVersioning";

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
  observacao?: string;
  forma_pagamento?: string;
  // Campos de versionamento
  proposal_group_id?: string;
  version_number?: number;
  previous_version_id?: string;
  replaced_by_id?: string;
  replaced_at?: string;
  changed_reason?: string;
  changed_reason_detail?: string;
  is_current?: boolean;
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
    bairro?: string;
    cpf_cnpj?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    uf?: string;
    cep?: string;
  };
}

export interface PropostaInsert {
  cliente_id: string;
  lead_id?: string;
  servicos?: Array<{
    tipo: string;
    tipo_outro?: string;
    m2: number;
    valor_m2: number;
    custo_m2: number;
  }>;
  desconto?: number;
  forma_pagamento?: string;
  data?: string;
  status?: string;
  observacao?: string;
}

export interface PropostaUpdate extends PropostaInsert {
  id: string;
}

export interface NewVersionData {
  previousId: string;
  data: Omit<PropostaInsert, "cliente_id" | "lead_id">;
  reason: ProposalChangeReason;
  reasonDetail?: string;
}

// Função auxiliar para calcular totais a partir dos serviços
function calculateTotals(servicos: PropostaInsert["servicos"], desconto: number) {
  const services = servicos || [];
  const m2_total = services.reduce((acc, s) => acc + (Number(s.m2) || 0), 0);
  const valor_bruto = services.reduce((acc, s) => acc + ((Number(s.m2) || 0) * (Number(s.valor_m2) || 0)), 0);
  const valor_total = Number((valor_bruto - desconto).toFixed(2));
  const custo_total = services.reduce((acc, s) => acc + ((Number(s.m2) || 0) * (Number(s.custo_m2) || 0)), 0);
  const liquido = Number((valor_total - custo_total).toFixed(2));
  const margem_pct = valor_total > 0 ? Number(((liquido / valor_total) * 100).toFixed(2)) : 0;

  // Para compatibilidade, usar valores do primeiro serviço nos campos antigos
  const primeiroServico = services[0] || { m2: 0, valor_m2: 0, custo_m2: 0 };

  return {
    m2: m2_total,
    valor_m2: primeiroServico.valor_m2,
    custo_m2: primeiroServico.custo_m2,
    valor_total,
    liquido,
    margem_pct,
    tipo_piso: services.map(s => s.tipo === "Outro" && s.tipo_outro ? s.tipo_outro : s.tipo).join(", "),
  };
}

export const usePropostas = () => {
  const queryClient = useQueryClient();

  // Fetch all propostas (apenas versões correntes por padrão)
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
            cidade,
            bairro,
            cpf_cnpj,
            logradouro,
            numero,
            complemento,
            uf,
            cep
          )
        `)
        .eq("is_current", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Parse servicos from JSON
      return (data || []).map(p => ({
        ...p,
        servicos: Array.isArray(p.servicos) ? p.servicos : []
      })) as unknown as Proposta[];
    },
  });

  // Fetch histórico de versões por grupo
  const fetchVersionHistory = async (groupId: string): Promise<Proposta[]> => {
    const { data, error } = await supabase
      .from("propostas")
      .select(`
        *,
        clientes:cliente_id (
          nome,
          telefone,
          cidade,
          bairro,
          cpf_cnpj,
          logradouro,
          numero,
          complemento,
          uf,
          cep
        )
      `)
      .eq("proposal_group_id", groupId)
      .order("version_number", { ascending: false });

    if (error) throw error;

    return (data || []).map(p => ({
      ...p,
      servicos: Array.isArray(p.servicos) ? p.servicos : []
    })) as unknown as Proposta[];
  };

  // Verificar se pode editar a proposta
  const canEdit = (proposta: Proposta): boolean => {
    if (!proposta.status) return true;
    return !isReadOnly(proposta.status);
  };

  // Verificar se pode criar nova versão
  const canVersion = (proposta: Proposta): boolean => {
    if (!proposta.status) return false;
    return canCreateNewVersion(proposta.status);
  };

  // Create proposta (V1)
  const createProposta = useMutation({
    mutationFn: async (data: PropostaInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const totals = calculateTotals(data.servicos, Number(data.desconto) || 0);

      // Criar proposta como V1
      const { data: proposta, error } = await supabase
        .from("propostas")
        .insert({
          user_id: user.id,
          cliente_id: data.cliente_id,
          lead_id: data.lead_id || null,
          servicos: data.servicos || [],
          desconto: Number(data.desconto) || 0,
          forma_pagamento: data.forma_pagamento || null,
          ...totals,
          data: data.data || new Date().toISOString().split('T')[0],
          status: data.status || 'aberta',
          observacao: data.observacao || null,
          // Campos de versionamento - será preenchido pelo after insert
          version_number: 1,
          is_current: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar proposal_group_id para o próprio id (V1)
      const { error: updateError } = await supabase
        .from("propostas")
        .update({ proposal_group_id: proposta.id })
        .eq("id", proposta.id);

      if (updateError) throw updateError;

      return { ...proposta, proposal_group_id: proposta.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      toast.success("Proposta criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar proposta: " + error.message);
    },
  });

  // Create nova versão de proposta existente
  const createNewVersion = useMutation({
    mutationFn: async ({ previousId, data, reason, reasonDetail }: NewVersionData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar proposta anterior
      const { data: previous, error: fetchError } = await supabase
        .from("propostas")
        .select("*")
        .eq("id", previousId)
        .single();

      if (fetchError) throw fetchError;
      if (!previous) throw new Error("Proposta não encontrada");

      // Verificar se pode versionar
      if (!canCreateNewVersion(previous.status)) {
        throw new Error("Esta proposta não pode ser versionada");
      }

      const totals = calculateTotals(data.servicos, Number(data.desconto) || 0);

      // Criar nova versão
      const { data: newProposta, error: insertError } = await supabase
        .from("propostas")
        .insert({
          user_id: user.id,
          cliente_id: previous.cliente_id,
          lead_id: previous.lead_id,
          servicos: data.servicos || [],
          desconto: Number(data.desconto) || 0,
          forma_pagamento: data.forma_pagamento || previous.forma_pagamento,
          ...totals,
          data: data.data || new Date().toISOString().split('T')[0],
          status: data.status || 'aberta',
          observacao: data.observacao || previous.observacao,
          // Campos de versionamento
          proposal_group_id: previous.proposal_group_id,
          version_number: (previous.version_number || 1) + 1,
          previous_version_id: previous.id,
          is_current: true,
          changed_reason: reason,
          changed_reason_detail: reasonDetail || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Atualizar proposta anterior
      const { error: updateError } = await supabase
        .from("propostas")
        .update({
          is_current: false,
          status: 'substituida',
          replaced_by_id: newProposta.id,
          replaced_at: new Date().toISOString(),
        })
        .eq("id", previousId);

      if (updateError) throw updateError;

      return newProposta;
    },
    onSuccess: (newProposta) => {
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      toast.success(`Nova versão V${newProposta.version_number} criada com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar nova versão: " + error.message);
    },
  });

  // Update proposta (sem versionamento - edição simples)
  const updateProposta = useMutation({
    mutationFn: async (data: PropostaUpdate) => {
      const totals = calculateTotals(data.servicos, Number(data.desconto) || 0);

      const { data: proposta, error } = await supabase
        .from("propostas")
        .update({
          cliente_id: data.cliente_id,
          lead_id: data.lead_id || null,
          servicos: data.servicos || [],
          desconto: Number(data.desconto) || 0,
          forma_pagamento: data.forma_pagamento || null,
          ...totals,
          data: data.data,
          status: data.status,
          observacao: data.observacao,
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

  // Update propostas by lead_id
  const updatePropostasByLeadId = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      // Define quais status não devem ser atualizados baseado no novo status
      let excludeStatuses: string;
      if (status === "perdida") {
        excludeStatuses = "(fechada)";
      } else if (status === "repouso") {
        excludeStatuses = "(fechada,perdida)";
      } else if (status === "fechada") {
        excludeStatuses = "(fechada)";
      } else {
        excludeStatuses = "(fechada,perdida,repouso)";
      }

      const { data, error } = await supabase
        .from("propostas")
        .update({ status })
        .eq("lead_id", leadId)
        .eq("is_current", true) // Só atualiza versões correntes
        .not("status", "in", excludeStatuses)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      if (data && data.length > 0) {
        toast.success(`${data.length} proposta(s) atualizada(s) automaticamente`);
      }
    },
    onError: (error: Error) => {
      console.error("Erro ao atualizar propostas por lead:", error.message);
    },
  });

  return {
    propostas,
    isLoading,
    createProposta,
    updateProposta,
    updateStatus,
    deleteProposta,
    updatePropostasByLeadId,
    // Novas funções de versionamento
    createNewVersion,
    fetchVersionHistory,
    canEdit,
    canVersion,
  };
};
