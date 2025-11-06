import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

export type FilterPeriod = "week" | "month" | "year" | "custom";

interface KPIData {
  title: string;
  value: string;
  delta?: {
    value: string;
    direction: "up" | "down";
  };
  variant?: "default" | "liquid";
  icon: any;
}

interface TimelineData {
  name: string;
  bruto: number;
  custo: number;
  liquido: number;
}

interface FunnelData {
  stage: string;
  count: number;
  conversionRate?: number;
}

interface DashboardFilters {
  period: FilterPeriod;
  customDateRange?: { from: Date; to: Date };
}

export function useDashboard(filters: DashboardFilters = { period: "month" }) {
  const { user } = useAuth();

  // Calcular datas baseado no filtro
  const now = new Date();
  const { startDate, endDate } = useMemo(() => {
    switch (filters.period) {
      case "week":
        return {
          startDate: startOfWeek(now, { locale: ptBR }),
          endDate: endOfWeek(now, { locale: ptBR }),
        };
      case "month":
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
        };
      case "year":
        return {
          startDate: startOfYear(now),
          endDate: endOfYear(now),
        };
      case "custom":
        return {
          startDate: filters.customDateRange?.from || startOfMonth(now),
          endDate: filters.customDateRange?.to || endOfMonth(now),
        };
      default:
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
        };
    }
  }, [filters.period, filters.customDateRange, now]);

  const sixMonthsAgo = subMonths(now, 5);

  // 1. Buscar todas as propostas no período selecionado
  const { data: propostas = [] } = useQuery({
    queryKey: ["propostas-dashboard", user?.id, filters.period, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .eq("user_id", user!.id)
        .gte("data", format(startDate, "yyyy-MM-dd"))
        .lte("data", format(endDate, "yyyy-MM-dd"));

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 2. Buscar todos os contratos no período selecionado
  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos-dashboard", user?.id, filters.period, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("user_id", user!.id)
        .gte("data_inicio", format(startDate, "yyyy-MM-dd"))
        .lte("data_inicio", format(endDate, "yyyy-MM-dd"));

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 3. Buscar todos os contratos ativos com suas parcelas e margem
  const { data: contratosComParcelas = [] } = useQuery({
    queryKey: ["contratos-parcelas", user?.id],
    queryFn: async () => {
      const { data: contratosData, error: contratosError } = await supabase
        .from("contratos")
        .select("id, margem_pct, valor_negociado")
        .eq("user_id", user!.id)
        .eq("status", "ativo");

      if (contratosError) throw contratosError;

      // Buscar parcelas pendentes para cada contrato
      const contratosComParcelasData = await Promise.all(
        (contratosData || []).map(async (contrato) => {
          const { data: parcelas } = await supabase
            .from("financeiro_parcelas")
            .select("*")
            .eq("contrato_id", contrato.id)
            .in("status", ["pendente", "atrasado"]);

          return {
            ...contrato,
            parcelas: parcelas || [],
          };
        })
      );

      return contratosComParcelasData;
    },
    enabled: !!user?.id,
  });

  // 4. Buscar propostas fechadas dos últimos 6 meses para timeline
  const { data: timelinePropostas = [] } = useQuery({
    queryKey: ["propostas-timeline", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "fechada")
        .gte("data", format(sixMonthsAgo, "yyyy-MM-dd"));

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 5. Buscar leads por estágio
  const { data: leads = [] } = useQuery({
    queryKey: ["leads-dashboard", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("estagio")
        .eq("user_id", user!.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calcular KPIs com memoização
  const kpis = useMemo(() => {
    // Valor total de propostas no período
    const totalPropostas = propostas.reduce((sum, p) => sum + Number(p.valor_total || 0), 0);

    // Valor total de contratos no período
    const totalContratos = contratos.reduce((sum, c) => sum + Number(c.valor_negociado || 0), 0);

    // Valor total a receber (bruto) - soma das parcelas pendentes de todos os contratos
    let totalAReceber = 0;
    let totalAReceberLiquido = 0;

    contratosComParcelas.forEach((contrato) => {
      contrato.parcelas.forEach((parcela) => {
        const valorParcela = Number(parcela.valor_liquido_parcela || 0);
        totalAReceber += valorParcela;
        
        // Líquido a receber = valor da parcela * margem do contrato
        const margemPct = Number(contrato.margem_pct || 0);
        const liquidoParcela = valorParcela * (margemPct / 100);
        totalAReceberLiquido += liquidoParcela;
      });
    });

    const formatCurrency = (value: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

    return {
      totalPropostas: {
        value: formatCurrency(totalPropostas),
      },
      totalContratos: {
        value: formatCurrency(totalContratos),
      },
      totalAReceber: {
        value: formatCurrency(totalAReceber),
      },
      totalAReceberLiquido: {
        value: formatCurrency(totalAReceberLiquido),
      },
    };
  }, [propostas, contratos, contratosComParcelas]);

  // Calcular dados de timeline (últimos 6 meses)
  const timelineData = useMemo((): TimelineData[] => {
    const monthsMap = new Map<string, { bruto: number; custo: number; liquido: number }>();

    // Inicializar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      const key = format(date, "MMM", { locale: ptBR });
      monthsMap.set(key, { bruto: 0, custo: 0, liquido: 0 });
    }

    // Agrupar propostas por mês (usando data da proposta)
    timelinePropostas.forEach((p) => {
      const month = format(new Date(p.data), "MMM", { locale: ptBR });
      const existing = monthsMap.get(month);
      if (existing) {
        const bruto = Number(p.valor_total || 0);
        const liquido = Number(p.liquido || 0);
        const custo = bruto - liquido; // Custo = Bruto - Líquido
        
        existing.bruto += bruto;
        existing.custo += custo;
        existing.liquido += liquido;
      }
    });

    return Array.from(monthsMap.entries()).map(([name, values]) => ({
      name,
      ...values,
    }));
  }, [timelinePropostas, now]);

  // Calcular dados de funil com novas etapas
  const funnelData = useMemo((): FunnelData[] => {
    const stages = ["contato", "visita_agendada", "proposta", "contrato", "execucao", "finalizado"];
    const stageLabels = ["Contato", "Visita Agendada", "Proposta", "Contrato", "Em Execução", "Finalizado"];
    
    const counts = stages.map(stage => 
      leads.filter(l => l.estagio === stage).length
    );

    // Total de leads no início do funil para calcular taxa de conversão
    const totalInicial = counts[0] || 1;

    return stages.map((stage, index) => ({
      stage: stageLabels[index],
      count: counts[index],
      conversionRate: totalInicial > 0 
        ? Math.round((counts[index] / totalInicial) * 100)
        : 0,
    }));
  }, [leads]);

  const isLoading = !user?.id;

  return {
    kpis,
    timelineData,
    funnelData,
    isLoading,
  };
}
