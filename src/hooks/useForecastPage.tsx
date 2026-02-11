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
  /** Conversão marginal (0..1) que o usuário espera para novas propostas */
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

  /** Ação total necessária (sem considerar propostas já geradas no mês) */
  acaoNecessariaTotalRS: number;

  /** Propostas já geradas/cadastradas no mês (R$) */
  propostasGeradasMes: number;

  /** Ação necessária adicional (descontando propostas já geradas no mês) */
  acaoNecessariaRS: number;

  propostasEquiv: number;
  pctPipelineNoForecast: number;

  // Receita real
  receitaReal: number;
  custoReal: number;
  margemReal: number | null;
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
  status?: string | null;
}

export type InsightLevel = "success" | "warning" | "destructive" | "muted";

export interface Insight {
  text: string;
  level: InsightLevel;
}

// ─── Normalização ─────────────────────────────────────────────

const norm = (s?: string | null) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const META_TIPOS_RECEITA = new Set(["vendas", "vendas (r$)", "receita"]);
const META_STATUS_ATIVO = new Set(["ativa", "ativo", "active"]);

const STATUS_ABERTOS = new Set(["aberta", "em analise", "em análise", "analise", "análise", "em andamento"]);

const STATUS_FECHADOS = new Set(["fechada", "finalizado", "finalizada", "concluido", "concluida"]);
const STATUS_PERDIDOS = new Set(["perdida", "perdido", "cancelada", "cancelado"]);

// ─── Probabilidades ───────────────────────────────────────────

const PROBABILIDADE_ESTAGIO: Record<string, number> = {
  contato: 0.05,
  visita_agendada: 0.15,
  visita_agendada_: 0.15,
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

// ─── Helpers ──────────────────────────────────────────────────

function monthsInclusive(start: Date, end: Date): number {
  const s = startOfMonth(start);
  const e = startOfMonth(end);
  return Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1);
}

function safeMonthKey(dateStr?: string | null, fallback?: Date) {
  const d = dateStr ? new Date(dateStr) : fallback;
  if (!d || Number.isNaN(d.getTime())) return null;
  return format(d, "yyyy-MM");
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
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;

      const agora = new Date();
      const dataLimite12m = subMonths(agora, 12);
      const dataLimite12mStr = format(dataLimite12m, "yyyy-MM-dd");

      // ─── Fetch em paralelo ────────────────────────────────
      const [contratosRes, propostasCurrentRes, metasRes, leadsRes] = await Promise.all([
        supabase
          .from("contratos")
          .select("proposta_id, created_at, data_inicio, valor_negociado, margem_pct")
          .eq("user_id", user.id)
          .not("proposta_id", "is", null),

        supabase
          .from("propostas")
          .select("id, data, created_at, is_current, data_fechamento, valor_total, status, lead_id")
          .eq("user_id", user.id)
          .eq("is_current", true),

        supabase
          .from("metas")
          .select("id, nome, tipo, valor_alvo, periodo_inicio, periodo_fim, status")
          .eq("user_id", user.id),

        supabase.from("leads").select("id, estagio").eq("user_id", user.id),
      ]);

      if (contratosRes.error) throw contratosRes.error;
      if (propostasCurrentRes.error) throw propostasCurrentRes.error;
      if (metasRes.error) throw metasRes.error;
      if (leadsRes.error) throw leadsRes.error;

      const contratos = contratosRes.data || [];
      const propostasCurrent = (propostasCurrentRes.data || []) as any[];
      const todasMetas = (metasRes.data || []) as MetaAtiva[];
      const leads = (leadsRes.data || []) as any[];

      // ✅ Metas ativas de receita
      const metasAtivas = todasMetas.filter((m) => {
        const tipoOk = META_TIPOS_RECEITA.has(norm(m.tipo));
        const status = norm(m.status);
        const statusOk = status ? META_STATUS_ATIVO.has(status) : true;
        return tipoOk && statusOk;
      });

      // Lead map: lead_id -> estagio
      const leadMap = new Map<string, string | null>();
      leads.forEach((l) => leadMap.set(l.id, l.estagio ?? null));

      // ✅ Excluir do pipeline propostas que já têm contrato (evita duplicidade)
      const propostaIdsComContrato = new Set<string>((contratos as any[]).map((c) => c.proposta_id).filter(Boolean));

      // ─── Propostas enviadas 12m (volume) + map por mês ─────
      const propostas12m = propostasCurrent.filter((p) => {
        const ref = p.data || p.created_at;
        if (!ref) return false;
        const d = new Date(ref);
        return !Number.isNaN(d.getTime()) && d >= dataLimite12m;
      });

      const valorEnviado12m = propostas12m.reduce((s, p) => s + Number(p.valor_total || 0), 0);

      const propostasGeradasPorMes = new Map<string, number>();
      propostas12m.forEach((p) => {
        const mk = safeMonthKey(p.data || p.created_at, agora);
        if (!mk) return;
        propostasGeradasPorMes.set(mk, (propostasGeradasPorMes.get(mk) || 0) + Number(p.valor_total || 0));
      });

      // ─── Fetch proposals of contracts (para data/fechamento) ─
      const propostaIds = (contratos as any[]).map((c) => c.proposta_id).filter(Boolean) as string[];

      const propostasMap = new Map<
        string,
        { data: string | null; data_fechamento: string | null; valor_total: number | null }
      >();

      if (propostaIds.length > 0) {
        const { data: pf, error } = await supabase
          .from("propostas")
          .select("id, data, data_fechamento, valor_total")
          .in("id", propostaIds);

        if (error) throw error;

        (pf || []).forEach((p: any) => {
          propostasMap.set(p.id, {
            data: p.data ?? null,
            data_fechamento: p.data_fechamento ?? null,
            valor_total: p.valor_total ?? null,
          });
        });
      }

      // ─── Fechamentos 12m (contratos como verdade) ───────────
      const fechamentos12m = (contratos as any[])
        .map((c) => {
          const prop = propostasMap.get(c.proposta_id);
          if (!prop) return null;

          const closeDateStr = prop.data_fechamento || c.created_at || c.data_inicio;
          const closeDate = new Date(closeDateStr);
          if (Number.isNaN(closeDate.getTime()) || closeDate < dataLimite12m) return null;

          const valor = Number(c.valor_negociado || prop.valor_total || 0);
          const margemPct = Number(c.margem_pct || 0);
          const mesKey = format(closeDate, "yyyy-MM");

          const dataEnvio = prop.data ? new Date(prop.data) : closeDate;
          const diasFechamento = Math.max(differenceInDays(closeDate, dataEnvio), 0);

          return { valor, margemPct, mesKey, diasFechamento };
        })
        .filter(Boolean) as { valor: number; margemPct: number; mesKey: string; diasFechamento: number }[];

      const valorFechado12m = fechamentos12m.reduce((s, f) => s + f.valor, 0);
      const numContratos12m = fechamentos12m.length;

      const conversaoFinanceira = valorEnviado12m > 0 ? valorFechado12m / valorEnviado12m : 0;
      const ticketReal = numContratos12m > 0 ? valorFechado12m / numContratos12m : 0;
      const receitaMediaMensal = valorFechado12m / 12;
      const volumeEnviadoMensal = valorEnviado12m / 12;

      const tempoMedioFechamentoDias =
        fechamentos12m.length > 0
          ? Math.round(fechamentos12m.reduce((s, f) => s + f.diasFechamento, 0) / fechamentos12m.length)
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

      // ─── Pipeline (propostas abertas) ───────────────────────
      const abertas = propostasCurrent.filter((p) => {
        const st = norm(p.status);
        const isAberta = STATUS_ABERTOS.has(st) && !STATUS_FECHADOS.has(st) && !STATUS_PERDIDOS.has(st);
        if (!isAberta) return false;
        if (propostaIdsComContrato.has(p.id)) return false;
        return true;
      });

      const pipelineItems: PipelineItem[] = abertas.map((p) => {
        const estagio = p.lead_id ? (leadMap.get(p.lead_id) ?? null) : null;

        const estKey = estagio ? norm(estagio) : "";
        const estKeyUnderscore = estKey.replace(/\s+/g, "_");
        const probEstagio = PROBABILIDADE_ESTAGIO[estKeyUnderscore] ?? PROBABILIDADE_ESTAGIO[estKey] ?? undefined;

        const statusKey = norm(p.status || "aberta");
        const probStatus = PROBABILIDADE_STATUS[statusKey] ?? 0.35;

        const probabilidade = estagio ? (probEstagio ?? probStatus) : probStatus;

        const valorTotal = Number(p.valor_total || 0);
        const dataEnvioRef = p.data || p.created_at;
        const dataEnvio = dataEnvioRef ? new Date(dataEnvioRef) : agora;
        const diasAberta = Math.max(differenceInDays(agora, dataEnvio), 0);

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
        if (!pipeline.porEstagio[key]) pipeline.porEstagio[key] = { valor: 0, ponderado: 0, qtd: 0 };
        pipeline.porEstagio[key].valor += p.valorTotal;
        pipeline.porEstagio[key].ponderado += p.valorPonderado;
        pipeline.porEstagio[key].qtd += 1;
      });

      // ─── Meta mensal (prorrateada) ──────────────────────────
      function getMetaMensal(mesKey: string): number {
        let total = 0;

        const mesStart = startOfMonth(new Date(mesKey + "-01"));
        const mesEnd = endOfMonth(mesStart);

        for (const m of metasAtivas) {
          const inicio = new Date(m.periodo_inicio);
          const fim = new Date(m.periodo_fim);

          const cobreMes = mesEnd >= inicio && mesStart <= fim;
          if (!cobreMes) continue;

          const meses = monthsInclusive(inicio, fim);
          total += Number(m.valor_alvo || 0) / Math.max(1, meses);
        }

        return total;
      }

      // ─── Distribuir pipeline por mês (30/50/20) ─────────────
      const pipelinePorMes = new Map<string, number>();

      pipelineItems.forEach((p) => {
        const diasRestantes = Math.max(0, tempoMedioFechamentoDias - p.diasAberta);
        const estimada = new Date(agora);
        estimada.setDate(estimada.getDate() + diasRestantes);

        const mesEstimado = format(estimada, "yyyy-MM");
        const mesAnterior = format(addMonths(new Date(mesEstimado + "-01"), -1), "yyyy-MM");
        const mesSeguinte = format(addMonths(new Date(mesEstimado + "-01"), 1), "yyyy-MM");

        const v = p.valorPonderado;
        pipelinePorMes.set(mesAnterior, (pipelinePorMes.get(mesAnterior) || 0) + v * 0.3);
        pipelinePorMes.set(mesEstimado, (pipelinePorMes.get(mesEstimado) || 0) + v * 0.5);
        pipelinePorMes.set(mesSeguinte, (pipelinePorMes.get(mesSeguinte) || 0) + v * 0.2);
      });

      // ─── Receita real por mês ───────────────────────────────
      const receitaRealPorMes = new Map<string, number>();
      const custoRealPorMes = new Map<string, number>();

      fechamentos12m.forEach((f) => {
        receitaRealPorMes.set(f.mesKey, (receitaRealPorMes.get(f.mesKey) || 0) + f.valor);
        if (f.margemPct > 0) {
          const custo = f.valor * (1 - f.margemPct / 100);
          custoRealPorMes.set(f.mesKey, (custoRealPorMes.get(f.mesKey) || 0) + custo);
        }
      });

      // ─── Forecast mensal ───────────────────────────────────
      const forecastMensal: ForecastMensal[] = [];
      const baseline = receitaMediaMensal;

      const mesesDeDelay = Math.ceil(tempoMedioFechamentoDias / 30);

      for (let i = 0; i < params.horizonte; i++) {
        const mesDate = addMonths(agora, i);
        const mesKey = format(mesDate, "yyyy-MM");
        const mesLabel = format(mesDate, "MMM/yy", { locale: ptBR });

        const meta = getMetaMensal(mesKey);
        const pipelineAlloc = pipelinePorMes.get(mesKey) || 0;

        const incrementalAlloc =
          i >= mesesDeDelay ? Number(params.valorAdicionalMensal || 0) * Number(params.conversaoMarginal || 0) : 0;

        const forecastTotal = baseline + pipelineAlloc + incrementalAlloc;
        const gap = Math.max(0, meta - forecastTotal);

        const convMarginal = Number(params.conversaoMarginal || 0);
        const acaoTotal = convMarginal > 0 ? gap / convMarginal : 0;

        const propostasGeradasMes = propostasGeradasPorMes.get(mesKey) || 0;

        // ✅ aqui está a mudança que você queria:
        // Ação necessária passa a considerar o que já foi gerado/cadastrado no mês
        const acaoAdicional = Math.max(0, acaoTotal - propostasGeradasMes);

        const ticketMarginal = Number(params.ticketMarginal || 0);
        const propostasEquiv = ticketMarginal > 0 ? Math.ceil(acaoAdicional / ticketMarginal) : 0;

        const pctPipelineNoForecast = forecastTotal > 0 ? (pipelineAlloc / forecastTotal) * 100 : 0;

        const receitaReal = receitaRealPorMes.get(mesKey) || 0;
        const custoReal = custoRealPorMes.get(mesKey) || 0;
        const margemReal = receitaReal > 0 ? ((receitaReal - custoReal) / receitaReal) * 100 : null;

        forecastMensal.push({
          mes: mesLabel,
          mesKey,
          baseline: Math.round(baseline),
          pipelineAlloc: Math.round(pipelineAlloc),
          incrementalAlloc: Math.round(incrementalAlloc),
          forecastTotal: Math.round(forecastTotal),
          meta: Math.round(meta),
          gap: Math.round(gap),
          acaoNecessariaTotalRS: Math.round(acaoTotal),
          propostasGeradasMes: Math.round(propostasGeradasMes),
          acaoNecessariaRS: Math.round(acaoAdicional),
          propostasEquiv,
          pctPipelineNoForecast: parseFloat(pctPipelineNoForecast.toFixed(1)),
          receitaReal: Math.round(receitaReal),
          custoReal: Math.round(custoReal),
          margemReal: margemReal !== null ? parseFloat(margemReal.toFixed(1)) : null,
        });
      }

      // ─── Histórico 12m ─────────────────────────────────────
      const volumeHistorico: VolumeHistorico[] = [];
      for (let i = 11; i >= 0; i--) {
        const mesDate = subMonths(agora, i);
        const mesKey = format(mesDate, "yyyy-MM");
        const mesLabel = format(mesDate, "MMM/yy", { locale: ptBR });

        const envMesValor = propostas12m
          .filter((p) => safeMonthKey(p.data || p.created_at, agora) === mesKey)
          .reduce((s, p) => s + Number(p.valor_total || 0), 0);

        const fechMesValor = fechamentos12m.filter((f) => f.mesKey === mesKey).reduce((s, f) => s + f.valor, 0);

        volumeHistorico.push({
          mes: mesLabel,
          valorEnviado: Math.round(envMesValor),
          valorFechado: Math.round(fechMesValor),
          conversaoFinanceira: envMesValor > 0 ? parseFloat(((fechMesValor / envMesValor) * 100).toFixed(1)) : 0,
        });
      }

      // ─── Insights ──────────────────────────────────────────
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
        const pctPipeline =
          mesAtual.forecastTotal > 0 ? ((pipeline.valorPonderado / mesAtual.forecastTotal) * 100).toFixed(0) : "0";

        insights.push({
          text: `Pipeline total (ponderado): R$ ${pipeline.valorPonderado.toLocaleString("pt-BR", {
            maximumFractionDigits: 0,
          })} (${pctPipeline}% do forecast do mês foco)`,
          level: "success",
        });
      }

      if (mesAtual && mesAtual.meta > 0) {
        if (mesAtual.forecastTotal >= mesAtual.meta) {
          insights.push({ text: "Você está no caminho para bater a meta deste mês", level: "success" });
        } else {
          insights.push({
            text: `Ação adicional para bater a meta: +R$ ${mesAtual.acaoNecessariaRS.toLocaleString("pt-BR")} em propostas (≈ ${mesAtual.propostasEquiv} propostas)`,
            level: "warning",
          });
        }
      }

      if (tempoMedioFechamentoDias > 0) {
        insights.push({
          text: `Tempo médio de fechamento: ${tempoMedioFechamentoDias} dias. Por isso o pipeline só entra no forecast perto da data estimada de fechamento.`,
          level: "muted",
        });
      }

      return {
        baseStats,
        pipeline,
        forecastMensal,
        volumeHistorico,
        metasAtivas,
        insights,
      };
    },
  });
}
