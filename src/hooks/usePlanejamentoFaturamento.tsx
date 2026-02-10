import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, format, subMonths, differenceInDays } from "date-fns";

export interface PlanejamentoFilters {
  outlierLimit: number;
}

export interface PlanejamentoKPIs {
  volumePropostasAberto: number;
  valorTotalAberto: number;
  taxaConversao: number;
  ticketMedio: number;
  faturamentoProjetadoMensal: number;
  totalFechadas12m: number;
  totalEnviadas12m: number;
  medianaFechamentoDias: number;
  amostraPequena: boolean;
}

export interface ProjecaoMensalData {
  mes: string;
  mesKey: string;
  volumePropostas: number;
  conversaoEsperada: number;
  faturamentoProjetado: number;
}

export interface MetaGapData {
  mes: string;
  meta: number;
  projetado: number;
  gap: number;
  propostasNecessarias: number;
}

export interface VolumeHistoricoData {
  mes: string;
  enviadas: number;
  fechadas: number;
  taxaConversao: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function usePlanejamentoFaturamento(
  filters: PlanejamentoFilters = { outlierLimit: 180 }
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["planejamento-faturamento", filters.outlierLimit, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const agora = new Date();
      const dataLimite12m = subMonths(agora, 12);
      const dataLimite12mStr = format(dataLimite12m, "yyyy-MM-dd");

      // Parallel queries
      const [contratosRes, enviadasRes, abertasRes, metasRes] =
        await Promise.all([
          supabase
            .from("contratos")
            .select("proposta_id, created_at, data_inicio, valor_negociado")
            .eq("user_id", user.id)
            .not("proposta_id", "is", null),
          supabase
            .from("propostas")
            .select("id, data, is_current")
            .eq("user_id", user.id)
            .eq("is_current", true)
            .gte("data", dataLimite12mStr),
          supabase
            .from("propostas")
            .select("data, valor_total, liquido")
            .eq("user_id", user.id)
            .eq("is_current", true)
            .eq("status", "aberta"),
          supabase
            .from("metas")
            .select("valor_alvo, periodo_inicio, periodo_fim")
            .eq("user_id", user.id)
            .eq("status", "ativa")
            .in("tipo", ["vendas", "vendas (r$)", "receita"]),
        ]);

      if (contratosRes.error) throw contratosRes.error;
      if (enviadasRes.error) throw enviadasRes.error;
      if (abertasRes.error) throw abertasRes.error;
      if (metasRes.error) throw metasRes.error;

      const contratos = contratosRes.data || [];
      const enviadas12m = enviadasRes.data || [];
      const abertas = abertasRes.data || [];
      const metas = metasRes.data || [];

      // Fetch linked proposals for contracts
      const propostaIds = contratos
        .map((c) => c.proposta_id)
        .filter(Boolean) as string[];

      const propostasMap = new Map<
        string,
        { data: string; data_fechamento: string | null; valor_total: number | null }
      >();

      if (propostaIds.length > 0) {
        const { data: propostasFechadas, error } = await supabase
          .from("propostas")
          .select("id, data, data_fechamento, valor_total")
          .in("id", propostaIds);
        if (error) throw error;
        (propostasFechadas || []).forEach((p) => {
          propostasMap.set(p.id, {
            data: p.data,
            data_fechamento: p.data_fechamento,
            valor_total: p.valor_total,
          });
        });
      }

      // Build closing records within 12-month window
      const fechamentos12m = contratos
        .map((c) => {
          const proposta = propostasMap.get(c.proposta_id!);
          if (!proposta) return null;
          const closeDateStr =
            proposta.data_fechamento || c.created_at || c.data_inicio;
          const closeDate = new Date(closeDateStr);
          if (closeDate < dataLimite12m) return null;
          const dataEnvio = new Date(proposta.data);
          const valor = Number(c.valor_negociado || proposta.valor_total || 0);
          const dias = Math.max(differenceInDays(closeDate, dataEnvio), 0);
          const mesKey = format(closeDate, "yyyy-MM");
          return { dias, valor, mesKey };
        })
        .filter(Boolean) as { dias: number; valor: number; mesKey: string }[];

      // Filter outliers
      const semOutliers = fechamentos12m.filter(
        (f) => f.dias <= filters.outlierLimit
      );
      const diasSorted = semOutliers.map((f) => f.dias).sort((a, b) => a - b);

      const p50 = percentile(diasSorted, 50);
      const totalFechadas12m = fechamentos12m.length;
      const totalEnviadas12m = enviadas12m.length;
      const taxaConversao =
        totalEnviadas12m > 0 ? totalFechadas12m / totalEnviadas12m : 0;
      const ticketMedio =
        semOutliers.length > 0
          ? semOutliers.reduce((s, f) => s + f.valor, 0) / semOutliers.length
          : 0;

      // Valor total em aberto
      const valorTotalAberto = abertas.reduce(
        (s, p) => s + Number(p.liquido || p.valor_total || 0),
        0
      );

      // Projeção mensal: agrupar propostas abertas pelo mês previsto
      const projecaoMap = new Map<
        string,
        { volume: number; valorBruto: number }
      >();

      abertas.forEach((p) => {
        const dataBase = new Date(p.data);
        const previsao = addDays(dataBase, Math.round(p50));
        const mesKey = format(previsao, "yyyy-MM");
        const valor = Number(p.liquido || p.valor_total || 0);
        const entry = projecaoMap.get(mesKey) || { volume: 0, valorBruto: 0 };
        entry.volume++;
        entry.valorBruto += valor;
        projecaoMap.set(mesKey, entry);
      });

      const projecaoMensal: ProjecaoMensalData[] = Array.from(
        projecaoMap.entries()
      )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mesKey, d]) => ({
          mes: format(new Date(mesKey + "-01"), "MMM/yy"),
          mesKey,
          volumePropostas: d.volume,
          conversaoEsperada: Math.round(d.volume * taxaConversao),
          faturamentoProjetado: Math.round(d.valorBruto * taxaConversao),
        }));

      const faturamentoProjetadoMensal = projecaoMensal.reduce(
        (s, p) => s + p.faturamentoProjetado,
        0
      );

      // Meta vs Projetado
      const metaGapData: MetaGapData[] = projecaoMensal.map((pm) => {
        const metaMensal = metas.reduce((sum, m) => {
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
        const gap = Math.max(0, metaMensal - pm.faturamentoProjetado);
        const propostasNecessarias =
          ticketMedio > 0 && taxaConversao > 0
            ? Math.ceil(gap / (ticketMedio * taxaConversao))
            : 0;
        return {
          mes: pm.mes,
          meta: Math.round(metaMensal),
          projetado: pm.faturamentoProjetado,
          gap: Math.round(gap),
          propostasNecessarias,
        };
      });

      // Volume histórico mensal (últimos 12 meses)
      const volumeHistorico: VolumeHistoricoData[] = [];
      for (let i = 11; i >= 0; i--) {
        const mesDate = subMonths(agora, i);
        const mesKey = format(mesDate, "yyyy-MM");
        const mesLabel = format(mesDate, "MMM/yy");
        const enviadasMes = enviadas12m.filter(
          (p) => format(new Date(p.data), "yyyy-MM") === mesKey
        ).length;
        const fechadasMes = fechamentos12m.filter(
          (f) => f.mesKey === mesKey
        ).length;
        volumeHistorico.push({
          mes: mesLabel,
          enviadas: enviadasMes,
          fechadas: fechadasMes,
          taxaConversao:
            enviadasMes > 0
              ? parseFloat(((fechadasMes / enviadasMes) * 100).toFixed(1))
              : 0,
        });
      }

      const kpis: PlanejamentoKPIs = {
        volumePropostasAberto: abertas.length,
        valorTotalAberto: Math.round(valorTotalAberto),
        taxaConversao,
        ticketMedio: Math.round(ticketMedio),
        faturamentoProjetadoMensal: Math.round(faturamentoProjetadoMensal),
        totalFechadas12m,
        totalEnviadas12m,
        medianaFechamentoDias: Math.round(p50),
        amostraPequena: totalFechadas12m < 10,
      };

      return { kpis, projecaoMensal, metaGapData, volumeHistorico };
    },
    enabled: !!user,
  });
}
