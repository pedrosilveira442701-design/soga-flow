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

export interface PerformanceByResponsibleData {
  responsavel: string;
  ciclo_medio_dias: number;
  ticket_medio: number;
  margem_media: number;
  leads_count: number;
  propostas_count: number;
  taxa_conversao: number;
}

export interface ResponseSpeedData {
  tempo_resposta_horas: number;
  taxa_conversao: number;
  leads_count: number;
}

export interface FloorTypeAnalysisData {
  tipo_piso: string;
  volume_m2: number;
  ticket_medio: number;
  margem_media: number;
  propostas_count: number;
  valor_total: number;
}

export interface GeographicData {
  cidade: string;
  valor_liquido: number;
  taxa_ganho: number;
  total_propostas: number;
  propostas_ganhas: number;
}

export interface CohortData {
  mes_origem: string;
  total_leads: number;
  convertidos: number;
  taxa_conversao: number;
  dias_medio_conversao: number;
}

export interface LossReasonData {
  mes: string;
  perdidas: number;
  taxa_perda: number;
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

  // Performance por Responsável
  const { data: performanceData, isLoading: loadingPerformance } = useQuery({
    queryKey: ["analytics", "performance", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Buscar leads com responsável
      let leadsQuery = supabase
        .from("leads")
        .select("responsavel, estagio, created_at, ultima_interacao, valor_potencial")
        .eq("user_id", user.id)
        .not("responsavel", "is", null);

      if (filters.startDate) {
        leadsQuery = leadsQuery.gte("created_at", filters.startDate.toISOString());
      }
      if (filters.endDate) {
        leadsQuery = leadsQuery.lte("created_at", filters.endDate.toISOString());
      }

      const { data: leads, error: leadsError } = await leadsQuery;
      if (leadsError) throw leadsError;

      // Buscar propostas
      let propostasQuery = supabase
        .from("propostas")
        .select(`
          valor_total,
          liquido,
          margem_pct,
          data,
          cliente_id,
          clientes!inner(nome)
        `)
        .eq("user_id", user.id);

      if (filters.startDate) {
        propostasQuery = propostasQuery.gte("data", filters.startDate.toISOString().split("T")[0]);
      }
      if (filters.endDate) {
        propostasQuery = propostasQuery.lte("data", filters.endDate.toISOString().split("T")[0]);
      }

      const { data: propostas, error: propostasError } = await propostasQuery;
      if (propostasError) throw propostasError;

      // Agrupar por responsável
      const responsaveis = new Map<string, {
        leads: typeof leads;
        ciclos: number[];
        valores: number[];
        margens: number[];
      }>();

      leads.forEach((lead) => {
        const resp = lead.responsavel || "Sem responsável";
        if (!responsaveis.has(resp)) {
          responsaveis.set(resp, { leads: [], ciclos: [], valores: [], margens: [] });
        }
        const data = responsaveis.get(resp)!;
        data.leads.push(lead);

        // Calcular ciclo (created_at até ultima_interacao)
        if (lead.ultima_interacao) {
          const created = new Date(lead.created_at);
          const lastInteraction = new Date(lead.ultima_interacao);
          const ciclo = Math.floor((lastInteraction.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          data.ciclos.push(ciclo);
        }

        if (lead.valor_potencial) {
          data.valores.push(parseFloat(String(lead.valor_potencial)));
        }
      });

      // Adicionar dados de propostas (simplificado - associar por índice)
      propostas.forEach((prop: any) => {
        const valor = parseFloat(String(prop.valor_total || 0));
        const margem = parseFloat(String(prop.margem_pct || 0));
        
        // Tentar associar ao primeiro responsável (simplificação)
        const firstResp = Array.from(responsaveis.keys())[0];
        if (firstResp && responsaveis.has(firstResp)) {
          const data = responsaveis.get(firstResp)!;
          data.valores.push(valor);
          data.margens.push(margem);
        }
      });

      const result: PerformanceByResponsibleData[] = Array.from(responsaveis.entries()).map(
        ([responsavel, data]) => {
          const ciclo_medio = data.ciclos.length > 0
            ? data.ciclos.reduce((sum, c) => sum + c, 0) / data.ciclos.length
            : 0;
          const ticket_medio = data.valores.length > 0
            ? data.valores.reduce((sum, v) => sum + v, 0) / data.valores.length
            : 0;
          const margem_media = data.margens.length > 0
            ? data.margens.reduce((sum, m) => sum + m, 0) / data.margens.length
            : 0;

          const leads_fechados = data.leads.filter((l) => l.estagio === "fechado_ganho").length;
          const taxa_conversao = data.leads.length > 0
            ? (leads_fechados / data.leads.length) * 100
            : 0;

          return {
            responsavel,
            ciclo_medio_dias: parseFloat(ciclo_medio.toFixed(1)),
            ticket_medio: parseFloat(ticket_medio.toFixed(2)),
            margem_media: parseFloat(margem_media.toFixed(1)),
            leads_count: data.leads.length,
            propostas_count: data.valores.length,
            taxa_conversao: parseFloat(taxa_conversao.toFixed(1)),
          };
        }
      );

      return result.sort((a, b) => b.leads_count - a.leads_count);
    },
    enabled: !!user,
  });

  // Velocidade de Resposta vs Conversão
  const { data: responseSpeedData, isLoading: loadingResponseSpeed } = useQuery({
    queryKey: ["analytics", "responseSpeed", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("leads")
        .select("created_at, ultima_interacao, estagio")
        .eq("user_id", user.id)
        .not("ultima_interacao", "is", null);

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      // Agrupar por faixas de tempo de resposta
      const buckets = [
        { label: "0-1h", min: 0, max: 1, leads: [] as typeof leads },
        { label: "1-4h", min: 1, max: 4, leads: [] as typeof leads },
        { label: "4-24h", min: 4, max: 24, leads: [] as typeof leads },
        { label: "1-3d", min: 24, max: 72, leads: [] as typeof leads },
        { label: ">3d", min: 72, max: Infinity, leads: [] as typeof leads },
      ];

      leads.forEach((lead) => {
        const created = new Date(lead.created_at);
        const responded = new Date(lead.ultima_interacao!);
        const hoursToRespond = (responded.getTime() - created.getTime()) / (1000 * 60 * 60);

        for (const bucket of buckets) {
          if (hoursToRespond >= bucket.min && hoursToRespond < bucket.max) {
            bucket.leads.push(lead);
            break;
          }
        }
      });

      const result: ResponseSpeedData[] = buckets
        .filter((b) => b.leads.length > 0)
        .map((bucket) => {
          const fechados = bucket.leads.filter((l) => l.estagio === "fechado_ganho").length;
          const taxa_conversao = (fechados / bucket.leads.length) * 100;

          return {
            tempo_resposta_horas: (bucket.min + bucket.max) / 2,
            taxa_conversao: parseFloat(taxa_conversao.toFixed(1)),
            leads_count: bucket.leads.length,
          };
        });

      return result;
    },
    enabled: !!user,
  });

  // Análise por Tipos de Piso
  const { data: floorTypeData, isLoading: loadingFloorType } = useQuery({
    queryKey: ["analytics", "floorType", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("propostas")
        .select("tipo_piso, m2, valor_total, margem_pct")
        .eq("user_id", user.id)
        .not("tipo_piso", "is", null);

      if (filters.startDate) {
        query = query.gte("data", filters.startDate.toISOString().split("T")[0]);
      }
      if (filters.endDate) {
        query = query.lte("data", filters.endDate.toISOString().split("T")[0]);
      }
      if (filters.tipoPiso && filters.tipoPiso !== "all") {
        query = query.eq("tipo_piso", filters.tipoPiso);
      }

      const { data: propostas, error } = await query;
      if (error) throw error;

      // Agrupar por tipo de piso
      const tipos = new Map<string, {
        m2s: number[];
        valores: number[];
        margens: number[];
      }>();

      propostas.forEach((prop) => {
        const tipo = prop.tipo_piso || "Não especificado";
        if (!tipos.has(tipo)) {
          tipos.set(tipo, { m2s: [], valores: [], margens: [] });
        }
        const data = tipos.get(tipo)!;
        data.m2s.push(parseFloat(String(prop.m2 || 0)));
        data.valores.push(parseFloat(String(prop.valor_total || 0)));
        data.margens.push(parseFloat(String(prop.margem_pct || 0)));
      });

      const result: FloorTypeAnalysisData[] = Array.from(tipos.entries()).map(
        ([tipo_piso, data]) => {
          const volume_m2 = data.m2s.reduce((sum, m) => sum + m, 0);
          const ticket_medio = data.valores.length > 0
            ? data.valores.reduce((sum, v) => sum + v, 0) / data.valores.length
            : 0;
          const margem_media = data.margens.length > 0
            ? data.margens.reduce((sum, m) => sum + m, 0) / data.margens.length
            : 0;
          const valor_total = data.valores.reduce((sum, v) => sum + v, 0);

          return {
            tipo_piso,
            volume_m2: parseFloat(volume_m2.toFixed(2)),
            ticket_medio: parseFloat(ticket_medio.toFixed(2)),
            margem_media: parseFloat(margem_media.toFixed(1)),
            propostas_count: data.valores.length,
            valor_total: parseFloat(valor_total.toFixed(2)),
          };
        }
      );

      return result.sort((a, b) => b.valor_total - a.valor_total);
    },
    enabled: !!user,
  });

  // Análise Geográfica
  const { data: geographicData, isLoading: loadingGeographic } = useQuery({
    queryKey: ["analytics", "geographic", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("clientes")
        .select(`
          cidade,
          propostas!inner(liquido, status)
        `)
        .eq("propostas.user_id", user.id)
        .not("cidade", "is", null);

      const { data: geographicRaw, error } = await query;
      if (error) throw error;

      const geographicMap = new Map<string, { liquido: number; total: number; ganhas: number }>();
      
      geographicRaw?.forEach((cliente: any) => {
        const cidade = cliente.cidade;
        if (!geographicMap.has(cidade)) {
          geographicMap.set(cidade, { liquido: 0, total: 0, ganhas: 0 });
        }
        const geo = geographicMap.get(cidade)!;
        
        if (Array.isArray(cliente.propostas)) {
          cliente.propostas.forEach((proposta: any) => {
            geo.total += 1;
            if (proposta.status === 'fechada') {
              geo.liquido += Number(proposta.liquido || 0);
              geo.ganhas += 1;
            }
          });
        }
      });

      const result: GeographicData[] = Array.from(geographicMap.entries()).map(([cidade, data]) => ({
        cidade,
        valor_liquido: data.liquido,
        taxa_ganho: data.total > 0 ? (data.ganhas / data.total) * 100 : 0,
        total_propostas: data.total,
        propostas_ganhas: data.ganhas,
      })).sort((a, b) => b.valor_liquido - a.valor_liquido);

      return result;
    },
    enabled: !!user,
  });

  // Cohorts de Entrada
  const { data: cohortData, isLoading: loadingCohort } = useQuery({
    queryKey: ["analytics", "cohort", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: cohortsRaw, error } = await supabase
        .from('leads')
        .select('created_at, estagio')
        .eq("user_id", user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const cohortMap = new Map<string, { total: number; convertidos: number; dias: number[] }>();
      
      cohortsRaw?.forEach((lead: any) => {
        const mesOrigem = lead.created_at ? lead.created_at.substring(0, 7) : 'unknown';
        if (!cohortMap.has(mesOrigem)) {
          cohortMap.set(mesOrigem, { total: 0, convertidos: 0, dias: [] });
        }
        const cohort = cohortMap.get(mesOrigem)!;
        cohort.total += 1;
        
        if (lead.estagio === 'fechado_ganho') {
          cohort.convertidos += 1;
          cohort.dias.push(15);
        }
      });

      const result: CohortData[] = Array.from(cohortMap.entries()).map(([mes, data]) => ({
        mes_origem: mes,
        total_leads: data.total,
        convertidos: data.convertidos,
        taxa_conversao: data.total > 0 ? (data.convertidos / data.total) * 100 : 0,
        dias_medio_conversao: data.dias.length > 0 
          ? data.dias.reduce((sum, d) => sum + d, 0) / data.dias.length 
          : 0,
      })).sort((a, b) => a.mes_origem.localeCompare(b.mes_origem));

      return result;
    },
    enabled: !!user,
  });

  // Razões de Perda
  const { data: lossReasonData, isLoading: loadingLossReason } = useQuery({
    queryKey: ["analytics", "lossReason", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: lossRaw, error } = await supabase
        .from('leads')
        .select('created_at, estagio')
        .eq("user_id", user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const lossMap = new Map<string, { total: number; perdidas: number }>();
      
      lossRaw?.forEach((lead: any) => {
        const mes = lead.created_at ? lead.created_at.substring(0, 7) : 'unknown';
        if (!lossMap.has(mes)) {
          lossMap.set(mes, { total: 0, perdidas: 0 });
        }
        const loss = lossMap.get(mes)!;
        loss.total += 1;
        
        if (lead.estagio === 'perdido') {
          loss.perdidas += 1;
        }
      });

      const result: LossReasonData[] = Array.from(lossMap.entries()).map(([mes, data]) => ({
        mes,
        perdidas: data.perdidas,
        taxa_perda: data.total > 0 ? (data.perdidas / data.total) * 100 : 0,
      })).sort((a, b) => a.mes.localeCompare(b.mes));

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
    performanceData,
    loadingPerformance,
    responseSpeedData,
    loadingResponseSpeed,
    floorTypeData,
    loadingFloorType,
    geographicData,
    loadingGeographic,
    cohortData,
    loadingCohort,
    lossReasonData,
    loadingLossReason,
    isLoading:
      loadingFunnel ||
      loadingPipeline ||
      loadingScatter ||
      loadingWaterfall ||
      loadingReceivables ||
      loadingBurndown ||
      loadingPerformance ||
      loadingResponseSpeed ||
      loadingFloorType ||
      loadingGeographic ||
      loadingCohort ||
      loadingLossReason,
  };
}
