import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export function useDashboard() {
  const { user } = useAuth();

  // Datas para filtros
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const sixMonthsAgo = subMonths(now, 5);

  // 1. Buscar propostas do mês atual
  const { data: currentMonthPropostas = [] } = useQuery({
    queryKey: ["propostas-dashboard-current", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "fechada")
        .gte("created_at", currentMonthStart.toISOString())
        .lte("created_at", currentMonthEnd.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 2. Buscar propostas do mês anterior
  const { data: lastMonthPropostas = [] } = useQuery({
    queryKey: ["propostas-dashboard-last", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "fechada")
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 3. Buscar propostas dos últimos 6 meses para timeline
  const { data: timelinePropostas = [] } = useQuery({
    queryKey: ["propostas-timeline", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "fechada")
        .gte("created_at", sixMonthsAgo.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 4. Buscar parcelas pendentes/atrasadas
  const { data: parcelas = [] } = useQuery({
    queryKey: ["parcelas-dashboard", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro_parcelas")
        .select("valor_liquido_parcela, vencimento")
        .eq("user_id", user!.id)
        .in("status", ["pendente", "atrasado"]);

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
    // Mês atual
    const currentBruto = currentMonthPropostas.reduce((sum, p) => sum + Number(p.valor_total || 0), 0);
    const currentCusto = currentMonthPropostas.reduce((sum, p) => sum + (Number(p.custo_m2 || 0) * Number(p.m2 || 0)), 0);
    const currentLiquido = currentMonthPropostas.reduce((sum, p) => sum + Number(p.liquido || 0), 0);
    const currentMargem = currentBruto > 0 ? (currentLiquido / currentBruto) * 100 : 0;

    // Mês anterior
    const lastBruto = lastMonthPropostas.reduce((sum, p) => sum + Number(p.valor_total || 0), 0);
    const lastCusto = lastMonthPropostas.reduce((sum, p) => sum + (Number(p.custo_m2 || 0) * Number(p.m2 || 0)), 0);
    const lastLiquido = lastMonthPropostas.reduce((sum, p) => sum + Number(p.liquido || 0), 0);
    const lastMargem = lastBruto > 0 ? (lastLiquido / lastBruto) * 100 : 0;

    // A receber
    const aReceber = parcelas.reduce((sum, p) => sum + Number(p.valor_liquido_parcela || 0), 0);

    // Calcular deltas
    const calcDelta = (current: number, last: number): { value: string; direction: "up" | "down" } => {
      if (last === 0) return { value: "+0%", direction: "up" };
      const percent = ((current - last) / last) * 100;
      return {
        value: `${percent >= 0 ? "+" : ""}${percent.toFixed(0)}%`,
        direction: percent >= 0 ? "up" : "down",
      };
    };

    const formatCurrency = (value: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

    return {
      bruto: {
        value: formatCurrency(currentBruto),
        delta: calcDelta(currentBruto, lastBruto),
      },
      custo: {
        value: formatCurrency(currentCusto),
        delta: calcDelta(currentCusto, lastCusto),
      },
      liquido: {
        value: formatCurrency(currentLiquido),
        delta: calcDelta(currentLiquido, lastLiquido),
      },
      margem: {
        value: `${currentMargem.toFixed(1)}%`,
        delta: calcDelta(currentMargem, lastMargem),
      },
      aReceber: {
        value: formatCurrency(aReceber),
        delta: undefined, // A receber não tem comparação
      },
    };
  }, [currentMonthPropostas, lastMonthPropostas, parcelas]);

  // Calcular dados de timeline (últimos 6 meses)
  const timelineData = useMemo((): TimelineData[] => {
    const monthsMap = new Map<string, { bruto: number; custo: number; liquido: number }>();

    // Inicializar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      const key = format(date, "MMM", { locale: ptBR });
      monthsMap.set(key, { bruto: 0, custo: 0, liquido: 0 });
    }

    // Agrupar propostas por mês
    timelinePropostas.forEach((p) => {
      const month = format(new Date(p.created_at), "MMM", { locale: ptBR });
      const existing = monthsMap.get(month);
      if (existing) {
        existing.bruto += Number(p.valor_total || 0);
        existing.custo += Number(p.custo_m2 || 0) * Number(p.m2 || 0);
        existing.liquido += Number(p.liquido || 0);
      }
    });

    return Array.from(monthsMap.entries()).map(([name, values]) => ({
      name,
      ...values,
    }));
  }, [timelinePropostas, now]);

  // Calcular dados de funil
  const funnelData = useMemo((): FunnelData[] => {
    const stages = ["novo", "contato", "qualificado", "proposta", "ganho"];
    const stageLabels = ["Novo", "Contato", "Qualificado", "Proposta", "Ganho"];
    
    const counts = stages.map(stage => 
      leads.filter(l => l.estagio === stage).length
    );

    return stages.map((stage, index) => ({
      stage: stageLabels[index],
      count: counts[index],
      conversionRate: index === 0 
        ? 100 
        : counts[0] > 0 
          ? Math.round((counts[index] / counts[0]) * 100)
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
