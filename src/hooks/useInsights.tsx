import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface InsightFilters {
  period: "today" | "this_month" | "last_90" | "custom";
  startDate?: string;
  endDate?: string;
  canal?: string;
  servico?: string;
  cliente?: string;
  cidade?: string;
  bairro?: string;
}

export interface InsightResult {
  data: Record<string, unknown>[];
  kpis: Record<string, number | string>;
  sql: string;
  chartType: string;
  xAxis: string;
  yAxis: string[];
  confidence: number;
  explanation: string;
  usedFallback: boolean;
  rowCount: number;
  executionTimeMs: number;
  cached: boolean;
  cacheHash: string;
  nextSteps: string[];
}

export interface SavedReport {
  id: string;
  nome: string;
  descricao: string | null;
  pergunta: string;
  sql_query: string;
  filtros: Record<string, unknown>;
  chart_type: string;
  created_at: string;
  updated_at: string;
}

export interface ReportSchedule {
  id: string;
  relatorio_id: string;
  frequencia: "diario" | "semanal" | "mensal";
  hora: string;
  dia_semana: number | null;
  dia_mes: number | null;
  destinatarios: string[];
  ativo: boolean;
  ultimo_envio: string | null;
  proximo_envio: string | null;
}

const FALLBACK_REPORTS = [
  { key: "vendas_mes_cliente", label: "Vendas do mês por cliente" },
  { key: "margem_ultimos_6_meses", label: "Margem % nos últimos 6 meses" },
  { key: "melhor_canal", label: "Melhor canal de vendas" },
  { key: "funil_por_estagio", label: "Funil por estágio" },
  { key: "servicos_mais_vendidos", label: "Serviços mais vendidos" },
  { key: "geografia_vendas", label: "Vendas por região" },
  { key: "aging_propostas", label: "Aging de propostas" },
  { key: "previsao_recebiveis", label: "Previsão de recebíveis" },
];

export function useInsights() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isQuerying, setIsQuerying] = useState(false);
  const [lastResult, setLastResult] = useState<InsightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Buscar relatórios salvos
  const { data: savedReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ["insights-reports", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights_relatorios")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as SavedReport[];
    },
    enabled: !!user,
  });

  // Buscar agendamentos
  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ["insights-schedules", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights_agendamentos")
        .select("*")
        .order("proximo_envio", { ascending: true });

      if (error) throw error;
      return data as ReportSchedule[];
    },
    enabled: !!user,
  });

  // Executar consulta
  const executeQuery = useCallback(async (
    pergunta: string,
    filtros: InsightFilters
  ): Promise<InsightResult | null> => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return null;
    }

    setIsQuerying(true);
    setError(null);

    try {
      // Converter filtros de período para datas
      const processedFilters: Record<string, string | undefined> = { ...filtros };
      const now = new Date();

      if (filtros.period === "today") {
        processedFilters.startDate = now.toISOString().split("T")[0];
        processedFilters.endDate = now.toISOString().split("T")[0];
      } else if (filtros.period === "this_month") {
        processedFilters.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        processedFilters.endDate = now.toISOString().split("T")[0];
      } else if (filtros.period === "last_90") {
        const past = new Date(now);
        past.setDate(past.getDate() - 90);
        processedFilters.startDate = past.toISOString().split("T")[0];
        processedFilters.endDate = now.toISOString().split("T")[0];
      }

      const { data, error: fnError } = await supabase.functions.invoke("insights-query", {
        body: { pergunta, filtros: processedFilters },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        setError(data.error);
        toast.error(data.error);
        return null;
      }

      setLastResult(data as InsightResult);
      return data as InsightResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao processar consulta";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsQuerying(false);
    }
  }, [user]);

  // Executar relatório pronto (fallback)
  const executeFallbackReport = useCallback(async (
    fallbackKey: string,
    filtros: InsightFilters
  ): Promise<InsightResult | null> => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return null;
    }

    setIsQuerying(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("insights-query", {
        body: { fallbackKey, filtros },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        setError(data.error);
        toast.error(data.error);
        return null;
      }

      setLastResult(data as InsightResult);
      return data as InsightResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao processar consulta";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsQuerying(false);
    }
  }, [user]);

  // Salvar relatório
  const saveReport = useMutation({
    mutationFn: async (params: {
      nome: string;
      descricao?: string;
      pergunta: string;
      sql_query: string;
      filtros: Record<string, unknown>;
      chart_type: string;
    }) => {
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("insights_relatorios")
        .insert([{
          user_id: user.id,
          nome: params.nome,
          descricao: params.descricao,
          pergunta: params.pergunta,
          sql_query: params.sql_query,
          filtros: JSON.parse(JSON.stringify(params.filtros)),
          chart_type: params.chart_type,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights-reports"] });
      toast.success("Relatório salvo com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Excluir relatório
  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("insights_relatorios")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights-reports"] });
      toast.success("Relatório excluído!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Criar agendamento
  const createSchedule = useMutation({
    mutationFn: async (params: {
      relatorio_id: string;
      frequencia: "diario" | "semanal" | "mensal";
      hora: string;
      dia_semana?: number;
      dia_mes?: number;
      destinatarios: string[];
    }) => {
      if (!user) throw new Error("Não autenticado");

      // Calcular próximo envio
      const now = new Date();
      let proximo_envio = new Date();
      const [hours, minutes] = params.hora.split(":").map(Number);
      proximo_envio.setHours(hours, minutes, 0, 0);

      if (proximo_envio <= now) {
        proximo_envio.setDate(proximo_envio.getDate() + 1);
      }

      const { data, error } = await supabase
        .from("insights_agendamentos")
        .insert({
          user_id: user.id,
          relatorio_id: params.relatorio_id,
          frequencia: params.frequencia,
          hora: params.hora,
          dia_semana: params.dia_semana,
          dia_mes: params.dia_mes,
          destinatarios: params.destinatarios,
          proximo_envio: proximo_envio.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights-schedules"] });
      toast.success("Agendamento criado!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Excluir agendamento
  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("insights_agendamentos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights-schedules"] });
      toast.success("Agendamento excluído!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Toggle agendamento
  const toggleSchedule = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("insights_agendamentos")
        .update({ ativo })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights-schedules"] });
    },
  });

  // Limpar cache
  const clearCache = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from("insights_cache")
      .delete()
      .eq("user_id", user.id);

    if (!error) {
      toast.success("Cache limpo!");
      setLastResult(null);
    }
  }, [user]);

  return {
    // Estado
    isQuerying,
    lastResult,
    error,
    savedReports,
    schedules,
    loadingReports,
    loadingSchedules,
    fallbackReports: FALLBACK_REPORTS,

    // Ações
    executeQuery,
    executeFallbackReport,
    saveReport,
    deleteReport,
    createSchedule,
    deleteSchedule,
    toggleSchedule,
    clearCache,
    setLastResult,
  };
}
