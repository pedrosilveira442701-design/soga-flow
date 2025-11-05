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

export interface WaterfallData {
  name: string;
  value: number;
  type: "increase" | "decrease" | "total";
}

export interface ReceivablesAgingData {
  bucket: string;
  valor: number;
  count: number;
  percentual: number;
}

export interface BurndownData {
  mes: string;
  meta: number;
  realizado: number;
  acumulado_meta: number;
  acumulado_realizado: number;
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

  // Waterfall de Margem
  const { data: waterfallData, isLoading: loadingWaterfall } = useQuery({
    queryKey: ["analytics", "waterfall", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("propostas")
        .select("valor_total, liquido, custo_m2, m2")
        .eq("user_id", user.id)
        .not("valor_total", "is", null)
        .not("liquido", "is", null);

      if (filters.startDate) {
        query = query.gte("data", filters.startDate.toISOString().split("T")[0]);
      }
      if (filters.endDate) {
        query = query.lte("data", filters.endDate.toISOString().split("T")[0]);
      }

      const { data: propostas, error } = await query;
      if (error) throw error;

      // Calcular totais
      const totalBruto = propostas.reduce(
        (sum, p) => sum + parseFloat(String(p.valor_total || 0)),
        0
      );
      const totalLiquido = propostas.reduce(
        (sum, p) => sum + parseFloat(String(p.liquido || 0)),
        0
      );
      const totalCusto = propostas.reduce(
        (sum, p) => sum + parseFloat(String(p.custo_m2 || 0)) * parseFloat(String(p.m2 || 0)),
        0
      );
      const descontos = totalBruto - totalLiquido - totalCusto;

      const result: WaterfallData[] = [
        { name: "Valor Bruto", value: totalBruto, type: "total" },
        { name: "Descontos", value: -Math.abs(descontos), type: "decrease" },
        { name: "Custos", value: -totalCusto, type: "decrease" },
        { name: "Valor Líquido", value: totalLiquido, type: "total" },
      ];

      return result;
    },
    enabled: !!user,
  });

  // Recebíveis Aging
  const { data: receivablesData, isLoading: loadingReceivables } = useQuery({
    queryKey: ["analytics", "receivables", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("financeiro_parcelas")
        .select("vencimento, valor_liquido_parcela, status")
        .eq("user_id", user.id)
        .neq("status", "pago");

      const { data: parcelas, error } = await query;
      if (error) throw error;

      const hoje = new Date();
      const buckets = {
        "1-15 dias": { min: 1, max: 15, valor: 0, count: 0 },
        "16-30 dias": { min: 16, max: 30, valor: 0, count: 0 },
        "31-60 dias": { min: 31, max: 60, valor: 0, count: 0 },
        ">60 dias": { min: 61, max: Infinity, valor: 0, count: 0 },
      };

      parcelas.forEach((parcela) => {
        const vencimento = new Date(parcela.vencimento);
        const diasAtraso = Math.floor(
          (hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)
        );
        const valor = parseFloat(String(parcela.valor_liquido_parcela || 0));

        for (const [bucketName, bucket] of Object.entries(buckets)) {
          if (diasAtraso >= bucket.min && diasAtraso <= bucket.max) {
            bucket.valor += valor;
            bucket.count += 1;
            break;
          }
        }
      });

      const totalValor = Object.values(buckets).reduce((sum, b) => sum + b.valor, 0);

      const result: ReceivablesAgingData[] = Object.entries(buckets).map(
        ([bucket, data]) => ({
          bucket,
          valor: data.valor,
          count: data.count,
          percentual: totalValor > 0 ? (data.valor / totalValor) * 100 : 0,
        })
      );

      return result.filter((r) => r.count > 0);
    },
    enabled: !!user,
  });

  // Burndown de Metas
  const { data: burndownData, isLoading: loadingBurndown } = useQuery({
    queryKey: ["analytics", "burndown", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Buscar metas ativas
      const { data: metas, error: metasError } = await supabase
        .from("metas")
        .select("*")
        .eq("user_id", user.id)
        .eq("tipo", "receita")
        .order("periodo_inicio", { ascending: true });

      if (metasError) throw metasError;

      // Buscar contratos para calcular realizado
      const { data: contratos, error: contratosError } = await supabase
        .from("contratos")
        .select("valor_negociado, data_inicio")
        .eq("user_id", user.id)
        .eq("status", "ativo");

      if (contratosError) throw contratosError;

      // Agrupar por mês
      const monthlyData = new Map<string, { meta: number; realizado: number }>();

      metas.forEach((meta) => {
        const inicio = new Date(meta.periodo_inicio);
        const fim = new Date(meta.periodo_fim);
        const meses = Math.ceil(
          (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        const metaMensal = parseFloat(String(meta.valor_alvo || 0)) / meses;

        let currentDate = new Date(inicio);
        while (currentDate <= fim) {
          const key = `${currentDate.getFullYear()}-${String(
            currentDate.getMonth() + 1
          ).padStart(2, "0")}`;
          if (!monthlyData.has(key)) {
            monthlyData.set(key, { meta: 0, realizado: 0 });
          }
          const data = monthlyData.get(key)!;
          data.meta += metaMensal;
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      });

      contratos.forEach((contrato) => {
        const data_inicio = new Date(contrato.data_inicio);
        const key = `${data_inicio.getFullYear()}-${String(
          data_inicio.getMonth() + 1
        ).padStart(2, "0")}`;
        if (!monthlyData.has(key)) {
          monthlyData.set(key, { meta: 0, realizado: 0 });
        }
        const data = monthlyData.get(key)!;
        data.realizado += parseFloat(String(contrato.valor_negociado || 0));
      });

      // Converter para array e calcular acumulados
      const sortedData = Array.from(monthlyData.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(0, 12); // últimos 12 meses

      let acumuladoMeta = 0;
      let acumuladoRealizado = 0;

      const result: BurndownData[] = sortedData.map(([mes, data]) => {
        acumuladoMeta += data.meta;
        acumuladoRealizado += data.realizado;

        return {
          mes: new Date(mes + "-01").toLocaleDateString("pt-BR", {
            month: "short",
            year: "2-digit",
          }),
          meta: data.meta,
          realizado: data.realizado,
          acumulado_meta: acumuladoMeta,
          acumulado_realizado: acumuladoRealizado,
        };
      });

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
    waterfallData,
    loadingWaterfall,
    receivablesData,
    loadingReceivables,
    burndownData,
    loadingBurndown,
    isLoading:
      loadingFunnel ||
      loadingPipeline ||
      loadingScatter ||
      loadingWaterfall ||
      loadingReceivables ||
      loadingBurndown,
  };
}
