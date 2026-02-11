import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, addMonths, differenceInDays, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ForecastPageParams {
  horizonte: 3 | 6 | 12;
  valorAdicionalMensal: number; // R$/mês
  conversaoMarginal: number; // 0..1
  ticketMarginal: number; // R$
}

export interface BaseStats {
  valorEnviado12m: number;
  valorFechado12m: number;
  conversaoFinanceira: number; // 0..1
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
  probabilidade: number; // 0..1 (antes do decaimento)
  decay: number; // 0..1
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

  receitaReal: number;
  custoReal: number;
  margemReal: number | null;
}

export interface VolumeHistorico {
  mes: string;
  valorEnviado: number;
  valorFechado: number;
  conversaoFinanceira: number; // %
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

// ─────────────────────────────────────────────────────────────
// Normalização
// ─────────────────────────────────────────────────────────────

const norm = (s?: string | null) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const META_TIPOS_RECEITA = new Set(["vendas", "vendas (r$)", "receita"]);
const META_STATUS_ATIVO = new Set(["ativa", "ativo", "active", "on", "running"]);

// Status que DEVEM ser tratados como "não-abertos"
const STATUS_FECHADOS_OU_PERDIDOS = new Set([
  "fechada",
  "fechado",
  "ganha",
  "ganho",
  "perdida",
  "perdido",
  "cancelada",
  "cancelado",

  // comuns em CRMs
  "contrato",
  "contratado",
  "aprovada",
  "aprovado",
  "assinada",
  "assinado",
  "executando",
  "execucao",
  "em_execucao",
  "finalizado",
  "finalizada",
  "concluido",
  "concluida",
  "encerrado",
  "encerrada",
  "faturado",
  "faturada",
  "pago",
  "paga",
]);

function isStatusAberto(status?: string | null) {
  const s = norm(status);
  if (!s) return true;

  if (STATUS_FECHADOS_OU_PERDIDOS.has(s)) return false;

  // fallback robusto (caso alguém digite diferente)
  if (
    s.includes("fech") ||
    s.includes("ganh") ||
    s.includes("perd") ||
    s.includes("cancel") ||
    s.includes("assin") ||
    s.includes("contrat") ||
    s.includes("finaliz") ||
    s.includes("conclu") ||
    s.includes("encerr") ||
    s.includes("fatur") ||
    s.includes("pag")
  ) {
    return false;
  }

  return true;
}

// Probabilidades por estágio (lead.estagio) - ajuste conforme seu funil real
const PROBABILIDADE_ESTAGIO: Record<string, number> = {
  contato: 0.05,
  visita_agendada: 0.15,
  visita_realizada: 0.25,
  proposta_pendente: 0.35,
  proposta: 0.5,
  negociacao: 0.6,
  em_analise: 0.35,

  // se "repouso" significa “gelado/pausado”, mantenha baixo
  repouso: 0.08,
};

// Probabilidades por status da proposta (fallback)
const PROBABILIDADE_STATUS: Record<string, number> = {
  aberta: 0.35,
  aberto: 0.35,
  em_analise: 0.35,
  analise: 0.35,
  negociacao: 0.45,
};

// Se você NÃO quiser que "Repouso" conte no Pipeline Vivo, marque true.
const EXCLUIR_REPOUSO_DO_PIPELINE = true;

function monthsInclusive(start: Date, end: Date): number {
  const s = startOfMonth(start);
  const e = startOfMonth(end);
  return Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1);
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useForecastPage(params: ForecastPageParams) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      "forecast-page-v5", // bump versão p/ evitar cache antigo
      params.horizonte,
      params.valorAdicionalMensal,
      params.conversaoMarginal,
      params.ticketMarginal,
      user?.id,
    ],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;

      const agora = new Date();
      const mesAgoraKey = format(agora, "yyyy-MM");
      const dataLimite12m = subMonths(agora, 12);
      const dataLimite12mStr = format(dataLimite12m, "yyyy-MM-dd");

      // 1) Buscar dados base
      const [contratosRes, propostas12mRes, metasRes, leadsRes] = await Promise.all([
        supabase
          .from("contratos")
          .select("proposta_id, created_at, data_inicio, valor_negociado, margem_pct")
          .eq("user_id", user.id)
          .not("proposta_id", "is", null),

        // Histórico 12m: NÃO filtra is_current
        supabase
          .from("propostas")
          .select("id, data, data_fechamento, valor_total, status")
          .eq("user_id", user.id)
          .gte("data", dataLimite12mStr),

        supabase
          .from("metas")
          .select("id, nome, tipo, valor_alvo, periodo_inicio, periodo_fim, status")
          .eq("user_id", user.id),

        supabase.from("leads").select("id, estagio").eq("user_id", user.id),
      ]);

      if (contratosRes.error) throw contratosRes.error;
      if (propostas12mRes.error) throw propostas12mRes.error;
      if (metasRes.error) throw metasRes.error;
      if (leadsRes.error) throw leadsRes.error;

      // 2) Propostas atuais: PRIORIZA is_current = true (evita inflar com NULL antigo)
      const propostasCurrentTrueRes = await supabase
        .from("propostas")
        .select("id, data, valor_total, status, lead_id, is_current")
        .eq("user_id", user.id)
        .eq("is_current", true);

      let propostasCurrent = (propostasCurrentTrueRes.data || []) as any[];

      // fallback (legado): se não existir nenhuma marcada como current
      if (propostasCurrent.length === 0) {
        const propostasCurrentLegacyRes = await supabase
          .from("propostas")
          .select("id, data, valor_total, status, lead_id, is_current")
          .eq("user_id", user.id)
          .or("is_current.is.null,is_current.eq.true");

        if (propostasCurrentLegacyRes.error) throw propostasCurrentLegacyRes.error;
        propostasCurrent = (propostasCurrentLegacyRes.data || []) as any[];
      } else {
        if (propostasCurrentTrueRes.error) throw propostasCurrentTrueRes.error;
      }

      const contratos = (contratosRes.data || []) as any[];
      const propostas12m = (propostas12mRes.data || []) as any[];
      const todasMetas = (metasRes.data || []) as MetaAtiva[];
      const leads = (leadsRes.data || []) as any[];

      // metas ativas (receita)
      const metasAtivas = todasMetas.filter((m) => {
        const tipoOk = META_TIPOS_RECEITA.has(norm(m.tipo));
        const st = norm(m.status);
        const statusOk = st ? META_STATUS_ATIVO.has(st) : true;
        return tipoOk && statusOk;
      });

      // lead map
      const leadMap = new Map<string, string | null>();
      leads.forEach((l) => leadMap.set(l.id, l.estagio ?? null));

      // propostas com contrato (para excluir do pipeline)
      const propostaIdsComContrato = new Set<string>(contratos.map((c) => c.proposta_id).filter(Boolean));

      // pipeline bruto: abertas + sem contrato
      const abertas = propostasCurrent.filter((p) => {
        if (!p?.id) return false;
        if (propostaIdsComContrato.has(p.id)) return false;
        return isStatusAberto(p.status);
      });

      // 3) Fechamentos 12m (contrato como verdade)
      const propMap = new Map<
        string,
        { data?: string; data_fechamento?: string | null; valor_total?: number | null }
      >();

      propostas12m.forEach((p) => {
        propMap.set(p.id, {
          data: p.data,
          data_fechamento: p.data_fechamento,
          valor_total: p.valor_total,
        });
      });

      const fechamentos12m = contratos
        .map((c) => {
          const prop = propMap.get(c.proposta_id);
          const closeDateStr = prop?.data_fechamento || c.created_at || c.data_inicio;
          const closeDate = closeDateStr ? new Date(closeDateStr) : null;
          if (!closeDate) return null;
          if (closeDate < dataLimite12m) return null;

          const valor = Number(c.valor_negociado || prop?.valor_total || 0);
          const margemPct = Number(c.margem_pct || 0);
          const mesKey = format(closeDate, "yyyy-MM");

          const dataEnvio = prop?.data ? new Date(prop.data) : closeDate;
          const diasFechamento = Math.max(differenceInDays(closeDate, dataEnvio), 0);

          return { valor, margemPct, mesKey, diasFechamento };
        })
        .filter(Boolean) as {
        valor: number;
        margemPct: number;
        mesKey: string;
        diasFechamento: number;
      }[];

      // 4) BaseStats
      const valorEnviado12m = propostas12m.reduce((s, p) => s + Number(p.valor_total || 0), 0);
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

      // 5) Pipeline (com decaimento por idade)
      const tempo = Math.max(30, tempoMedioFechamentoDias || 0);

      const pipelineItems: PipelineItem[] = abertas
        .map((p) => {
          const estagio = p.lead_id ? (leadMap.get(p.lead_id) ?? null) : null;

          // excluir repouso do “pipeline vivo” (opcional)
          if (EXCLUIR_REPOUSO_DO_PIPELINE && norm(estagio) === "repouso") {
            return null;
          }

          const statusKey = norm(p.status || "");
          const estKey = estagio ? norm(estagio).replace(/\s+/g, "_") : "";

          // base prob: usa estágio se existir no mapa; se não, cai pro status; se não, baixo
          const probEstagio = estKey ? PROBABILIDADE_ESTAGIO[estKey] : undefined;
          const probStatus = PROBABILIDADE_STATUS[statusKey] ?? (statusKey ? 0.28 : 0.18);

          const probabilidade = probEstagio ?? probStatus;

          const valorTotal = Number(p.valor_total || 0);
          const dataEnvio = p.data ? new Date(p.data) : agora;
          const diasAberta = Math.max(differenceInDays(agora, dataEnvio), 0);

          // decaimento
          const overdue = Math.max(0, diasAberta - tempo);
          let decay = Math.exp(-overdue / (tempo * 0.9));
          if (diasAberta > tempo * 2.5) decay *= 0.15;

          const valorPonderado = valorTotal * probabilidade * decay;

          return {
            id: p.id,
            valorTotal,
            status: String(p.status || "aberta"),
            estagio,
            probabilidade,
            decay,
            valorPonderado,
            diasAberta,
          };
        })
        .filter(Boolean) as PipelineItem[];

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

      // 6) Meta mensal prorrateada
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

      // 7) Distribuir pipeline por mês
      const pipelinePorMes = new Map<string, number>();

      pipelineItems.forEach((p) => {
        const dataEnvio = addDays(agora, -p.diasAberta);

        const baseClose = addDays(dataEnvio, tempo);
        const estimada =
          baseClose < agora ? addDays(agora, Math.min(45, Math.max(30, Math.round(tempo * 0.25)))) : baseClose;

        const mesEstimado = format(estimada, "yyyy-MM");
        const mesSeguinte = format(addMonths(new Date(mesEstimado + "-01"), 1), "yyyy-MM");
        const mesSeguinte2 = format(addMonths(new Date(mesEstimado + "-01"), 2), "yyyy-MM");
        const mesAnterior = format(addMonths(new Date(mesEstimado + "-01"), -1), "yyyy-MM");

        const v = p.valorPonderado;

        if (mesEstimado === mesAgoraKey) {
          pipelinePorMes.set(mesEstimado, (pipelinePorMes.get(mesEstimado) || 0) + v * 0.25);
          pipelinePorMes.set(mesSeguinte, (pipelinePorMes.get(mesSeguinte) || 0) + v * 0.45);
          pipelinePorMes.set(mesSeguinte2, (pipelinePorMes.get(mesSeguinte2) || 0) + v * 0.3);
        } else {
          pipelinePorMes.set(mesAnterior, (pipelinePorMes.get(mesAnterior) || 0) + v * 0.3);
          pipelinePorMes.set(mesEstimado, (pipelinePorMes.get(mesEstimado) || 0) + v * 0.5);
          pipelinePorMes.set(mesSeguinte, (pipelinePorMes.get(mesSeguinte) || 0) + v * 0.2);
        }
      });

      // 8) Receita real/custo real por mês
      const receitaRealPorMes = new Map<string, number>();
      const custoRealPorMes = new Map<string, number>();

      fechamentos12m.forEach((f) => {
        receitaRealPorMes.set(f.mesKey, (receitaRealPorMes.get(f.mesKey) || 0) + f.valor);
        if (f.margemPct > 0) {
          const custo = f.valor * (1 - f.margemPct / 100);
          custoRealPorMes.set(f.mesKey, (custoRealPorMes.get(f.mesKey) || 0) + custo);
        }
      });

      // 9) Forecast mensal
      const forecastMensal: ForecastMensal[] = [];
      const baseline = receitaMediaMensal;
      const mesesDeDelay = Math.ceil(tempo / 30);

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
        const acaoNecessariaRS = convMarginal > 0 ? gap / convMarginal : 0;

        const ticketMarginal = Number(params.ticketMarginal || 0);
        const propostasEquiv = ticketMarginal > 0 ? Math.ceil(acaoNecessariaRS / ticketMarginal) : 0;

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

          acaoNecessariaRS: Math.round(acaoNecessariaRS),
          propostasEquiv,

          receitaReal: Math.round(receitaReal),
          custoReal: Math.round(custoReal),
          margemReal: margemReal !== null ? parseFloat(margemReal.toFixed(1)) : null,
        });
      }

      // 10) Histórico 12m
      const volumeHistorico: VolumeHistorico[] = [];
      for (let i = 11; i >= 0; i--) {
        const mesDate = subMonths(agora, i);
        const mesKey = format(mesDate, "yyyy-MM");
        const mesLabel = format(mesDate, "MMM/yy", { locale: ptBR });

        const envMesValor = propostas12m
          .filter((p) => p?.data && format(new Date(p.data), "yyyy-MM") === mesKey)
          .reduce((s, p) => s + Number(p.valor_total || 0), 0);

        const fechMesValor = fechamentos12m.filter((f) => f.mesKey === mesKey).reduce((s, f) => s + f.valor, 0);

        volumeHistorico.push({
          mes: mesLabel,
          valorEnviado: Math.round(envMesValor),
          valorFechado: Math.round(fechMesValor),
          conversaoFinanceira: envMesValor > 0 ? parseFloat(((fechMesValor / envMesValor) * 100).toFixed(1)) : 0,
        });
      }

      // 11) Insights
      const insights: Insight[] = [];
      const mesAtual = forecastMensal[0];

      if (baseStats.amostraPequena) {
        insights.push({
          text: `Dados limitados: apenas ${numContratos12m} contratos em 12 meses. Previsões podem ter margem de erro elevada.`,
          level: "muted",
        });
      }

      if (mesAtual) {
        insights.push({
          text: `Mantendo o ritmo atual, este mês fecha em R$ ${mesAtual.forecastTotal.toLocaleString("pt-BR")}`,
          level: mesAtual.meta > 0 && mesAtual.forecastTotal >= mesAtual.meta ? "success" : "muted",
        });
      }

      if (pipeline.valorPonderado > 0) {
        insights.push({
          text: `Pipeline ponderado atual: R$ ${pipeline.valorPonderado.toLocaleString("pt-BR", {
            maximumFractionDigits: 0,
          })} em ${pipeline.qtdPropostas} propostas.`,
          level: "muted",
        });
      }

      if (mesAtual && mesAtual.meta > 0) {
        if (mesAtual.forecastTotal >= mesAtual.meta) {
          insights.push({ text: "Você está no caminho para bater a meta deste mês", level: "success" });
        } else {
          insights.push({
            text: `Para bater a meta, é necessário gerar +R$ ${mesAtual.acaoNecessariaRS.toLocaleString(
              "pt-BR",
            )} em novas propostas (≈ ${mesAtual.propostasEquiv} propostas)`,
            level: "warning",
          });
        }
      }

      insights.push({
        text: `Tempo médio de fechamento (P50): ${tempo} dias. Propostas antigas sofrem decaimento no forecast.`,
        level: "muted",
      });

      return { baseStats, pipeline, forecastMensal, volumeHistorico, metasAtivas, insights };
    },
  });
}
