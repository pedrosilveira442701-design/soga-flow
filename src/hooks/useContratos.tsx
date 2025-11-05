import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface Contrato {
  id: string;
  user_id: string;
  cliente_id: string;
  proposta_id?: string;
  status: "ativo" | "concluido" | "cancelado";
  valor_negociado: number;
  cpf_cnpj: string;
  forma_pagamento: string;
  data_inicio: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  cliente?: {
    nome: string;
    telefone?: string;
    cidade?: string;
  };
  proposta?: {
    tipo_piso: string;
    m2: number;
  };
  parcelas?: {
    total: number;
    pagas: number;
    valor_pago: number;
    valor_restante: number;
  };
}

export interface ContratoInsert {
  cliente_id: string;
  proposta_id?: string;
  valor_negociado: number;
  cpf_cnpj: string;
  forma_pagamento: string;
  data_inicio: string;
  observacoes?: string;
  numero_parcelas: number;
  dia_vencimento: number;
}

export interface ContratoUpdate {
  cliente_id?: string;
  valor_negociado?: number;
  cpf_cnpj?: string;
  forma_pagamento?: string;
  data_inicio?: string;
  observacoes?: string;
  status?: "ativo" | "concluido" | "cancelado";
}

export const useContratos = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ["contratos"],
    queryFn: async () => {
      if (!user) return [];

      const { data: contratosData, error: contratosError } = await supabase
        .from("contratos")
        .select(`
          *,
          cliente:clientes!cliente_id(nome, telefone, cidade),
          proposta:propostas!proposta_id(tipo_piso, m2)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (contratosError) throw contratosError;

      // Buscar informações de parcelas para cada contrato
      const contratosComParcelas = await Promise.all(
        (contratosData || []).map(async (contrato) => {
          const { data: parcelas } = await supabase
            .from("financeiro_parcelas")
            .select("*")
            .eq("contrato_id", contrato.id);

          const parcelasInfo = {
            total: parcelas?.length || 0,
            pagas: parcelas?.filter((p) => p.status === "pago").length || 0,
            valor_pago:
              parcelas
                ?.filter((p) => p.status === "pago")
                .reduce((sum, p) => sum + Number(p.valor_liquido_parcela), 0) || 0,
            valor_restante:
              parcelas
                ?.filter((p) => p.status !== "pago")
                .reduce((sum, p) => sum + Number(p.valor_liquido_parcela), 0) || 0,
          };

          return {
            ...contrato,
            parcelas: parcelasInfo,
          };
        })
      );

      return contratosComParcelas as Contrato[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ContratoInsert) => {
      if (!user) throw new Error("Usuário não autenticado");

      // Criar contrato
      const { data: contrato, error: contratoError } = await supabase
        .from("contratos")
        .insert({
          user_id: user.id,
          cliente_id: data.cliente_id,
          proposta_id: data.proposta_id || null,
          valor_negociado: data.valor_negociado,
          cpf_cnpj: data.cpf_cnpj,
          forma_pagamento: data.forma_pagamento,
          data_inicio: data.data_inicio,
          observacoes: data.observacoes,
          status: "ativo",
        })
        .select()
        .single();

      if (contratoError) throw contratoError;

      // Gerar parcelas
      const valorParcela = data.valor_negociado / data.numero_parcelas;
      const dataInicio = new Date(data.data_inicio);
      
      const parcelas = Array.from({ length: data.numero_parcelas }, (_, i) => {
        const vencimento = new Date(dataInicio);
        vencimento.setMonth(vencimento.getMonth() + i);
        vencimento.setDate(data.dia_vencimento);

        return {
          user_id: user.id,
          contrato_id: contrato.id,
          numero_parcela: i + 1,
          valor_liquido_parcela: valorParcela,
          vencimento: vencimento.toISOString().split("T")[0],
          status: "pendente" as const,
        };
      });

      const { error: parcelasError } = await supabase
        .from("financeiro_parcelas")
        .insert(parcelas);

      if (parcelasError) throw parcelasError;

      // Se foi criado a partir de uma proposta, atualizar status da proposta
      if (data.proposta_id) {
        await supabase
          .from("propostas")
          .update({ status: "fechada" })
          .eq("id", data.proposta_id);
      }

      // Criar obra automaticamente
      await supabase
        .from("obras")
        .insert({
          user_id: user.id,
          contrato_id: contrato.id,
          status: "mobilizacao",
          progresso_pct: 0,
        });

      return contrato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      toast.success("Contrato criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar contrato: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ContratoUpdate }) => {
      const { error } = await supabase
        .from("contratos")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar contrato: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Verificar se há parcelas pagas
      const { data: parcelas } = await supabase
        .from("financeiro_parcelas")
        .select("status")
        .eq("contrato_id", id);

      const temParcelasPagas = parcelas?.some((p) => p.status === "pago");

      if (temParcelasPagas) {
        // Se tem parcelas pagas, apenas marcar como cancelado
        const { error } = await supabase
          .from("contratos")
          .update({ status: "cancelado" })
          .eq("id", id);

        if (error) throw error;
      } else {
        // Se não tem parcelas pagas, pode deletar
        // Primeiro deletar parcelas
        await supabase.from("financeiro_parcelas").delete().eq("contrato_id", id);

        // Depois deletar contrato
        const { error } = await supabase.from("contratos").delete().eq("id", id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato cancelado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cancelar contrato: ${error.message}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "ativo" | "concluido" | "cancelado";
    }) => {
      const { error } = await supabase
        .from("contratos")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  return {
    contratos,
    isLoading,
    createContrato: createMutation.mutateAsync,
    updateContrato: updateMutation.mutateAsync,
    deleteContrato: deleteMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
  };
};

// Hook para buscar propostas fechadas sem contrato
export const usePropostasFechadas = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["propostas-fechadas"],
    queryFn: async () => {
      if (!user) return [];

      // Buscar propostas fechadas
      const { data: propostas, error: propostasError } = await supabase
        .from("propostas")
        .select(`
          *,
          cliente:clientes!cliente_id(nome, cidade)
        `)
        .eq("user_id", user.id)
        .eq("status", "fechada")
        .order("created_at", { ascending: false });

      if (propostasError) throw propostasError;

      // Buscar contratos existentes
      const { data: contratos } = await supabase
        .from("contratos")
        .select("proposta_id")
        .eq("user_id", user.id)
        .not("proposta_id", "is", null);

      const propostaIdsComContrato = new Set(
        contratos?.map((c) => c.proposta_id) || []
      );

      // Filtrar propostas que ainda não têm contrato
      return (propostas || []).filter(
        (p) => !propostaIdsComContrato.has(p.id)
      );
    },
    enabled: !!user,
  });
};
