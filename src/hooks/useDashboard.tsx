import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek, startOfYear, endOfYear, subWeeks, subYears, differenceInDays } from "date-fns";
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
  const { startDate, endDate, prevStartDate, prevEndDate } = useMemo(() => {
    let start: Date, end: Date, prevStart: Date, prevEnd: Date;

    switch (filters.period) {
      case "week":
        start = startOfWeek(now, { locale: ptBR });
        end = endOfWeek(now, { locale: ptBR });
        prevStart = startOfWeek(subWeeks(now, 1), { locale: ptBR });
        prevEnd = endOfWeek(subWeeks(now, 1), { locale: ptBR });
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        prevStart = startOfMonth(subMonths(now, 1));
        prevEnd = endOfMonth(subMonths(now, 1));
        break;
      case "year":
        start = startOfYear(now);
        end = endOfYear(now);
        prevStart = startOfYear(subYears(now, 1));
        prevEnd = endOfYear(subYears(now, 1));
        break;
      case "custom":
        start = filters.customDateRange?.from || startOfMonth(now);
        end = filters.customDateRange?.to || endOfMonth(now);
        const days = differenceInDays(end, start);
        prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
        prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
        prevStart = startOfMonth(subMonths(now, 1));
        prevEnd = endOfMonth(subMonths(now, 1));
    }

    return {
      startDate: start,
      endDate: end,
      prevStartDate: prevStart,
      prevEndDate: prevEnd,
    };
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

  // 3. Buscar todos os contratos ativos com suas parcelas e margem (filtrado por período)
  const { data: contratosComParcelas = [] } = useQuery({
    queryKey: ["contratos-parcelas", user?.id, filters.period, startDate, endDate],
    queryFn: async () => {
      const { data: contratosData, error: contratosError } = await supabase
        .from("contratos")
        .select("id, margem_pct, valor_negociado")
        .eq("user_id", user!.id)
        .eq("status", "ativo");

      if (contratosError) throw contratosError;

      // Buscar parcelas pendentes que vencem no período selecionado
      const contratosComParcelasData = await Promise.all(
        (contratosData || []).map(async (contrato) => {
          const { data: parcelas } = await supabase
            .from("financeiro_parcelas")
            .select("*")
            .eq("contrato_id", contrato.id)
            .in("status", ["pendente", "atrasado"])
            .gte("data_vencimento", format(startDate, "yyyy-MM-dd"))
            .lte("data_vencimento", format(endDate, "yyyy-MM-dd"));

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

  // 6. Buscar propostas do período anterior
  const { data: propostasAnterior = [] } = useQuery({
    queryKey: ["propostas-anterior", user?.id, filters.period, prevStartDate, prevEndDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .eq("user_id", user!.id)
        .gte("data", format(prevStartDate, "yyyy-MM-dd"))
        .lte("data", format(prevEndDate, "yyyy-MM-dd"));

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 7. Buscar contratos do período anterior
  const { data: contratosAnterior = [] } = useQuery({
    queryKey: ["contratos-anterior", user?.id, filters.period, prevStartDate, prevEndDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("user_id", user!.id)
        .gte("data_inicio", format(prevStartDate, "yyyy-MM-dd"))
        .lte("data_inicio", format(prevEndDate, "yyyy-MM-dd"));

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 8. Buscar parcelas pagas do período atual (para KPI "Recebido")
  const { data: parcelasPagasAtual = [] } = useQuery({
    queryKey: ["parcelas-pagas-atual", user?.id, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro_parcelas")
        .select(`
          valor_liquido_parcela, 
          data_pagamento,
          contratos!inner(margem_pct)
        `)
        .eq("user_id", user!.id)
        .eq("status", "pago")
        .gte("data_pagamento", format(startDate, "yyyy-MM-dd"))
        .lte("data_pagamento", format(endDate, "yyyy-MM-dd"));

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 9. Buscar parcelas pagas do período anterior
  const { data: parcelasPagasAnterior = [] } = useQuery({
    queryKey: ["parcelas-pagas-anterior", user?.id, prevStartDate, prevEndDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro_parcelas")
        .select(`
          valor_liquido_parcela, 
          data_pagamento,
          contratos!inner(margem_pct)
        `)
        .eq("user_id", user!.id)
        .eq("status", "pago")
        .gte("data_pagamento", format(prevStartDate, "yyyy-MM-dd"))
        .lte("data_pagamento", format(prevEndDate, "yyyy-MM-dd"));

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 10. Buscar histórico de recebimentos (últimos 12 meses)
  const twelveMonthsAgo = subMonths(now, 11);
  const { data: historicoRecebimentos = [] } = useQuery({
    queryKey: ["historico-recebimentos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro_parcelas")
        .select("valor_liquido_parcela, data_pagamento")
        .eq("user_id", user!.id)
        .eq("status", "pago")
        .gte("data_pagamento", format(twelveMonthsAgo, "yyyy-MM-dd"))
        .lte("data_pagamento", format(now, "yyyy-MM-dd"))
        .order("data_pagamento", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });


  // Calcular KPIs com memoização e comparação com período anterior
  const kpis = useMemo(() => {
    // Função auxiliar para calcular delta
    const calculateDelta = (atual: number, anterior: number): { value: string; direction: "up" | "down" } | undefined => {
      if (anterior === 0) {
        return atual > 0 
          ? { value: "+100%", direction: "up" }
          : undefined;
      }
      const percentual = ((atual - anterior) / anterior) * 100;
      const direction: "up" | "down" = percentual >= 0 ? "up" : "down";
      const sinal = percentual >= 0 ? "+" : "";
      return {
        value: `${sinal}${percentual.toFixed(1)}%`,
        direction,
      };
    };

    const formatCurrency = (value: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

    // PERÍODO ATUAL
    const todasPropostas = propostas.reduce((sum, p) => sum + Number(p.valor_total || 0), 0);
    const propostasPerdidas = propostas
      .filter(p => p.status === 'perdida')
      .reduce((sum, p) => sum + Number(p.valor_total || 0), 0);
    const propostasRepouso = propostas
      .filter(p => p.status === 'repouso')
      .reduce((sum, p) => sum + Number(p.valor_total || 0), 0);
    const totalPropostas = todasPropostas - propostasPerdidas - propostasRepouso;
    
    const totalContratos = contratos.reduce((sum, c) => sum + Number(c.valor_negociado || 0), 0);
    
    // Calcular valor bruto recebido (sem aplicar margem)
    const recebidoBrutoAtual = parcelasPagasAtual.reduce((sum, p) => {
      return sum + Number(p.valor_liquido_parcela || 0);
    }, 0);
    
    const recebidoBrutoAnterior = parcelasPagasAnterior.reduce((sum, p) => {
      return sum + Number(p.valor_liquido_parcela || 0);
    }, 0);
    
    // Calcular margem líquida real das parcelas pagas (valor × margem%)
    const recebidoLiquidoAtual = parcelasPagasAtual.reduce((sum, p) => {
      const valorParcela = Number(p.valor_liquido_parcela || 0);
      const margemPct = Number((p.contratos as any)?.margem_pct || 0);
      return sum + (valorParcela * (margemPct / 100));
    }, 0);
    
    const recebidoLiquidoAnterior = parcelasPagasAnterior.reduce((sum, p) => {
      const valorParcela = Number(p.valor_liquido_parcela || 0);
      const margemPct = Number((p.contratos as any)?.margem_pct || 0);
      return sum + (valorParcela * (margemPct / 100));
    }, 0);

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

    // Contadores de propostas por status
    const countTotal = propostas.length;
    const countPerdidas = propostas.filter(p => p.status === 'perdida').length;
    const countRepouso = propostas.filter(p => p.status === 'repouso').length;
    const countAtivas = countTotal - countPerdidas - countRepouso;

    // PERÍODO ANTERIOR
    const todasPropostasAnterior = propostasAnterior.reduce((sum, p) => sum + Number(p.valor_total || 0), 0);
    const propostasPerdidasAnterior = propostasAnterior
      .filter(p => p.status === 'perdida')
      .reduce((sum, p) => sum + Number(p.valor_total || 0), 0);
    const propostasRepousoAnterior = propostasAnterior
      .filter(p => p.status === 'repouso')
      .reduce((sum, p) => sum + Number(p.valor_total || 0), 0);
    const totalPropostasAnterior = todasPropostasAnterior - propostasPerdidasAnterior - propostasRepousoAnterior;
    
    const totalContratosAnterior = contratosAnterior.reduce((sum, c) => sum + Number(c.valor_negociado || 0), 0);
    const recebidoAnterior = parcelasPagasAnterior.reduce((sum, p) => sum + Number(p.valor_liquido_parcela || 0), 0);

    // Contadores do período anterior
    const countTotalAnterior = propostasAnterior.length;
    const countPerdidasAnterior = propostasAnterior.filter(p => p.status === 'perdida').length;
    const countRepousoAnterior = propostasAnterior.filter(p => p.status === 'repouso').length;
    const countAtivasAnterior = countTotalAnterior - countPerdidasAnterior - countRepousoAnterior;

    return {
      recebidoMes: {
        value: formatCurrency(recebidoBrutoAtual),
        delta: calculateDelta(recebidoBrutoAtual, recebidoBrutoAnterior),
      },
      totalPropostas: {
        value: formatCurrency(totalPropostas),
        delta: calculateDelta(totalPropostas, totalPropostasAnterior),
      },
      totalContratos: {
        value: formatCurrency(totalContratos),
        delta: calculateDelta(totalContratos, totalContratosAnterior),
      },
      totalAReceber: {
        value: formatCurrency(totalAReceber),
      },
      totalAReceberLiquido: {
        value: formatCurrency(totalAReceberLiquido),
      },
      totalRecebidoLiquido: {
        value: formatCurrency(recebidoLiquidoAtual),
        delta: calculateDelta(recebidoLiquidoAtual, recebidoLiquidoAnterior),
      },
      // Novos KPIs de Pipeline
      totalPropostasCount: {
        value: formatCurrency(todasPropostas),
        subValue: `${countTotal} proposta${countTotal !== 1 ? 's' : ''}`,
        delta: calculateDelta(todasPropostas, todasPropostasAnterior),
      },
      propostasPerdidas: {
        value: formatCurrency(propostasPerdidas),
        subValue: `${countPerdidas} proposta${countPerdidas !== 1 ? 's' : ''}`,
        delta: calculateDelta(propostasPerdidas, propostasPerdidasAnterior),
      },
      propostasRepouso: {
        value: formatCurrency(propostasRepouso),
        subValue: `${countRepouso} proposta${countRepouso !== 1 ? 's' : ''}`,
        delta: calculateDelta(propostasRepouso, propostasRepousoAnterior),
      },
      propostasAtivas: {
        value: formatCurrency(totalPropostas),
        subValue: `${countAtivas} proposta${countAtivas !== 1 ? 's' : ''}`,
        delta: calculateDelta(totalPropostas, totalPropostasAnterior),
      },
      // Dados para o gráfico
      pipelineDistribution: [
        { 
          name: 'Total', 
          value: todasPropostas, 
          count: countTotal,
          color: '#2E90FA' 
        },
        { 
          name: 'Perdidas', 
          value: propostasPerdidas, 
          count: countPerdidas,
          color: '#F04438' 
        },
        { 
          name: 'Repouso', 
          value: propostasRepouso, 
          count: countRepouso,
          color: '#FDB022' 
        },
        { 
          name: 'Ativas', 
          value: totalPropostas, 
          count: countAtivas,
          color: '#12B76A' 
        },
      ],
    };
  }, [propostas, contratos, contratosComParcelas, propostasAnterior, contratosAnterior, parcelasPagasAtual, parcelasPagasAnterior]);

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
    const stages = ["contato", "visita_agendada", "visita_realizada", "proposta_pendente", "proposta", "contrato", "execucao", "finalizado"];
    const stageLabels = ["Contato", "Visita Agendada", "Visita Realizada", "Proposta Pendente", "Proposta", "Contrato", "Em Execução", "Finalizado"];
    
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

  // Calcular tendência de recebimentos (últimos 12 meses)
  const recebimentosTendencia = useMemo(() => {
    const mesesMap = new Map<string, number>();

    // Inicializar últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(now, i);
      const key = format(date, "yyyy-MM");
      const label = format(date, "MMM/yy", { locale: ptBR });
      mesesMap.set(key, 0);
    }

    // Agrupar recebimentos por mês usando data_pagamento
    historicoRecebimentos.forEach((parcela) => {
      if (parcela.data_pagamento) {
        const mes = parcela.data_pagamento.slice(0, 7); // yyyy-MM
        if (mesesMap.has(mes)) {
          mesesMap.set(mes, mesesMap.get(mes)! + Number(parcela.valor_liquido_parcela || 0));
        }
      }
    });

    // Mês atual para destacar
    const mesAtual = format(now, "yyyy-MM");

    return Array.from(mesesMap.entries()).map(([key, valor]) => ({
      mes: format(new Date(key + "-01"), "MMM/yy", { locale: ptBR }),
      valor,
      isAtual: key === mesAtual,
    }));
  }, [historicoRecebimentos, now]);

  const isLoading = !user?.id;

  return {
    kpis,
    timelineData,
    funnelData,
    recebimentosTendencia,
    isLoading,
  };
}
