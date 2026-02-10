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
  /** Conversão marginal (%) que o usuário espera para novas propostas */
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

  baseline: number; // constante (valor_fechado_12m/12)
  pipelineAlloc: number; // variável por mês
  incrementalAlloc: number; // variável por mês (com delay)

  forecastTotal: number;
  meta: number;
  gap: number;
  acaoNecessariaRS: number;
  pctPipelineNoForecast: number;
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

// ─── Normalização (evita bugs de "Ativa" vs "ativa", "Vendas (R$)" etc) ───
const norm = (s?: string | null) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const META_TIPOS_RECEITA = new Set(["vendas", "vendas (r$)", "receita"]);
const META_STATUS_ATIVO = new Set(["ativa", "ativo", "active"]);

// ─── Probabilidades por estágio do lead ───────────────────────

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

// ─── Hook principal ───────────────────────────────────────────

export function useForecastPage(params: ForecastPageParams) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      "forecast-page-v2",
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

        // ✅ IMPORTANTE: não usar filtros case-sensitive aqui
        // (deixa o JS normalizar e filtrar)
        supabase
          .from("metas")
          .select("id, nome, tipo, valor_alvo, periodo_inicio, periodo_fim, status")
          .eq("user_id", user.id),

        supabase.from("leads").select("id, estagio").eq("user_id", user.id),
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

      // ✅ Filtra metas de receita + status ativo com normalização
      const metasAtivas = todasMetas.filter((m) => {
        const tipoOk = META_TIPOS_RECEITA.has(norm(m.tipo));
        const status = norm(m.status);
        const statusOk = status ? META_STATUS_ATIVO.has(status) : true; // se não tiver status na tabela, não bloqueia
        return tipoOk && statusOk;
      });

      // Lead map: lead_id -> estagio
      const leadMap = new Map<string, string | null>();
      leads.forEach((l: any) => leadMap.set(l.id, l.estagio ?? null));

      // ─── Build proposal map for contracts ──────────────────
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

        (pf || []).forEach((p: any) =>
          propostasMap.set(p.id, {
            data: p.data,
            data_fechamento: p.data_fechamento,
            valor_total: p.valor_total,
          }),
        );
      }

      // ─── Fechamentos 12m ───────────────────────────────────
      const fechamentos12m = contratos
        .map((c: any) => {
          const prop = propostasMap.get(c.proposta_id!);
          if (!prop) return null;

          const closeDateStr = prop.data_fechamento || c.created_at || c.data_inicio;
          const closeDate = new Date(closeDateStr);
          if (closeDate < dataLimite12m) return null;

          const valor = Number(c.valor_negociado || prop.valor_total || 0);
          const mesKey = format(closeDate, "yyyy-MM");

          const dataEnvio = prop.data ? new Date(prop.data) : closeDate;
          const diasFechamento = Math.max(differenceInDays(closeDate, dataEnvio), 0);

          return { valor, mesKey, diasFechamento };
        })
        .filter(Boolean) as { valor: number; mesKey: string; diasFechamento: number }[];

      // ─── Métricas financeiras base (12m) ───────────────────
      const valorEnviado12m = enviadas12m.reduce((s: number, p: any) => s + Number(p.valor_total || 0), 0);
      const valorFechado12m = fechamentos12m.reduce((s: number, f) => s + f.valor, 0);
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

      // ─── Pipeline atual ────────────────────────────────────
      const pipelineItems: PipelineItem[] = abertas.map((p: any) => {
        const estagio = p.lead_id ? (leadMap.get(p.lead_id) ?? null) : null;

        const estKey = estagio ? norm(estagio) : "";
        const probabilidade = estagio
          ? (PROBABILIDADE_ESTAGIO[estKey] ?? PROBABILIDADE_STATUS[p.status || "aberta"] ?? 0.35)
          : (PROBABILIDADE_STATUS[p.status || "aberta"] ?? 0.35);

        const valorTotal = Number(p.valor_total || 0);
        const dataEnvio = p.data ? new Date(p.data) : agora;
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
        if (!pipeline.porEstagio[key]) {
          pipeline.porEstagio[key] = { valor: 0, ponderado: 0, qtd: 0 };
        }
        pipeline.porEstagio[key].valor += p.valorTotal;
        pipeline.porEstagio[key].ponderado += p.valorPonderado;
        pipeline.porEstagio[key].qtd += 1;
      });

      // ─── Meta mensal (corrigida) ───────────────────────────
      function getMetaMensal(mesKey: string): number {
        let total = 0;

        const mesStart = startOfMonth(new Date(mesKey + "-01"));
        const mesEnd = endOfMonth(mesStart);

        for (const m of metasAtivas) {
          const inicio = new Date(m.periodo_inicio);
          const fim = new Date(m.periodo_fim);

          // overlap do mês com o período da meta
          const cobreMes = mesEnd >= inicio && mesStart <= fim;
          if (!cobreMes) continue;

          const meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth()) + 1;

          total += Number(m.valor_alvo) / Math.max(1, meses);
        }

        return total;
      }

      // ─── Distribuir pipeline por mês (com spread 30/50/20) ──
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

        const incrementalAlloc = i >= mesesDeDelay ? params.valorAdicionalMensal * params.conversaoMarginal : 0;

        const forecastTotal = baseline + pipelineAlloc + incrementalAlloc;
        const gap = Math.max(0, meta - forecastTotal);

        const acaoNecessariaRS = params.conversaoMarginal > 0 ? gap / params.conversaoMarginal : 0;

        const pctPipelineNoForecast = forecastTotal > 0 ? (pipelineAlloc / forecastTotal) * 100 : 0;

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
          pctPipelineNoForecast: parseFloat(pctPipelineNoForecast.toFixed(1)),
        });
      }

      // ─── Histórico 12m ─────────────────────────────────────
      const volumeHistorico: VolumeHistorico[] = [];
      for (let i = 11; i >= 0; i--) {
        const mesDate = subMonths(agora, i);
        const mesKey = format(mesDate, "yyyy-MM");
        const mesLabel = format(mesDate, "MMM/yy", { locale: ptBR });

        const envMesValor = enviadas12m
          .filter((p: any) => format(new Date(p.data), "yyyy-MM") === mesKey)
          .reduce((s: number, p: any) => s + Number(p.valor_total || 0), 0);

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
          text: `R$ ${pipeline.valorPonderado.toLocaleString("pt-BR", {
            maximumFractionDigits: 0,
          })} do seu forecast já está no pipeline atual (${pctPipeline}% da projeção)`,
          level: "success",
        });
      }

      if (mesAtual && mesAtual.meta > 0) {
        if (mesAtual.forecastTotal >= mesAtual.meta) {
          insights.push({
            text: "Você está no caminho para bater a meta deste mês",
            level: "success",
          });
        } else {
          const acaoRS = mesAtual.acaoNecessariaRS;
          const equiv = params.ticketMarginal > 0 ? Math.ceil(acaoRS / params.ticketMarginal) : 0;
          insights.push({
            text: `Para bater a meta, é necessário gerar +R$ ${acaoRS.toLocaleString(
              "pt-BR",
            )} em novas propostas (≈ ${equiv} propostas)`,
            level: "warning",
          });
        }
      }

      if (tempoMedioFechamentoDias > 0) {
        insights.push({
          text: `Tempo médio de fechamento: ${tempoMedioFechamentoDias} dias. Novas propostas só impactam o faturamento após esse período.`,
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
    enabled: !!user,
  });
}
