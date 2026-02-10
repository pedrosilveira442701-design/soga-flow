import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subMonths, addMonths, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Interfaces ───────────────────────────────────────────────

export interface ForecastPageParams {
  horizonte: 3 | 6 | 12;
  valorAdicionalMensal: number;
  conversaoMarginal: number;
  ticketMarginal: number;
}

export interface BaseStats {
  valorEnviado12m: number;
  valorFechado12m: number;
  conversaoFinanceira: number;
  ticketReal: number;
  receitaMediaMensal: number;
  numContratos12m: number;
  volumeEnviadoMensal: number;
  tempoMedioFechamentoDias: number;
  amostraPequena: boolean;
}

export interface PipelineItem {
  id: string;
  valorTotal: number;
  status: string;
  estagio: string | null;
  probabilidade: number;
  valorPonderado: number;
  diasAberta: number;
}

export interface PipelineResumo {
  valorBruto: number;
  valorPonderado: number;
  qtdPropostas: number;
  porEstagio: Record<string, { valor: number; ponderado: number; qtd: number }>;
}

export interface ForecastMensal {
  mes: string;
  mesKey: string;
  baseline: number;
  pipelineAlloc: number;
  incrementalAlloc: number;
  forecastTotal: number;
  meta: number;
  gap: number;
  acaoNecessariaRS: number;
  propostasEquiv: number;
}

export interface VolumeHistorico {
  mes: string;
  valorEnviado: number;
  valorFechado: number;
  conversaoFinanceira: number;
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

// ─── Probabilidades por estágio do lead ───

const PROBABILIDADE_ESTAGIO: Record<string, number> = {
  contato: 0.05,
  visita_agendada: 0.15,
  visita_realizada: 0.25,
  proposta_pendente: 0.35,
  proposta: 0.50,
  em_analise: 0.55,
  contrato: 0.85,
  execucao: 0.95,
  finalizado: 1.0,
};

const PROBABILIDADE_STATUS: Record<string, number> = {
  aberta: 0.35,
  fechada: 1.0,
  perdida: 0,
  repouso: 0.05,
};

// ─── Hook principal ───────────────────────────────────────────

export function useForecastPage(params: ForecastPageParams) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      "forecast-page-v3",
      params.horizonte,
      params.valorAdicionalMensal,
      params.conversaoMarginal,
      params.ticketMarginal,
      user?.id,
    ],
    queryFn: async () => {
      if (!user) return null;

      const agora = new Date();
      const dataLimite12m = subMonths(agora, 12);
      const dataLimite12mStr = format(dataLimite12m, "yyyy-MM-dd");

      // ─── Fetch all data in parallel ────────────────────────
      const [contratosRes, enviadasRes, abertasRes, metasRes, leadsRes] = await Promise.all([
        supabase
          .from("contratos")
          .select("proposta_id, created_at, data_inicio, valor_negociado")
          .eq("user_id", user.id)
          .not("proposta_id", "is", null),
        supabase
          .from("propostas")
          .select("id, data, is_current, data_fechamento, valor_total, status")
          .eq("user_id", user.id)
          .eq("is_current", true)
          .gte("data", dataLimite12mStr),
        supabase
          .from("propostas")
          .select("id, data, valor_total, status, lead_id")
          .eq("user_id", user.id)
          .eq("is_current", true)
          .eq("status", "aberta"),
        supabase
          .from("metas")
          .select("id, nome, tipo, valor_alvo, periodo_inicio, periodo_fim, status")
          .eq("user_id", user.id)
          .eq("status", "ativa"),
        supabase
          .from("leads")
          .select("id, estagio")
          .eq("user_id", user.id),
      ]);

      if (contratosRes.error) throw contratosRes.error;
      if (enviadasRes.error) throw enviadasRes.error;
      if (abertasRes.error) throw abertasRes.error;
      if (metasRes.error) throw metasRes.error;
      if (leadsRes.error) throw leadsRes.error;

      const contratos = contratosRes.data || [];
      const enviadas12m = enviadasRes.data || [];
      const abertas = abertasRes.data || [];
      const todasMetas = (metasRes.data || []) as MetaAtiva[];
      const leads = leadsRes.data || [];

      const metasAtivas = todasMetas.filter((m) =>
        ["vendas", "vendas (r$)", "receita"].some(
          (t) => m.tipo.toLowerCase() === t.toLowerCase()
        )
      );

      const leadMap = new Map<string, string>();
      leads.forEach((l) => leadMap.set(l.id, l.estagio));

      // ─── Build proposal map for contracts ──────────────────
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

      // ─── Fechamentos 12m ───────────────────────────────────
      const fechamentos12m = contratos
        .map((c) => {
          const prop = propostasMap.get(c.proposta_id!);
          if (!prop) return null;
          const closeDateStr = prop.data_fechamento || c.created_at || c.data_inicio;
          const closeDate = new Date(closeDateStr);
          if (closeDate < dataLimite12m) return null;
          const valor = Number(c.valor_negociado || prop.valor_total || 0);
          const mesKey = format(closeDate, "yyyy-MM");
          const dataEnvio = new Date(prop.data);
          const diasFechamento = Math.max(differenceInDays(closeDate, dataEnvio), 0);
          return { valor, mesKey, diasFechamento };
        })
        .filter(Boolean) as { valor: number; mesKey: string; diasFechamento: number }[];

      // ─── Métricas financeiras base (12m) ───────────────────
      const valorEnviado12m = enviadas12m.reduce((s, p) => s + Number(p.valor_total || 0), 0);
      const valorFechado12m = fechamentos12m.reduce((s, f) => s + f.valor, 0);
      const numContratos12m = fechamentos12m.length;
      const conversaoFinanceira = valorEnviado12m > 0 ? valorFechado12m / valorEnviado12m : 0;
      const ticketReal = numContratos12m > 0 ? valorFechado12m / numContratos12m : 0;
      const receitaMediaMensal = valorFechado12m / 12;
      const volumeEnviadoMensal = valorEnviado12m / 12;

      // Mediana do tempo de fechamento (P50) — mais robusto que média
      const diasOrdenados = fechamentos12m.map((f) => f.diasFechamento).sort((a, b) => a - b);
      const tempoMedioFechamentoDias = diasOrdenados.length > 0
        ? diasOrdenados[Math.floor(diasOrdenados.length / 2)]
        : 45;

      const baseStats: BaseStats = {
        valorEnviado12m,
        valorFechado12m,
        conversaoFinanceira,
        ticketReal,
        receitaMediaMensal,
        numContratos12m,
        volumeEnviadoMensal,
        tempoMedioFechamentoDias,
        amostraPequena: numContratos12m < 10,
      };

      // ─── Pipeline com probabilidade ────────────────────────
      const pipelineItems: PipelineItem[] = abertas.map((p) => {
        const estagio = p.lead_id ? (leadMap.get(p.lead_id) || null) : null;
        const probabilidade = estagio
          ? (PROBABILIDADE_ESTAGIO[estagio] ?? PROBABILIDADE_STATUS[p.status || "aberta"] ?? 0.35)
          : (PROBABILIDADE_STATUS[p.status || "aberta"] ?? 0.35);
        const valorTotal = Number(p.valor_total || 0);
        const diasAberta = differenceInDays(agora, new Date(p.data));

        return {
          id: p.id,
          valorTotal,
          status: p.status || "aberta",
          estagio,
          probabilidade,
          valorPonderado: valorTotal * probabilidade,
          diasAberta,
        };
      });

      const pipeline: PipelineResumo = {
        valorBruto: pipelineItems.reduce((s, p) => s + p.valorTotal, 0),
        valorPonderado: pipelineItems.reduce((s, p) => s + p.valorPonderado, 0),
        qtdPropostas: pipelineItems.length,
        porEstagio: {},
      };

      pipelineItems.forEach((p) => {
        const key = p.estagio || "sem_lead";
        if (!pipeline.porEstagio[key]) {
          pipeline.porEstagio[key] = { valor: 0, ponderado: 0, qtd: 0 };
        }
        pipeline.porEstagio[key].valor += p.valorTotal;
        pipeline.porEstagio[key].ponderado += p.valorPonderado;
        pipeline.porEstagio[key].qtd += 1;
      });

      // ─── Meta mensal helper ────────────────────────────────
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

      // ─── Build month keys for horizon ──────────────────────
      const monthKeys: string[] = [];
      const monthLabels: string[] = [];
      for (let i = 0; i < params.horizonte; i++) {
        const mesDate = addMonths(agora, i);
        monthKeys.push(format(mesDate, "yyyy-MM"));
        monthLabels.push(format(mesDate, "MMM/yy", { locale: ptBR }));
      }

      // ─── 1) Baseline series (constant) ─────────────────────
      const baselineValue = Math.round(receitaMediaMensal);

      // ─── 2) Pipeline alloc series (VARIABLE per month) ─────
      // Distribute each pipeline item across 3 months: -1(30%), 0(50%), +1(20%)
      const pipelineAllocArr = new Array(params.horizonte).fill(0);

      pipelineItems.forEach((p) => {
        const diasRestantes = Math.max(0, tempoMedioFechamentoDias - p.diasAberta);
        const dataEstimada = new Date(agora);
        dataEstimada.setDate(dataEstimada.getDate() + diasRestantes);
        const mesEstimadoKey = format(dataEstimada, "yyyy-MM");
        const centerIndex = monthKeys.indexOf(mesEstimadoKey);

        // Spread: 30% prev, 50% center, 20% next
        const spreads = [
          { offset: -1, weight: 0.30 },
          { offset: 0, weight: 0.50 },
          { offset: 1, weight: 0.20 },
        ];

        spreads.forEach(({ offset, weight }) => {
          const idx = centerIndex + offset;
          if (idx >= 0 && idx < params.horizonte) {
            pipelineAllocArr[idx] += p.valorPonderado * weight;
          } else if (centerIndex === -1) {
            // Pipeline item falls before horizon — allocate all to month 0
            if (offset === 0) {
              pipelineAllocArr[0] += p.valorPonderado;
            }
          }
        });

        // If centerIndex is beyond horizon, ignore (already closed or too far)
      });

      // ─── 3) Incremental alloc series (VARIABLE per month) ──
      const incrementalAllocArr = new Array(params.horizonte).fill(0);
      const mesesDeDelay = Math.max(1, Math.ceil(tempoMedioFechamentoDias / 30));
      const incrementalPerMonth = params.valorAdicionalMensal * params.conversaoMarginal;

      for (let i = 0; i < params.horizonte; i++) {
        if (i >= mesesDeDelay) {
          incrementalAllocArr[i] = incrementalPerMonth;
        }
      }

      // ─── Build forecastMensal array ────────────────────────
      const forecastMensal: ForecastMensal[] = monthKeys.map((mesKey, i) => {
        const pipeAlloc = Math.round(pipelineAllocArr[i]);
        const incAlloc = Math.round(incrementalAllocArr[i]);
        const total = baselineValue + pipeAlloc + incAlloc;
        const meta = Math.round(getMetaMensal(mesKey));
        const gap = Math.max(0, meta - total);
        const acaoNecessariaRS = conversaoFinanceira > 0 ? Math.round(gap / conversaoFinanceira) : 0;
        const propostasEquiv = (ticketReal > 0 && conversaoFinanceira > 0)
          ? Math.ceil(gap / (ticketReal * conversaoFinanceira))
          : 0;

        return {
          mes: monthLabels[i],
          mesKey,
          baseline: baselineValue,
          pipelineAlloc: pipeAlloc,
          incrementalAlloc: incAlloc,
          forecastTotal: total,
          meta,
          gap,
          acaoNecessariaRS,
          propostasEquiv,
        };
      });

      // ─── Volume histórico mensal ───────────────────────────
      const volumeHistorico: VolumeHistorico[] = [];
      for (let i = 11; i >= 0; i--) {
        const mesDate = subMonths(agora, i);
        const mesKey = format(mesDate, "yyyy-MM");
        const mesLabel = format(mesDate, "MMM/yy", { locale: ptBR });
        const envMesValor = enviadas12m
          .filter((p) => format(new Date(p.data), "yyyy-MM") === mesKey)
          .reduce((s, p) => s + Number(p.valor_total || 0), 0);
        const fechMesValor = fechamentos12m
          .filter((f) => f.mesKey === mesKey)
          .reduce((s, f) => s + f.valor, 0);
        volumeHistorico.push({
          mes: mesLabel,
          valorEnviado: Math.round(envMesValor),
          valorFechado: Math.round(fechMesValor),
          conversaoFinanceira: envMesValor > 0 ? parseFloat(((fechMesValor / envMesValor) * 100).toFixed(1)) : 0,
        });
      }

      // ─── Insights engine ───────────────────────────────────
      const insights: Insight[] = [];
      const mesAtual = forecastMensal[0];

      if (baseStats.amostraPequena) {
        insights.push({
          text: `Dados limitados: apenas ${numContratos12m} contratos em 12 meses. Previsões podem ter margem de erro elevada.`,
          level: "muted",
        });
      }

      if (mesAtual && mesAtual.forecastTotal > 0) {
        insights.push({
          text: `Mantendo o ritmo atual, este mês fecha em R$ ${mesAtual.forecastTotal.toLocaleString("pt-BR")}`,
          level: mesAtual.forecastTotal >= mesAtual.meta ? "success" : "muted",
        });
      }

      if (mesAtual && pipeline.valorPonderado > 0) {
        const pctPipeline = mesAtual.forecastTotal > 0
          ? ((mesAtual.pipelineAlloc / mesAtual.forecastTotal) * 100).toFixed(0)
          : "0";
        insights.push({
          text: `R$ ${pipeline.valorPonderado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} no pipeline ponderado (${pctPipeline}% do forecast deste mês vem do pipeline)`,
          level: "success",
        });
      }

      if (mesAtual && mesAtual.meta > 0) {
        if (mesAtual.forecastTotal >= mesAtual.meta) {
          insights.push({ text: "Você está no caminho para bater a meta deste mês", level: "success" });
        } else {
          insights.push({
            text: `Para bater a meta, é necessário gerar +R$ ${mesAtual.acaoNecessariaRS.toLocaleString("pt-BR")} em novas propostas (≈ ${mesAtual.propostasEquiv} propostas)`,
            level: "warning",
          });
        }
      }

      if (conversaoFinanceira > 0 && ticketReal > 0 && volumeEnviadoMensal > 0) {
        if (conversaoFinanceira < 0.15) {
          insights.push({ text: `Seu gargalo principal hoje é a conversão financeira (${(conversaoFinanceira * 100).toFixed(1)}%). Melhore a qualidade das propostas ou o processo de follow-up.`, level: "destructive" });
        } else if (volumeEnviadoMensal < ticketReal * 2) {
          insights.push({ text: `Seu gargalo principal hoje é o volume de propostas enviadas (R$ ${volumeEnviadoMensal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}/mês). Gerar mais demanda é prioridade.`, level: "destructive" });
        }
      }

      if (tempoMedioFechamentoDias > 0) {
        insights.push({
          text: `Tempo mediano de fechamento: ${tempoMedioFechamentoDias} dias. Novas propostas impactam a partir do ${mesesDeDelay}º mês.`,
          level: "muted",
        });
      }

      return { baseStats, pipeline, forecastMensal, volumeHistorico, metasAtivas, insights };
    },
    enabled: !!user,
  });
}
