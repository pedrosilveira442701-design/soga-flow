import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subMonths, addMonths, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Interfaces ───────────────────────────────────────────────

export interface ForecastPageParams {
  horizonte: 3 | 6 | 12;
  /** R$ adicionais em propostas/mês que o usuário planeja gerar */
  valorAdicionalMensal: number;
  /** Conversão marginal (%) que o usuário espera para novas propostas (0..1) */
  conversaoMarginal: number;
  /** Ticket médio esperado (R$) para novas propostas */
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
  tempoMedioFechamentoDias: number; // P50 recomendado
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

  // 3 séries separadas (para não ficar “valor fixo repetido”)
  baseline: number;
  pipelineAlloc: number;
  incrementalAlloc: number;

  forecastTotal: number;

  // metas
  metaReceita: number;
  metaPropostasRS: number;
  metaByTipo: Record<string, number>;

  gapReceita: number;
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
  status?: string;
}

export type InsightLevel = "success" | "warning" | "destructive" | "muted";

export interface Insight {
  text: string;
  level: InsightLevel;
}

// ─── Probabilidades (fallback) ────────────────────────────────
const PROBABILIDADE_ESTAGIO: Record<string, number> = {
  contato: 0.05,
  visita_agendada: 0.15,
  visita_realizada: 0.25,
  proposta_pendente: 0.35,
  proposta: 0.5,
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

// ─── Helpers ────────────────────────────────────────────────
function median(nums: number[]): number {
  if (!nums.length) return 0;
  const arr = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function monthsInclusive(start: Date, end: Date): number {
  const s = startOfMonth(start);
  const e = startOfMonth(end);
  return Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1);
}

function normalizeTipo(tipo: string): string {
  return (tipo || "").trim().toLowerCase();
}

function isTipoReceita(tipo: string): boolean {
  const t = normalizeTipo(tipo);
  // cobre "vendas (r$)", "vendas", "receita"
  return t.includes("vendas") || t.includes("receita");
}

function isTipoPropostasRS(tipo: string): boolean {
  const t = normalizeTipo(tipo);
  // cobre "propostas (r$)"
  return t.includes("propostas") && t.includes("(r$)");
}

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

      // ─── Fetch em paralelo ───────────────────────────────
      const [contratosRes, enviadasRes, abertasRes, metasRes, leadsRes] = await Promise.all([
        supabase
          .from("contratos")
          .select("id, proposta_id, created_at, data_inicio, valor_negociado")
          .eq("user_id", user.id)
          .not("proposta_id", "is", null),

        supabase
          .from("propostas")
          .select("id, data, data_fechamento, valor_total, status")
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

        supabase.from("leads").select("id, estagio").eq("user_id", user.id),
      ]);

      if (contratosRes.error) throw contratosRes.error;
      if (enviadasRes.error) throw enviadasRes.error;
      if (abertasRes.error) throw abertasRes.error;
      if (metasRes.error) throw metasRes.error;
      if (leadsRes.error) throw leadsRes.error;

      const contratos = contratosRes.data || [];
      const enviadas12m = (enviadasRes.data || []) as Array<{
        id: string;
        data: string;
        data_fechamento: string | null;
        valor_total: number | null;
        status: string | null;
      }>;
      const abertasRaw = (abertasRes.data || []) as Array<{
        id: string;
        data: string;
        valor_total: number | null;
        status: string | null;
        lead_id: string | null;
      }>;
      const metasAtivas = (metasRes.data || []) as MetaAtiva[];
      const leads = (leadsRes.data || []) as Array<{ id: string; estagio: string | null }>;

      // Map de estágios
      const leadMap = new Map<string, string>();
      leads.forEach((l) => {
        if (l?.id && l?.estagio) leadMap.set(l.id, l.estagio);
      });

      // Excluir do pipeline propostas que já têm contrato (fonte da verdade de fechamento)
      const propostaIdsComContrato = new Set<string>(contratos.map((c: any) => c.proposta_id).filter(Boolean));
      const abertas = abertasRaw.filter((p) => !propostaIdsComContrato.has(p.id));

      // ─── Buscar propostas vinculadas aos contratos (para data envio/fechamento e fallback de valor) ───
      const propostaIds = contratos.map((c: any) => c.proposta_id).filter(Boolean) as string[];
      const propostasMap = new Map<
        string,
        { data: string; data_fechamento: string | null; valor_total: number | null }
      >();

      if (propostaIds.length > 0) {
        const { data: pf, error } = await supabase
          .from("propostas")
          .select("id, data, data_fechamento, valor_total")
          .in("id", propostaIds);
        if (error) throw error;
        (pf || []).forEach((p: any) => {
          propostasMap.set(p.id, {
            data: p.data,
            data_fechamento: p.data_fechamento,
            valor_total: p.valor_total,
          });
        });
      }

      // ─── Fechamentos 12m (contratos como verdade) ───────────────────────────────
      const fechamentos12m = contratos
        .map((c: any) => {
          const prop = propostasMap.get(c.proposta_id);
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

      // ─── BaseStats (financeiro) ───────────────────────────────
      const valorEnviado12m = enviadas12m.reduce((s, p) => s + Number(p.valor_total || 0), 0);
      const valorFechado12m = fechamentos12m.reduce((s, f) => s + Number(f.valor || 0), 0);
      const numContratos12m = fechamentos12m.length;

      const conversaoFinanceira = valorEnviado12m > 0 ? valorFechado12m / valorEnviado12m : 0;
      const ticketReal = numContratos12m > 0 ? valorFechado12m / numContratos12m : 0;
      const receitaMediaMensal = valorFechado12m / 12;
      const volumeEnviadoMensal = valorEnviado12m / 12;

      // P50 recomendado para distribuir pipeline com mais realismo
      const tempoMedioFechamentoDias = (() => {
        const dias = fechamentos12m.map((f) => f.diasFechamento).filter((d) => Number.isFinite(d));
        const p50 = median(dias);
        return Math.round(p50 || 45);
      })();

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

      // ─── Pipeline atual (R$ ponderado) ───────────────────────────────
      const pipelineItems: PipelineItem[] = abertas.map((p) => {
        const estagio = p.lead_id ? leadMap.get(p.lead_id) || null : null;

        const prob = estagio
          ? (PROBABILIDADE_ESTAGIO[estagio] ?? PROBABILIDADE_STATUS[p.status || "aberta"] ?? 0.35)
          : (PROBABILIDADE_STATUS[p.status || "aberta"] ?? 0.35);

        const valorTotal = Number(p.valor_total || 0);
        const diasAberta = Math.max(differenceInDays(agora, new Date(p.data)), 0);

        return {
          id: p.id,
          valorTotal,
          status: p.status || "aberta",
          estagio,
          probabilidade: prob,
          valorPonderado: valorTotal * prob,
          diasAberta,
        };
      });

      const pipeline: PipelineResumo = {
        valorBruto: pipelineItems.reduce((s, x) => s + x.valorTotal, 0),
        valorPonderado: pipelineItems.reduce((s, x) => s + x.valorPonderado, 0),
        qtdPropostas: pipelineItems.length,
        porEstagio: {},
      };

      pipelineItems.forEach((p) => {
        const key = p.estagio || "sem_lead";
        if (!pipeline.porEstagio[key]) pipeline.porEstagio[key] = { valor: 0, ponderado: 0, qtd: 0 };
        pipeline.porEstagio[key].valor += p.valorTotal;
        pipeline.porEstagio[key].ponderado += p.valorPonderado;
        pipeline.porEstagio[key].qtd += 1;
      });

      // ─── Metas: calcular MÊS a MÊS por TIPO ───────────────────────────────
      function getMetaMensalByTipo(mesKey: string): Record<string, number> {
        const res: Record<string, number> = {};
        const mesDate = startOfMonth(new Date(mesKey + "-01"));

        for (const m of metasAtivas) {
          const inicio = startOfMonth(new Date(m.periodo_inicio));
          const fim = endOfMonth(new Date(m.periodo_fim));

          if (mesDate < inicio || mesDate > fim) continue;

          const meses = monthsInclusive(inicio, fim);
          const valorMensal = Number(m.valor_alvo || 0) / meses;

          const tipo = m.tipo || "Meta";
          res[tipo] = (res[tipo] || 0) + valorMensal;
        }

        // arredonda só no final
        Object.keys(res).forEach((k) => (res[k] = Math.round(res[k])));
        return res;
      }

      function sumByPredicate(metaByTipo: Record<string, number>, pred: (tipo: string) => boolean): number {
        return Object.entries(metaByTipo).reduce((s, [tipo, v]) => (pred(tipo) ? s + Number(v || 0) : s), 0);
      }

      // ─── Distribuir pipeline por mês (30/50/20) ───────────────────────────────
      const pipelinePorMes = new Map<string, number>();
      const spread = [
        { deltaMonth: -1, w: 0.3 },
        { deltaMonth: 0, w: 0.5 },
        { deltaMonth: +1, w: 0.2 },
      ];

      pipelineItems.forEach((p) => {
        const diasRestantes = Math.max(0, tempoMedioFechamentoDias - p.diasAberta);
        const dataEstimada = new Date(agora);
        dataEstimada.setDate(dataEstimada.getDate() + diasRestantes);

        spread.forEach(({ deltaMonth, w }) => {
          const d = addMonths(dataEstimada, deltaMonth);
          const mesKey = format(d, "yyyy-MM");
          const add = p.valorPonderado * w;
          pipelinePorMes.set(mesKey, (pipelinePorMes.get(mesKey) || 0) + add);
        });
      });

      // ─── Incremental com delay (impacto após tempo médio) ───────────────────
      const mesesDeDelay = Math.max(0, Math.ceil(tempoMedioFechamentoDias / 30));

      // ─── Forecast mensal (com 3 séries separadas) ───────────────────────────
      const forecastMensal: ForecastMensal[] = [];

      for (let i = 0; i < params.horizonte; i++) {
        const mesDate = addMonths(agora, i);
        const mesKey = format(mesDate, "yyyy-MM");
        const mesLabel = format(mesDate, "MMM/yy", { locale: ptBR });

        const metaByTipo = getMetaMensalByTipo(mesKey);

        const metaReceita = sumByPredicate(metaByTipo, isTipoReceita);
        const metaPropostasRS = sumByPredicate(metaByTipo, isTipoPropostasRS);

        const baseline = receitaMediaMensal;
        const pipelineAlloc = pipelinePorMes.get(mesKey) || 0;

        const incrementalAlloc =
          i >= mesesDeDelay ? Number(params.valorAdicionalMensal || 0) * Number(params.conversaoMarginal || 0) : 0;

        const forecastTotal = baseline + pipelineAlloc + incrementalAlloc;

        // Gap é calculado contra meta de RECEITA (Vendas/Receita)
        const gapReceita = Math.max(0, metaReceita - forecastTotal);

        // Quanto precisa GERAR em propostas (R$) para cobrir o gap (usando conversão marginal como “alavanca”)
        const conv = Number(params.conversaoMarginal || 0) > 0 ? Number(params.conversaoMarginal) : 0;
        const acaoNecessariaRS = conv > 0 ? gapReceita / conv : 0;

        // Equivalente em número de propostas (informativo)
        const propostasEquiv = ticketReal > 0 && conv > 0 ? Math.ceil(acaoNecessariaRS / ticketReal) : 0;

        forecastMensal.push({
          mes: mesLabel,
          mesKey,

          baseline: Math.round(baseline),
          pipelineAlloc: Math.round(pipelineAlloc),
          incrementalAlloc: Math.round(incrementalAlloc),

          forecastTotal: Math.round(forecastTotal),

          metaReceita: Math.round(metaReceita),
          metaPropostasRS: Math.round(metaPropostasRS),
          metaByTipo,

          gapReceita: Math.round(gapReceita),
          acaoNecessariaRS: Math.round(acaoNecessariaRS),
          propostasEquiv,
        });
      }

      // ─── Histórico 12m (R$ enviado/fechado + conversão financeira %) ─────────
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
          .reduce((s, f) => s + Number(f.valor || 0), 0);

        volumeHistorico.push({
          mes: mesLabel,
          valorEnviado: Math.round(envMesValor),
          valorFechado: Math.round(fechMesValor),
          conversaoFinanceira: envMesValor > 0 ? parseFloat(((fechMesValor / envMesValor) * 100).toFixed(1)) : 0,
        });
      }

      // ─── Insights (mantém simples e correto) ────────────────────────────────
      const insights: Insight[] = [];
      const mesAtual = forecastMensal[0];

      if (baseStats.amostraPequena) {
        insights.push({
          text: `Dados limitados: apenas ${numContratos12m} contratos em 12 meses. Previsões podem ter margem de erro maior.`,
          level: "muted",
        });
      }

      if (mesAtual) {
        insights.push({
          text: `Mantendo o ritmo atual, este mês fecha em R$ ${mesAtual.forecastTotal.toLocaleString("pt-BR")}`,
          level: mesAtual.metaReceita > 0 && mesAtual.forecastTotal >= mesAtual.metaReceita ? "success" : "muted",
        });

        if (pipeline.valorPonderado > 0) {
          insights.push({
            text: `Pipeline ponderado atual: R$ ${pipeline.valorPonderado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} (${pipeline.qtdPropostas} propostas abertas)`,
            level: "success",
          });
        }

        if (mesAtual.metaReceita > 0) {
          if (mesAtual.forecastTotal >= mesAtual.metaReceita) {
            insights.push({ text: "Você está no caminho para bater a meta de receita deste mês.", level: "success" });
          } else {
            insights.push({
              text: `Para bater a meta de receita, é necessário gerar +R$ ${mesAtual.acaoNecessariaRS.toLocaleString("pt-BR")} em novas propostas (≈ ${mesAtual.propostasEquiv} propostas).`,
              level: "warning",
            });
          }
        } else {
          insights.push({
            text: "Nenhuma meta de receita ativa encontrada para este mês. Cadastre uma meta em Metas → Vendas (R$).",
            level: "muted",
          });
        }
      }

      return { baseStats, pipeline, forecastMensal, volumeHistorico, metasAtivas, insights };
    },
    enabled: !!user,
  });
}
