import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subMonths, differenceInDays, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ForecastPageParams {
  horizonte: 3 | 6 | 12;
  volumeAjuste: number;   // 0.5–2.0
  conversaoAjuste: number;
  ticketAjuste: number;
}

export interface BaseStats {
  mediaEnviadasMes: number;
  conversaoReal: number;
  ticketReal: number;
  p25: number;
  p50: number;
  p75: number;
  totalFechadas12m: number;
  totalEnviadas12m: number;
  amostraPequena: boolean;
}

export interface CenarioEfetivo {
  volumeMensal: number;
  conversao: number;
  ticket: number;
}

export interface ForecastMensal {
  mes: string;
  mesKey: string;
  forecast: number;
  meta: number;
  gap: number;
  propostasNecessarias: number;
}

export interface VolumeHistorico {
  mes: string;
  enviadas: number;
  fechadas: number;
  taxaConversao: number;
}

export interface MetaAtiva {
  id: string;
  nome: string | null;
  tipo: string;
  valor_alvo: number;
  periodo_inicio: string;
  periodo_fim: string;
}

export type InsightLevel = "success" | "warning" | "destructive" | "muted";

export interface Insight {
  text: string;
  level: InsightLevel;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

const OUTLIER_LIMIT = 180;

export function useForecastPage(params: ForecastPageParams) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      "forecast-page",
      params.horizonte,
      params.volumeAjuste,
      params.conversaoAjuste,
      params.ticketAjuste,
      user?.id,
    ],
    queryFn: async () => {
      if (!user) return null;

      const agora = new Date();
      const dataLimite12m = subMonths(agora, 12);
      const dataLimite12mStr = format(dataLimite12m, "yyyy-MM-dd");

      const [contratosRes, enviadasRes, metasRes] = await Promise.all([
        supabase
          .from("contratos")
          .select("proposta_id, created_at, data_inicio, valor_negociado")
          .eq("user_id", user.id)
          .not("proposta_id", "is", null),
        supabase
          .from("propostas")
          .select("id, data, is_current, data_fechamento, valor_total")
          .eq("user_id", user.id)
          .eq("is_current", true)
          .gte("data", dataLimite12mStr),
        supabase
          .from("metas")
          .select("id, nome, tipo, valor_alvo, periodo_inicio, periodo_fim, status")
          .eq("user_id", user.id)
          .eq("status", "ativa"),
      ]);

      if (contratosRes.error) throw contratosRes.error;
      if (enviadasRes.error) throw enviadasRes.error;
      if (metasRes.error) throw metasRes.error;

      const contratos = contratosRes.data || [];
      const enviadas12m = enviadasRes.data || [];
      const todasMetas = (metasRes.data || []) as MetaAtiva[];

      // Filter metas relevant to revenue/sales
      const metasAtivas = todasMetas.filter((m) =>
        ["vendas", "vendas (r$)", "receita", "Vendas (R$)"].some(
          (t) => m.tipo.toLowerCase() === t.toLowerCase()
        )
      );

      // Build proposal map for contracts
      const propostaIds = contratos.map((c) => c.proposta_id).filter(Boolean) as string[];
      const propostasMap = new Map<string, { data: string; data_fechamento: string | null; valor_total: number | null }>();

      if (propostaIds.length > 0) {
        const { data: pf, error } = await supabase
          .from("propostas")
          .select("id, data, data_fechamento, valor_total")
          .in("id", propostaIds);
        if (error) throw error;
        (pf || []).forEach((p) =>
          propostasMap.set(p.id, { data: p.data, data_fechamento: p.data_fechamento, valor_total: p.valor_total })
        );
      }

      // Build closing records within 12m window
      const fechamentos12m = contratos
        .map((c) => {
          const prop = propostasMap.get(c.proposta_id!);
          if (!prop) return null;
          const closeDateStr = prop.data_fechamento || c.created_at || c.data_inicio;
          const closeDate = new Date(closeDateStr);
          if (closeDate < dataLimite12m) return null;
          const dataEnvio = new Date(prop.data);
          const valor = Number(c.valor_negociado || prop.valor_total || 0);
          const dias = Math.max(differenceInDays(closeDate, dataEnvio), 0);
          const mesKey = format(closeDate, "yyyy-MM");
          return { dias, valor, mesKey };
        })
        .filter(Boolean) as { dias: number; valor: number; mesKey: string }[];

      const semOutliers = fechamentos12m.filter((f) => f.dias <= OUTLIER_LIMIT);
      const diasSorted = semOutliers.map((f) => f.dias).sort((a, b) => a - b);

      const p25 = Math.round(percentile(diasSorted, 25));
      const p50 = Math.round(percentile(diasSorted, 50));
      const p75 = Math.round(percentile(diasSorted, 75));
      const totalFechadas12m = fechamentos12m.length;
      const totalEnviadas12m = enviadas12m.length;
      const conversaoReal = totalEnviadas12m > 0 ? totalFechadas12m / totalEnviadas12m : 0;
      const ticketReal =
        semOutliers.length > 0
          ? semOutliers.reduce((s, f) => s + f.valor, 0) / semOutliers.length
          : 0;
      const mediaEnviadasMes = totalEnviadas12m / 12;

      const baseStats: BaseStats = {
        mediaEnviadasMes,
        conversaoReal,
        ticketReal,
        p25,
        p50,
        p75,
        totalFechadas12m,
        totalEnviadas12m,
        amostraPequena: totalFechadas12m < 10,
      };

      // Effective scenario
      const cenario: CenarioEfetivo = {
        volumeMensal: mediaEnviadasMes * params.volumeAjuste,
        conversao: conversaoReal * params.conversaoAjuste,
        ticket: ticketReal * params.ticketAjuste,
      };

      // Get meta for a given month
      function getMetaMensal(mesKey: string): number {
        let total = 0;
        for (const m of metasAtivas) {
          const inicio = new Date(m.periodo_inicio);
          const fim = new Date(m.periodo_fim);
          const mesDate = new Date(mesKey + "-01");
          if (mesDate >= inicio && mesDate <= fim) {
            const meses = Math.max(
              1,
              (fim.getFullYear() - inicio.getFullYear()) * 12 +
                fim.getMonth() - inicio.getMonth() + 1
            );
            total += Number(m.valor_alvo) / meses;
          }
        }
        return total;
      }

      // Build forecast mensal
      const forecastMensal: ForecastMensal[] = [];
      for (let i = 0; i < params.horizonte; i++) {
        const mesDate = addMonths(agora, i);
        const mesKey = format(mesDate, "yyyy-MM");
        const mesLabel = format(mesDate, "MMM/yy", { locale: ptBR });
        const forecast = cenario.volumeMensal * cenario.conversao * cenario.ticket;
        const meta = getMetaMensal(mesKey);
        const gap = Math.max(0, meta - forecast);
        const propostasNecessarias =
          cenario.ticket > 0 && cenario.conversao > 0
            ? Math.ceil(gap / (cenario.ticket * cenario.conversao))
            : 0;
        forecastMensal.push({ mes: mesLabel, mesKey, forecast: Math.round(forecast), meta: Math.round(meta), gap: Math.round(gap), propostasNecessarias });
      }

      // Volume histórico mensal
      const volumeHistorico: VolumeHistorico[] = [];
      for (let i = 11; i >= 0; i--) {
        const mesDate = subMonths(agora, i);
        const mesKey = format(mesDate, "yyyy-MM");
        const mesLabel = format(mesDate, "MMM/yy", { locale: ptBR });
        const envMes = enviadas12m.filter((p) => format(new Date(p.data), "yyyy-MM") === mesKey).length;
        const fechMes = fechamentos12m.filter((f) => f.mesKey === mesKey).length;
        volumeHistorico.push({
          mes: mesLabel,
          enviadas: envMes,
          fechadas: fechMes,
          taxaConversao: envMes > 0 ? parseFloat(((fechMes / envMes) * 100).toFixed(1)) : 0,
        });
      }

      // Insights engine (deterministic rules)
      const insights: Insight[] = [];
      const forecastMesAtual = forecastMensal[0]?.forecast || 0;
      const metaMesAtual = forecastMensal[0]?.meta || 0;
      const media12mReceita = volumeHistorico.reduce((s, v) => {
        const fechValor = fechamentos12m.filter((f) => f.mesKey === format(subMonths(agora, volumeHistorico.indexOf(v)), "yyyy-MM")).reduce((ss, f) => ss + f.valor, 0);
        return s + fechValor;
      }, 0) / 12;

      if (baseStats.amostraPequena) {
        insights.push({ text: `Dados insuficientes para previsão confiável (apenas ${totalFechadas12m} fechamentos em 12 meses)`, level: "muted" });
      }

      if (metaMesAtual > 0) {
        if (forecastMesAtual >= metaMesAtual) {
          insights.push({ text: "Você está no caminho para bater a meta deste mês", level: "success" });
        } else {
          const propostasNec = forecastMensal[0]?.propostasNecessarias || 0;
          insights.push({ text: `Para bater a meta do mês, precisa de +${propostasNec} propostas enviadas`, level: "warning" });
        }
      }

      if (media12mReceita > 0) {
        const delta = ((forecastMesAtual - media12mReceita) / media12mReceita) * 100;
        if (Math.abs(delta) > 5) {
          insights.push({
            text: `Forecast está ${delta > 0 ? "+" : ""}${delta.toFixed(0)}% ${delta > 0 ? "acima" : "abaixo"} da média dos últimos 12 meses`,
            level: delta > 0 ? "success" : "warning",
          });
        }
      }

      // Bottleneck detection
      const volEfetivo = cenario.volumeMensal;
      const convEfetiva = cenario.conversao;
      const tickEfetivo = cenario.ticket;
      if (mediaEnviadasMes > 0 && volEfetivo < mediaEnviadasMes * 0.8) {
        insights.push({ text: "Seu gargalo está no volume de propostas", level: "destructive" });
      }
      if (conversaoReal > 0 && convEfetiva < conversaoReal * 0.8) {
        insights.push({ text: "Seu gargalo está na conversão", level: "destructive" });
      }
      if (ticketReal > 0 && tickEfetivo < ticketReal * 0.8) {
        insights.push({ text: "Seu gargalo está no ticket médio", level: "destructive" });
      }

      if (forecastMesAtual > 0) {
        insights.push({
          text: `Se mantiver a taxa atual, o mês fecha em R$ ${forecastMesAtual.toLocaleString("pt-BR")}`,
          level: "muted",
        });
      }

      return { baseStats, cenario, forecastMensal, volumeHistorico, metasAtivas, insights };
    },
    enabled: !!user,
  });
}
