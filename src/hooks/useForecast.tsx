import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, format, subMonths, differenceInDays } from "date-fns";

export interface ForecastFilters {
  outlierLimit: number; // dias máximo
}

interface PropostaFechada {
  data: string;
  data_fechamento: string;
  valor_total: number;
  liquido: number;
}

interface PropostaAberta {
  data: string;
  valor_total: number;
  liquido: number;
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

export function useForecast(filters: ForecastFilters = { outlierLimit: 180 }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["forecast", filters.outlierLimit, user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Janela móvel de 12 meses
      const dataLimite12m = format(subMonths(new Date(), 12), "yyyy-MM-dd");

      // 1) Propostas fechadas nos últimos 12 meses (por data_fechamento)
      const { data: fechadas, error: e1 } = await supabase
        .from("propostas")
        .select("data, data_fechamento, valor_total, liquido")
        .eq("user_id", user.id)
        .eq("is_current", true)
        .eq("status", "fechada")
        .not("data_fechamento", "is", null)
        .gte("data_fechamento", dataLimite12m);

      if (e1) throw e1;

      // 2) Total de propostas enviadas nos últimos 12 meses (por data de envio)
      const { count: totalEnviadas, error: e2 } = await supabase
        .from("propostas")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_current", true)
        .gte("data", dataLimite12m);

      if (e2) throw e2;

      // 3) Propostas abertas (para projeção futura – sem filtro de período)
      const { data: abertas, error: e3 } = await supabase
        .from("propostas")
        .select("data, valor_total, liquido")
        .eq("user_id", user.id)
        .eq("is_current", true)
        .eq("status", "aberta");

      if (e3) throw e3;

      // 4) Metas ativas de receita/vendas
      const { data: metas, error: e4 } = await supabase
        .from("metas")
        .select("valor_alvo, periodo_inicio, periodo_fim")
        .eq("user_id", user.id)
        .eq("status", "ativa")
        .in("tipo", ["vendas", "vendas (r$)", "receita"]);

      if (e4) throw e4;

      // --- Cálculos ---

      // Tempo de fechamento de todas as propostas fechadas
      const allTempos = (fechadas as PropostaFechada[]).map((p) => {
        const dias = differenceInDays(
          new Date(p.data_fechamento),
          new Date(p.data)
        );
        return { dias: Math.max(dias, 0), valor: Number(p.liquido || p.valor_total || 0) };
      });

      const totalFechadas = allTempos.length;
      const outlierCount = allTempos.filter((t) => t.dias > filters.outlierLimit).length;
      const percentualOutliers = totalFechadas > 0 ? (outlierCount / totalFechadas) * 100 : 0;

      // Filtrar outliers
      const temposFiltrados = allTempos.filter((t) => t.dias <= filters.outlierLimit);
      const diasSorted = temposFiltrados.map((t) => t.dias).sort((a, b) => a - b);

      const p25 = percentile(diasSorted, 25);
      const p50 = percentile(diasSorted, 50);
      const p75 = percentile(diasSorted, 75);

      const taxaConversao = (totalEnviadas || 0) > 0
        ? totalFechadas / (totalEnviadas || 1)
        : 0;

      const ticketMedio = temposFiltrados.length > 0
        ? temposFiltrados.reduce((s, t) => s + t.valor, 0) / temposFiltrados.length
        : 0;

      const kpis: ForecastKPIs = {
        p25: Math.round(p25),
        p50: Math.round(p50),
        p75: Math.round(p75),
        taxaConversao,
        ticketMedio,
        totalFechadas,
        totalEnviadas: totalEnviadas || 0,
        percentualOutliers: parseFloat(percentualOutliers.toFixed(1)),
        outlierCount,
      };

      // --- Projeção mensal ---
      const monthMap = new Map<string, { p25: number; p50: number; p75: number; count: number }>();

      (abertas as PropostaAberta[]).forEach((p) => {
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
        // Encontrar meta que cobre esse mês
        const metaMensal = (metas || []).reduce((sum, m) => {
          const inicio = new Date(m.periodo_inicio);
          const fim = new Date(m.periodo_fim);
          const meses = Math.max(
            1,
            (fim.getFullYear() - inicio.getFullYear()) * 12 + fim.getMonth() - inicio.getMonth() + 1
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
      const maxDias = Math.max(...(diasSorted.length > 0 ? diasSorted : [0]), filters.outlierLimit);
      const binCount = Math.ceil(maxDias / binSize) + 1;
      const histogram: HistogramBin[] = [];

      for (let i = 0; i < binCount; i++) {
        const rangeStart = i * binSize;
        const rangeEnd = rangeStart + binSize;
        const count = allTempos.filter(
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
