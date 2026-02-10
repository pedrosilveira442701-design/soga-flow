import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, format, subMonths, differenceInDays } from "date-fns";

export interface ForecastFilters {
  outlierLimit: number; // dias máximo
}

export interface ForecastKPIs {
  p25: number;
  p50: number;
  p75: number;
  taxaConversao: number;
  ticketMedio: number;
  totalFechadas: number;
  totalEnviadas: number;
  percentualOutliers: number;
  outlierCount: number;
  sampleWarning: boolean;
}

export interface ForecastMonthData {
  mes: string;
  p25: number;
  p50: number;
  p75: number;
  propostasCount: number;
}

export interface MetaGapData {
  mes: string;
  meta: number;
  projetado: number;
  gap: number;
  propostasNecessarias: number;
}

export interface HistogramBin {
  range: string;
  rangeStart: number;
  count: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

interface PropostaAberta {
  data: string;
  valor_total: number;
  liquido: number;
}

export function useForecast(filters: ForecastFilters = { outlierLimit: 180 }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["forecast", filters.outlierLimit, user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Janela móvel de 12 meses
      const dataLimite12m = subMonths(new Date(), 12);
      const dataLimite12mStr = format(dataLimite12m, "yyyy-MM-dd");

      // Run all independent queries in parallel
      const [contratosResult, enviadasResult, abertasResult, metasResult] =
        await Promise.all([
          // 1) Contratos com proposta vinculada (fonte de verdade para fechamento)
          supabase
            .from("contratos")
            .select("proposta_id, created_at, data_inicio, valor_negociado")
            .eq("user_id", user.id)
            .not("proposta_id", "is", null),

          // 2) Total de propostas enviadas nos últimos 12 meses (is_current)
          supabase
            .from("propostas")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_current", true)
            .gte("data", dataLimite12mStr),

          // 3) Propostas abertas (para projeção futura – sem filtro de período)
          supabase
            .from("propostas")
            .select("data, valor_total, liquido")
            .eq("user_id", user.id)
            .eq("is_current", true)
            .eq("status", "aberta"),

          // 4) Metas ativas de receita/vendas
          supabase
            .from("metas")
            .select("valor_alvo, periodo_inicio, periodo_fim")
            .eq("user_id", user.id)
            .eq("status", "ativa")
            .in("tipo", ["vendas", "vendas (r$)", "receita"]),
        ]);

      if (contratosResult.error) throw contratosResult.error;
      if (enviadasResult.error) throw enviadasResult.error;
      if (abertasResult.error) throw abertasResult.error;
      if (metasResult.error) throw metasResult.error;

      const contratos = contratosResult.data || [];
      const totalEnviadas = enviadasResult.count || 0;
      const abertas = (abertasResult.data || []) as PropostaAberta[];
      const metas = metasResult.data || [];

      // 5) Fetch linked propostas for the contracts (sequential dependency)
      const propostaIds = contratos
        .map((c) => c.proposta_id)
        .filter(Boolean) as string[];

      const propostasMap = new Map<
        string,
        { data: string; data_fechamento: string | null; valor_total: number | null }
      >();

      if (propostaIds.length > 0) {
        const { data: propostasFechadas, error: e5 } = await supabase
          .from("propostas")
          .select("id, data, data_fechamento, valor_total")
          .in("id", propostaIds);

        if (e5) throw e5;

        (propostasFechadas || []).forEach((p) => {
          propostasMap.set(p.id, {
            data: p.data,
            data_fechamento: p.data_fechamento,
            valor_total: p.valor_total,
          });
        });
      }

      // --- Fechamentos nos últimos 12 meses ---
      // close_date = COALESCE(propostas.data_fechamento, contratos.created_at, contratos.data_inicio)
      // ticket   = COALESCE(contratos.valor_negociado, propostas.valor_total)
      const allFechamentos = contratos
        .map((c) => {
          const proposta = propostasMap.get(c.proposta_id!);
          if (!proposta) return null;

          const closeDateStr =
            proposta.data_fechamento || c.created_at || c.data_inicio;
          const closeDate = new Date(closeDateStr);

          // Filtrar pela janela de 12 meses
          if (closeDate < dataLimite12m) return null;

          const dataEnvio = new Date(proposta.data);
          const valor = Number(c.valor_negociado || proposta.valor_total || 0);
          const dias = Math.max(differenceInDays(closeDate, dataEnvio), 0);

          return { dias, valor };
        })
        .filter(Boolean) as { dias: number; valor: number }[];

      // --- Estatísticas ---
      const totalFechadas = allFechamentos.length;
      const outlierCount = allFechamentos.filter(
        (t) => t.dias > filters.outlierLimit
      ).length;
      const percentualOutliers =
        totalFechadas > 0 ? (outlierCount / totalFechadas) * 100 : 0;

      // Filtrar outliers
      const temposFiltrados = allFechamentos.filter(
        (t) => t.dias <= filters.outlierLimit
      );
      const diasSorted = temposFiltrados
        .map((t) => t.dias)
        .sort((a, b) => a - b);

      const p25 = percentile(diasSorted, 25);
      const p50 = percentile(diasSorted, 50);
      const p75 = percentile(diasSorted, 75);

      const taxaConversao =
        totalEnviadas > 0 ? totalFechadas / totalEnviadas : 0;

      const ticketMedio =
        temposFiltrados.length > 0
          ? temposFiltrados.reduce((s, t) => s + t.valor, 0) /
            temposFiltrados.length
          : 0;

      const sampleWarning = totalFechadas < 10;

      const kpis: ForecastKPIs = {
        p25: Math.round(p25),
        p50: Math.round(p50),
        p75: Math.round(p75),
        taxaConversao,
        ticketMedio,
        totalFechadas,
        totalEnviadas,
        percentualOutliers: parseFloat(percentualOutliers.toFixed(1)),
        outlierCount,
        sampleWarning,
      };

      // --- Projeção mensal ---
      const monthMap = new Map<
        string,
        { p25: number; p50: number; p75: number; count: number }
      >();

      abertas.forEach((p) => {
        const dataBase = new Date(p.data);
        const valor = Number(p.liquido || p.valor_total || 0);

        [
          { dias: p25, key: "p25" },
          { dias: p50, key: "p50" },
          { dias: p75, key: "p75" },
        ].forEach(({ dias, key }) => {
          const previsao = addDays(dataBase, Math.round(dias));
          const mesKey = format(previsao, "yyyy-MM");
          if (!monthMap.has(mesKey)) {
            monthMap.set(mesKey, { p25: 0, p50: 0, p75: 0, count: 0 });
          }
          const entry = monthMap.get(mesKey)!;
          (entry as any)[key] += valor * taxaConversao;
          if (key === "p50") entry.count++;
        });
      });

      // Ordenar e formatar
      const forecastData: ForecastMonthData[] = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, d]) => ({
          mes: format(new Date(mes + "-01"), "MMM/yy"),
          p25: Math.round(d.p25),
          p50: Math.round(d.p50),
          p75: Math.round(d.p75),
          propostasCount: d.count,
        }));

      // --- Meta vs Projetado ---
      const metaGapData: MetaGapData[] = forecastData.map((fd) => {
        const metaMensal = (metas || []).reduce((sum, m) => {
          const inicio = new Date(m.periodo_inicio);
          const fim = new Date(m.periodo_fim);
          const meses = Math.max(
            1,
            (fim.getFullYear() - inicio.getFullYear()) * 12 +
              fim.getMonth() -
              inicio.getMonth() +
              1
          );
          return sum + Number(m.valor_alvo) / meses;
        }, 0);

        const gap = Math.max(0, metaMensal - fd.p50);
        const propostasNecessarias =
          ticketMedio > 0 && taxaConversao > 0
            ? Math.ceil(gap / (ticketMedio * taxaConversao))
            : 0;

        return {
          mes: fd.mes,
          meta: Math.round(metaMensal),
          projetado: fd.p50,
          gap: Math.round(gap),
          propostasNecessarias,
        };
      });

      // --- Histograma ---
      const binSize = 15;
      const maxDias = Math.max(
        ...(diasSorted.length > 0 ? diasSorted : [0]),
        filters.outlierLimit
      );
      const binCount = Math.ceil(maxDias / binSize) + 1;
      const histogram: HistogramBin[] = [];

      for (let i = 0; i < binCount; i++) {
        const rangeStart = i * binSize;
        const rangeEnd = rangeStart + binSize;
        const count = allFechamentos.filter(
          (t) => t.dias >= rangeStart && t.dias < rangeEnd
        ).length;
        if (count > 0 || rangeStart <= filters.outlierLimit) {
          histogram.push({
            range: `${rangeStart}-${rangeEnd}`,
            rangeStart,
            count,
          });
        }
      }

      return { kpis, forecastData, metaGapData, histogram };
    },
    enabled: !!user,
  });
}
