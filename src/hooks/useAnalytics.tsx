import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  responsavel?: string;
  origem?: string;
  tipoPiso?: string;
  cidade?: string;
}

export interface FunnelStageData {
  estagio: string;
  count: number;
  taxa_conversao: number;
  tempo_medio_dias: number;
}

export interface PipelineData {
  estagio: string;
  valor_ponderado: number;
  count: number;
  probabilidade: number;
}

export interface ScatterDataPoint {
  valor_m2: number;
  margem_pct: number;
  tipo_piso: string;
  m2: number;
  cliente_nome: string;
}

// Probabilidades por estágio (configuráveis futuramente)
const STAGE_PROBABILITIES: Record<string, number> = {
  novo: 0.1,
  contato: 0.3,
  negociacao: 0.5,
  proposta_enviada: 0.7,
  fechado_ganho: 1.0,
  perdido: 0.0,
};

const STAGE_LABELS: Record<string, string> = {
  novo: "Novo",
  contato: "Contato",
  negociacao: "Negociação",
  proposta_enviada: "Proposta Enviada",
  fechado_ganho: "Fechado",
  perdido: "Perdido",
};

export function useAnalytics(filters: AnalyticsFilters = {}) {
  const { user } = useAuth();

  // Funil de Conversão
  const { data: funnelData, isLoading: loadingFunnel } = useQuery({
    queryKey: ["analytics", "funnel", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("leads")
        .select("estagio, created_at, ultima_interacao, cliente_id")
        .eq("user_id", user.id);

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }
      if (filters.responsavel) {
        query = query.eq("responsavel", filters.responsavel);
      }
      if (filters.origem) {
        query = query.eq("origem", filters.origem);
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      // Agrupar por estágio e calcular métricas
      const stageGroups = leads.reduce((acc, lead) => {
        if (!acc[lead.estagio]) {
          acc[lead.estagio] = [];
        }
        acc[lead.estagio].push(lead);
        return acc;
      }, {} as Record<string, typeof leads>);

      const totalLeads = leads.length;
      const stages = ["novo", "contato", "negociacao", "proposta_enviada", "fechado_ganho", "perdido"];

      const result: FunnelStageData[] = stages.map((estagio) => {
        const stageLeads = stageGroups[estagio] || [];
        const count = stageLeads.length;
        const taxa_conversao = totalLeads > 0 ? (count / totalLeads) * 100 : 0;

        // Calcular tempo médio no estágio
        const tempos = stageLeads
          .filter((lead) => lead.ultima_interacao)
          .map((lead) => {
            const created = new Date(lead.created_at);
            const lastInteraction = new Date(lead.ultima_interacao!);
            return Math.floor((lastInteraction.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          });

        const tempo_medio_dias = tempos.length > 0
          ? tempos.reduce((sum, t) => sum + t, 0) / tempos.length
          : 0;

        return {
          estagio: STAGE_LABELS[estagio] || estagio,
          count,
          taxa_conversao: parseFloat(taxa_conversao.toFixed(1)),
          tempo_medio_dias: parseFloat(tempo_medio_dias.toFixed(1)),
        };
      });

      return result.filter((stage) => stage.count > 0);
    },
    enabled: !!user,
  });

  // Pipeline Ponderado
  const { data: pipelineData, isLoading: loadingPipeline } = useQuery({
    queryKey: ["analytics", "pipeline", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("leads")
        .select("estagio, valor_potencial")
        .eq("user_id", user.id)
        .not("estagio", "eq", "perdido");

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }
      if (filters.responsavel) {
        query = query.eq("responsavel", filters.responsavel);
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      // Agrupar por estágio e calcular valor ponderado
      const stageGroups = leads.reduce((acc, lead) => {
        if (!acc[lead.estagio]) {
          acc[lead.estagio] = [];
        }
        acc[lead.estagio].push(lead);
        return acc;
      }, {} as Record<string, typeof leads>);

      const stages = ["novo", "contato", "negociacao", "proposta_enviada", "fechado_ganho"];

      const result: PipelineData[] = stages.map((estagio) => {
        const stageLeads = stageGroups[estagio] || [];
        const probabilidade = STAGE_PROBABILITIES[estagio] || 0;
        const valor_ponderado = stageLeads.reduce((sum, lead) => {
          const valor = parseFloat(String(lead.valor_potencial || 0));
          return sum + valor * probabilidade;
        }, 0);

        return {
          estagio: STAGE_LABELS[estagio] || estagio,
          valor_ponderado: parseFloat(valor_ponderado.toFixed(2)),
          count: stageLeads.length,
          probabilidade: probabilidade * 100,
        };
      });

      return result.filter((stage) => stage.count > 0);
    },
    enabled: !!user,
  });

  // Scatter Preço x Margem
  const { data: scatterData, isLoading: loadingScatter } = useQuery({
    queryKey: ["analytics", "scatter", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("propostas")
        .select(`
          valor_m2,
          margem_pct,
          tipo_piso,
          m2,
          cliente_id,
          clientes!inner(nome, cidade)
        `)
        .eq("user_id", user.id)
        .not("margem_pct", "is", null);

      if (filters.startDate) {
        query = query.gte("data", filters.startDate.toISOString().split("T")[0]);
      }
      if (filters.endDate) {
        query = query.lte("data", filters.endDate.toISOString().split("T")[0]);
      }
      if (filters.tipoPiso) {
        query = query.eq("tipo_piso", filters.tipoPiso);
      }
      if (filters.cidade) {
        query = query.eq("clientes.cidade", filters.cidade);
      }

      const { data: propostas, error } = await query;
      if (error) throw error;

      const result: ScatterDataPoint[] = propostas.map((prop: any) => ({
        valor_m2: parseFloat(String(prop.valor_m2 || "0")),
        margem_pct: parseFloat(String(prop.margem_pct || "0")),
        tipo_piso: prop.tipo_piso || "Não especificado",
        m2: parseFloat(String(prop.m2 || "0")),
        cliente_nome: prop.clientes?.nome || "Sem nome",
      }));

      return result;
    },
    enabled: !!user,
  });

  return {
    funnelData,
    loadingFunnel,
    pipelineData,
    loadingPipeline,
    scatterData,
    loadingScatter,
    isLoading: loadingFunnel || loadingPipeline || loadingScatter,
  };
}
