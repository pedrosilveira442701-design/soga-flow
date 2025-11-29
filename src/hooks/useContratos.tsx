import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface Contrato {
  id: string;
  user_id: string;
  cliente_id: string;
  proposta_id?: string | null;
  status: "ativo" | "concluido" | "cancelado";
  valor_negociado: number;
  cpf_cnpj: string;
  forma_pagamento: string;
  data_inicio: string;
  observacoes?: string;
  margem_pct?: number | null;

  // novos campos armazenados na tabela contratos
  valor_entrada?: number | null;
  forma_pagamento_entrada?: string | null;
  numero_parcelas?: number | null;
  dia_vencimento?: number | null;

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
    custo_m2?: number;
    servicos?: Array<{ descricao: string; valor: number }>;
    margem_pct?: number;
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
  margem_pct?: number;
  cpf_cnpj: string;

  valor_entrada?: number;
  forma_pagamento_entrada?: string;
  forma_pagamento: string;

  data_inicio: string;
  observacoes?: string;

  numero_parcelas: number;
  dia_vencimento: number;
}

export interface ContratoUpdate {
  cliente_id?: string;
  proposta_id?: string | null;
  valor_negociado?: number;
  cpf_cnpj?: string;
  forma_pagamento?: string;
  data_inicio?: string;
  observacoes?: string;
  status?: "ativo" | "concluido" | "cancelado";

  valor_entrada?: number | null;
  forma_pagamento_entrada?: string | null;
  numero_parcelas?: number | null;
  dia_vencimento?: number | null;
}

/**
 * Hook para listar propostas com status "fechada"
 * usado em ContratoForm.tsx como:
 * const { data: propostasFechadas = [], isLoading: isLoadingPropostas } = usePropostasFechadas();
 */
export const usePropostasFechadas = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["propostas-fechadas", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("propostas")
        .select(
          `
          *,
          cliente:clientes!cliente_id(nome)
        `,
        )
        .eq("user_id", user.id)
        .eq("status", "fechada")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useContratos = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ["contratos", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: contratosData, error: contratosError } = await supabase
        .from("contratos")
        .select(
          `
          *,
          margem_pct,
          cliente:clientes!cliente_id(nome, telefone, cidade),
          proposta:propostas!proposta_id(tipo_piso, m2, custo_m2, servicos, margem_pct)
        `,
        )
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
        }),
      );

      return contratosComParcelas as Contrato[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ContratoInsert): Promise<Contrato> => {
      if (!user) throw new Error("Usuário não autenticado");

      if (!data.numero_parcelas || data.numero_parcelas < 1) {
        throw new Error("Número de parcelas deve ser maior que zero");
      }

      // margem informada pelo usuário ou da proposta
      let margemPct = data.margem_pct || 0;

      if (!margemPct && data.proposta_id) {
        const { data: proposta } = await supabase
          .from("propostas")
          .select("margem_pct")
          .eq("id", data.proposta_id)
          .single();

        margemPct = Number(proposta?.margem_pct || 0);
      }

      // Criar contrato (já gravando os novos campos)
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
          margem_pct: margemPct,
          status: "ativo",
          valor_entrada: data.valor_entrada ?? null,
          forma_pagamento_entrada: data.forma_pagamento_entrada ?? null,
          numero_parcelas: data.numero_parcelas,
          dia_vencimento: data.dia_vencimento,
        })
        .select()
        .single();

      if (contratoError) throw contratoError;

      // -------- GERAÇÃO DAS PARCELAS --------
      const valorEntrada = data.valor_entrada || 0;
      const valorRestante = data.valor_negociado - valorEntrada;

      if (valorRestante < 0) {
        throw new Error("O valor de entrada não pode ser maior que o valor negociado");
      }

      const valorParcela = data.numero_parcelas > 0 ? valorRestante / data.numero_parcelas : 0;

      const dataInicio = new Date(data.data_inicio);

      const parcelas: any[] = [];

      // parcela de entrada (nº 0)
      if (valorEntrada > 0 && data.forma_pagamento_entrada) {
        parcelas.push({
          user_id: user.id,
          contrato_id: contrato.id,
          numero_parcela: 0,
          valor_liquido_parcela: valorEntrada,
          vencimento: data.data_inicio,
          status: "pendente" as const,
          forma: data.forma_pagamento_entrada,
        });
      }

      // demais parcelas
      const parcelasRestante = Array.from({ length: data.numero_parcelas }, (_, i) => {
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
          forma: data.forma_pagamento,
        };
      });

      parcelas.push(...parcelasRestante);

      const { error: parcelasError } = await supabase.from("financeiro_parcelas").insert(parcelas);

      if (parcelasError) throw parcelasError;

      return contrato as Contrato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos", user?.id] });
      toast.success("Contrato criado com sucesso!");
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error.message || "Erro ao criar contrato");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ContratoUpdate }): Promise<Contrato> => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data: updated, error } = await supabase
        .from("contratos")
        .update(data as any)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      return updated as Contrato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos", user?.id] });
      toast.success("Contrato atualizado com sucesso!");
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error.message || "Erro ao atualizar contrato");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("contratos").delete().eq("id", id).eq("user_id", user.id);

      if (error) throw error;

      // opcional: também apagar parcelas associadas
      await supabase.from("financeiro_parcelas").delete().eq("contrato_id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos", user?.id] });
      toast.success("Contrato excluído com sucesso!");
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error.message || "Erro ao excluir contrato");
    },
  });

  return {
    contratos,
    isLoading,
    createContrato: createMutation.mutateAsync,
    updateContrato: updateMutation.mutateAsync,
    deleteContrato: deleteMutation.mutateAsync,
  };
};
