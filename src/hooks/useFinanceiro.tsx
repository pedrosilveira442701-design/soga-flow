import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface ParcelaFinanceira {
  id: string;
  contrato_id: string;
  numero_parcela: number;
  valor_liquido_parcela: number;
  vencimento: string;
  status: "pendente" | "pago" | "vencido" | "cancelado" | "atrasado";
  data_pagamento?: string;
  forma?: string;
  contrato?: {
    id: string;
    valor_negociado: number;
    forma_pagamento: string;
    margem_pct: number;
    cliente?: {
      id: string;
      nome: string;
      cpf_cnpj: string;
    };
  };
}

export interface FluxoCaixa {
  mes: string;
  recebido: number;
  previsto: number;
  atrasado: number;
}

export interface FinanceiroFilters {
  search?: string;
  status?: "pendente" | "pago" | "vencido" | "cancelado" | "atrasado" | "";
  periodo?: { inicio: string; fim: string };
  formaPagamento?: string;
  vencimentoAte?: string;
}

export const useFinanceiro = (filters?: FinanceiroFilters) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Query principal com todas as parcelas
  const { data: parcelas = [], isLoading } = useQuery({
    queryKey: ["financeiro-parcelas", user?.id, filters],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("financeiro_parcelas")
        .select(`
          *,
          contrato:contratos(
            id,
            valor_negociado,
            forma_pagamento,
            margem_pct,
            cliente:clientes(
              id,
              nome,
              cpf_cnpj
            )
          )
        `)
        .eq("user_id", user.id)
        .order("vencimento", { ascending: true });

      // Aplicar filtros
      if (filters?.status) {
        if (filters.status === "atrasado") {
          query = query
            .eq("status", "pendente")
            .lt("vencimento", new Date().toISOString().split("T")[0]);
        } else if (filters.status) {
          query = query.eq("status", filters.status as any);
        }
      }

      if (filters?.periodo) {
        query = query
          .gte("vencimento", filters.periodo.inicio)
          .lte("vencimento", filters.periodo.fim);
      }

      if (filters?.vencimentoAte) {
        query = query.lte("vencimento", filters.vencimentoAte);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Processar parcelas e calcular status atrasado
      const hoje = new Date().toISOString().split("T")[0];
      return (data || []).map((p) => {
        const statusCalculado =
          p.status === "pendente" && p.vencimento < hoje ? "atrasado" : p.status;

        return {
          ...p,
          status: statusCalculado,
        };
      }) as ParcelaFinanceira[];
    },
    enabled: !!user,
  });

  // Filtrar por busca textual (cliente ou CPF/CNPJ)
  const parcelasFiltradas = filters?.search
    ? parcelas.filter(
        (p) =>
          p.contrato?.cliente?.nome
            ?.toLowerCase()
            .includes(filters.search!.toLowerCase()) ||
          p.contrato?.cliente?.cpf_cnpj?.includes(filters.search!)
      )
    : parcelas;

  // Filtrar por forma de pagamento
  const parcelasFinais = filters?.formaPagamento
    ? parcelasFiltradas.filter(
        (p) => p.contrato?.forma_pagamento === filters.formaPagamento
      )
    : parcelasFiltradas;

  // KPIs
  const kpis = {
    totalAReceber: parcelasFinais
      .filter((p) => p.status === "pendente" || p.status === "atrasado")
      .reduce((sum, p) => sum + Number(p.valor_liquido_parcela), 0),

    totalLucroAReceber: parcelasFinais
      .filter((p) => p.status === "pendente" || p.status === "atrasado")
      .reduce((sum, p) => {
        const valor = Number(p.valor_liquido_parcela);
        const margemPct = Number(p.contrato?.margem_pct || 0);
        return sum + (valor * (margemPct / 100));
      }, 0),

    recebidoMes: parcelasFinais
      .filter((p) => {
        if (p.status !== "pago" || !p.data_pagamento) return false;
        const dataPgto = new Date(p.data_pagamento);
        const hoje = new Date();
        return (
          dataPgto.getMonth() === hoje.getMonth() &&
          dataPgto.getFullYear() === hoje.getFullYear()
        );
      })
      .reduce((sum, p) => sum + Number(p.valor_liquido_parcela), 0),

    aReceberMes: parcelasFinais
      .filter((p) => {
        if (p.status === "pago" || p.status === "cancelado") return false;
        const venc = new Date(p.vencimento);
        const hoje = new Date();
        return (
          venc.getMonth() === hoje.getMonth() &&
          venc.getFullYear() === hoje.getFullYear()
        );
      })
      .reduce((sum, p) => sum + Number(p.valor_liquido_parcela), 0),

    atrasadas: parcelasFinais.filter((p) => p.status === "atrasado").length,
  };

  // Fluxo de caixa (12 meses)
  const fluxoCaixa = useQuery({
    queryKey: ["fluxo-caixa", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("financeiro_parcelas")
        .select("vencimento, valor_liquido_parcela, status, data_pagamento")
        .eq("user_id", user.id);

      if (error) throw error;

      // Agrupar por mês
      const meses = new Map<string, FluxoCaixa>();
      const hoje = new Date();

      // Últimos 12 meses
      for (let i = 11; i >= 0; i--) {
        const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const key = mes.toISOString().slice(0, 7); // YYYY-MM
        meses.set(key, {
          mes: key,
          recebido: 0,
          previsto: 0,
          atrasado: 0,
        });
      }

      // Processar parcelas
      const hojStr = hoje.toISOString().split("T")[0];
      (data || []).forEach((p) => {
        // Para parcelas pagas, usar data_pagamento; para não pagas, usar vencimento
        if (p.status === "pago" && p.data_pagamento) {
          const pgtoMes = p.data_pagamento.slice(0, 7);
          if (meses.has(pgtoMes)) {
            const mesData = meses.get(pgtoMes)!;
            mesData.recebido += Number(p.valor_liquido_parcela);
          }
        } else if (p.status === "pendente") {
          const vencMes = p.vencimento.slice(0, 7);
          if (meses.has(vencMes)) {
            const mesData = meses.get(vencMes)!;
            if (p.vencimento < hojStr) {
              mesData.atrasado += Number(p.valor_liquido_parcela);
            } else {
              mesData.previsto += Number(p.valor_liquido_parcela);
            }
          }
        }
      });

      return Array.from(meses.values());
    },
    enabled: !!user,
  });

  // Marcar como pago (batch)
  const marcarComoPagoMutation = useMutation({
    mutationFn: async (params: {
      ids: string[];
      dataPagamento: string;
      forma: string;
    }) => {
      const { error } = await supabase
        .from("financeiro_parcelas")
        .update({
          status: "pago",
          data_pagamento: params.dataPagamento,
          forma: params.forma,
        })
        .in("id", params.ids);

      if (error) throw error;

      // Verificar se contratos devem ser marcados como concluídos
      const { data: parcelas } = await supabase
        .from("financeiro_parcelas")
        .select("contrato_id")
        .in("id", params.ids);

      const contratoIds = [...new Set(parcelas?.map((p) => p.contrato_id))];

      for (const contratoId of contratoIds) {
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
      queryClient.invalidateQueries({ queryKey: ["financeiro-parcelas"] });
      queryClient.invalidateQueries({ queryKey: ["fluxo-caixa"] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["parcelas"] });
      toast.success("Parcelas marcadas como pagas!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao marcar parcelas: ${error.message}`);
    },
  });

  // Atualizar parcela
  const updateParcelaMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      valor?: number;
      vencimento?: string;
    }) => {
      const { error } = await supabase
        .from("financeiro_parcelas")
        .update({
          valor_liquido_parcela: params.valor,
          vencimento: params.vencimento,
        })
        .eq("id", params.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro-parcelas"] });
      queryClient.invalidateQueries({ queryKey: ["fluxo-caixa"] });
      queryClient.invalidateQueries({ queryKey: ["parcelas"] });
      toast.success("Parcela atualizada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  return {
    parcelas: parcelasFinais,
    isLoading,
    kpis,
    fluxoCaixa: fluxoCaixa.data || [],
    isLoadingFluxo: fluxoCaixa.isLoading,
    marcarComoPago: marcarComoPagoMutation.mutateAsync,
    updateParcela: updateParcelaMutation.mutateAsync,
  };
};
