import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subMonths, addMonths, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────

export interface ForecastPageParams {
  horizonte: 3 | 6 | 12;
  /** R$ adicionais em propostas/mês que o usuário planeja gerar */
  valorAdicionalMensal: number;
  /** Conversão marginal (%) que o usuário espera para novas propostas (ex: 0.3 ou 30) */
  conversaoMarginal: number;
  /** Ticket médio esperado (R$) para novas propostas (usado para equivalência em "qtd propostas") */
  ticketMarginal: number;
}

export interface BaseStats {
  valorEnviado12m: number;
  valorFechado12m: number;
  conversaoFinanceira: number; // valorFechado/valorEnviado
  ticketReal: number; // valorFechado/numContratos
  receitaMediaMensal: number; // valorFechado/12
  numContratos12m: number;
  volumeEnviadoMensal: number; // valorEnviado/12
  tempoMedioFechamentoDias: number; // mediana (P50) dos dias
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

export interface MetaAtiva {
  id: string;
  nome: string | null;
  tipo: string;
  valor_alvo: number;
  periodo_inicio: string;
  periodo_fim: string;
  status?: string;
}

export interface MetaMensalDetalhe {
  id: string;
  nome: string | null;
  tipo: string;
  valorMensal: number;
}

export interface ForecastMensal {
  mes: string;
  mesKey: string;

  // séries mensais independentes (corrige "valor repetido"):
  baseline: number; // constante (receitaMediaMensal)
  pipelineAlloc: number; // variável (pipeline distribuído no mês)
  incrementalAlloc: number; // variável (a partir do delay)

  forecastTotal: number;

  // metas (soma por tipo)
  metaReceita: number; // 0 se não houver meta vigente
  metaPropostas: number; // 0 se não houver meta vigente
  hasMetaReceita: boolean;
  hasMetaPropostas: boolean;

  // detalhamento por meta (todas as metas ativas que cobrem o mês)
  metasDetalhadas: MetaMensalDetalhe[];

  // gap e ação (baseados em metaReceita)
  gapReceita: number; // 0 se não houver metaReceita
  acaoNecessariaRS: number; // R$ adicionais em propostas (volume) para cobrir o gap
  propostasEquiv: number; // gap / (ticketMarginal * convMarginal) (informativo)

  pctPipelineNoForecast: number;
}

export interface VolumeHistorico {
  mes: string;
  valorEnviado: number;
  valorFechado: number;
  conversaoFinanceira: number; // %
}

export type InsightLevel = "success" | "warning" | "destructive" | "muted";

export interface Insight {
  text: string;
  level: InsightLevel;
}

// ─────────────────────────────────────────────────────────────
// Probabilidades (fallback)
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function safeNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Aceita 0.3 ou 30 e retorna sempre 0..1 */
function normalizePct(v: number): number {
  const n = safeNumber(v);
  if (n <= 0) return 0;
  if (n > 1) return n / 100;
  return n;
}

function monthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

function normalizeKey(s: string | null | undefined): string {
  return (s || "").toString().trim().toLowerCase().replace(/\s+/g, "_").replace(/-+/g, "_");
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Classifica o tipo da meta de forma resiliente */
function classifyMetaType(tipoRaw: string): "receita" | "propostas" | "outros" {
  const t = (tipoRaw || "").toLowerCase();

  // receita / vendas / faturamento
  if (t.includes("receita") || t.includes("vendas") || t.includes("fatur") || t.includes("(r$)") || t.includes("r$")) {
    return "receita";
  }

  // propostas (quantidade)
  if (t.includes("proposta")) return "propostas";

  return "outros";
}

// ─────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────

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

      const convMarginal = normalizePct(params.conversaoMarginal);
      const ticketMarginal = safeNumber(params.ticketMarginal);
      const valorAdicionalMensal = safeNumber(params.valorAdicionalMensal);

      // ─── Fetch em paralelo ─────────────────────────────────
      const [contratosRes, enviadasRes, abertasRes, metasRes, leadsRes] = await Promise.all([
        supabase
          .from("contratos")
          .select("proposta_id, created_at, data_inicio, valor_negociado")
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
          .select("id, data, valor_total, liquido, status, lead_id")
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
      const enviadas12m = (enviadasRes.data || []) as any[];
      const abertas = (abertasRes.data || []) as any[];
      const metasAtivas = (metasRes.data || []) as MetaAtiva[];
      const leads = (leadsRes.data || []) as any[];

      // ─── Map lead_id -> estagio ────────────────────────────
      const leadMap = new Map<string, string>();
      for (const l of leads) leadMap.set(l.id, l.estagio);

      // ─── Build proposalsMap para contratos ─────────────────
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

        for (const p of pf || []) {
          propostasMap.set(p.id, {
            data: p.data,
            data_fechamento: p.data_fechamento,
            valor_total: p.valor_total,
          });
        }
      }

      // ─── Fechamentos 12m (fonte da verdade = contratos) ─────
      const fechamentos12m = contratos
        .map((c: any) => {
          const prop = propostasMap.get(c.proposta_id);
          if (!prop) return null;

          const closeDateStr = prop.data_fechamento || c.created_at || c.data_inicio;
          if (!closeDateStr) return null;

          const closeDate = new Date(closeDateStr);
          if (Number.isNaN(closeDate.getTime())) return null;
          if (closeDate < dataLimite12m) return null;

          const valor = safeNumber(c.valor_negociado || prop.valor_total || 0);
          const mesKey = format(closeDate, "yyyy-MM");

          const dataEnvio = new Date(prop.data);
          const diasFechamento = Math.max(differenceInDays(closeDate, dataEnvio), 0);

          return { valor, mesKey, diasFechamento };
        })
        .filter(Boolean) as { valor: number; mesKey: string; diasFechamento: number }[];

      // ─── Métricas base (12m) ───────────────────────────────
      const valorEnviado12m = enviadas12m.reduce((s, p) => s + safeNumber(p.valor_total), 0);
      const valorFechado12m = fechamentos12m.reduce((s, f) => s + f.valor, 0);
      const numContratos12m = fechamentos12m.length;

      const conversaoFinanceira = valorEnviado12m > 0 ? valorFechado12m / valorEnviado12m : 0;

      const ticketReal = numContratos12m > 0 ? valorFechado12m / numContratos12m : 0;

      const receitaMediaMensal = valorFechado12m / 12;
      const volumeEnviadoMensal = valorEnviado12m / 12;

      // tempo de fechamento: usar mediana (P50) para robustez
      const diasSorted = fechamentos12m.map((f) => f.diasFechamento).sort((a, b) => a - b);

      const p50 = percentile(diasSorted, 50);
      const tempoMedioFechamentoDias = clamp(Math.round(p50 || 45), 7, 210);

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

      // ─── Pipeline atual (propostas abertas) ─────────────────
      const pipelineItems: PipelineItem[] = abertas.map((p: any) => {
        const estagioRaw = p.lead_id ? leadMap.get(p.lead_id) : null;
        const estagioKey = normalizeKey(estagioRaw);

        const statusKey = normalizeKey(p.status || "aberta");
        const probabilidade = estagioKey
          ? (PROBABILIDADE_ESTAGIO[estagioKey] ?? PROBABILIDADE_STATUS[statusKey] ?? 0.35)
          : (PROBABILIDADE_STATUS[statusKey] ?? 0.35);

        // usar liquido quando existir (mais realista)
        const valorTotal = safeNumber(p.liquido ?? p.valor_total ?? 0);

        // dias aberta: quanto tempo desde "data" (envio)
        const diasAberta = Math.max(differenceInDays(agora, new Date(p.data)), 0);

        return {
          id: p.id,
          valorTotal,
          status: statusKey || "aberta",
          estagio: estagioKey || null,
          probabilidade,
          valorPonderado: valorTotal * probabilidade,
          diasAberta,
        };
      });

      const pipeline: PipelineResumo = {
        valorBruto: pipelineItems.reduce((s, x) => s + x.valorTotal, 0),
        valorPonderado: pipelineItems.reduce((s, x) => s + x.valorPonderado, 0),
        qtdPropostas: pipelineItems.length,
        porEstagio: {},
      };

      for (const p of pipelineItems) {
        const k = p.estagio || "sem_lead";
        if (!pipeline.porEstagio[k]) pipeline.porEstagio[k] = { valor: 0, ponderado: 0, qtd: 0 };
        pipeline.porEstagio[k].valor += p.valorTotal;
        pipeline.porEstagio[k].ponderado += p.valorPonderado;
        pipeline.porEstagio[k].qtd += 1;
      }

      // ─── Metas: calcula meta mensal por mês, por tipo e por meta ──
      function metasDoMes(mesKeyStr: string): {
        metaReceita: number;
        metaPropostas: number;
        hasMetaReceita: boolean;
        hasMetaPropostas: boolean;
        metasDetalhadas: MetaMensalDetalhe[];
      } {
        const mesDate = new Date(`${mesKeyStr}-01T00:00:00`);
        let receita = 0;
        let propostas = 0;
        const detalhes: MetaMensalDetalhe[] = [];

        for (const m of metasAtivas) {
          const inicio = new Date(m.periodo_inicio);
          const fim = new Date(m.periodo_fim);
          if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) continue;

          if (mesDate < inicio || mesDate > fim) continue;

          const meses =
            Math.max(1, (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth()) + 1) ||
            1;

          const mensal = safeNumber(m.valor_alvo) / meses;
          detalhes.push({
            id: m.id,
            nome: m.nome || null,
            tipo: m.tipo,
            valorMensal: mensal,
          });

          const cat = classifyMetaType(m.tipo);
          if (cat === "receita") receita += mensal;
          if (cat === "propostas") propostas += mensal;
        }

        return {
          metaReceita: receita,
          metaPropostas: propostas,
          hasMetaReceita: receita > 0,
          hasMetaPropostas: propostas > 0,
          metasDetalhadas: detalhes,
        };
      }

      // ─── Distribuir pipeline em 3 meses (30/50/20) ──────────
      const pipelinePorMes = new Map<string, number>();

      function addPipeline(mKey: string, v: number) {
        pipelinePorMes.set(mKey, (pipelinePorMes.get(mKey) || 0) + v);
      }

      for (const p of pipelineItems) {
        // quanto falta para "fechar"
        const diasRestantes = Math.max(0, tempoMedioFechamentoDias - p.diasAberta);
        const dataEstimada = addDays(agora, diasRestantes);

        const mPrev = monthKey(addMonths(dataEstimada, -1));
        const mCur = monthKey(dataEstimada);
        const mNext = monthKey(addMonths(dataEstimada, 1));

        addPipeline(mPrev, p.valorPonderado * 0.3);
        addPipeline(mCur, p.valorPonderado * 0.5);
        addPipeline(mNext, p.valorPonderado * 0.2);
      }

      // ─── Incremental: começa após delay (em meses) ───────────
      const mesesDeDelay = Math.ceil(tempoMedioFechamentoDias / 30);
      const incrementalMensal = valorAdicionalMensal * convMarginal; // R$ que deve fechar/mês

      // ─── Build forecast mensal (3/6/12) ─────────────────────
      const forecastMensal: ForecastMensal[] = [];

      for (let i = 0; i < params.horizonte; i++) {
        const mesDate = addMonths(agora, i);
        const mesKeyStr = format(mesDate, "yyyy-MM");
        const mesLabel = format(mesDate, "MMM/yy", { locale: ptBR });

        const baseline = receitaMediaMensal;
        const pipelineAlloc = pipelinePorMes.get(mesKeyStr) || 0;
        const incrementalAlloc = i >= mesesDeDelay ? incrementalMensal : 0;

        const forecastTotal = baseline + pipelineAlloc + incrementalAlloc;

        const metasInfo = metasDoMes(mesKeyStr);

        // gap e ação (somente receita; se não houver meta, fica 0)
        const metaReceita = metasInfo.metaReceita;
        const gapReceita = metasInfo.hasMetaReceita ? Math.max(0, metaReceita - forecastTotal) : 0;

        // acaoNecessariaRS: quanto precisa gerar a mais de volume em propostas
        // preferir convMarginal (simulador) se existir; senão usar conversaoFinanceira histórica
        const convParaAcao = convMarginal > 0 ? convMarginal : conversaoFinanceira;
        const acaoNecessariaRS = convParaAcao > 0 ? gapReceita / convParaAcao : 0;

        // propostasEquiv (informativo)
        const propostasEquiv =
          ticketMarginal > 0 && convParaAcao > 0 ? gapReceita / (ticketMarginal * convParaAcao) : 0;

        const pctPipelineNoForecast = forecastTotal > 0 ? (pipelineAlloc / forecastTotal) * 100 : 0;

        forecastMensal.push({
          mes: mesLabel,
          mesKey: mesKeyStr,

          baseline: Math.round(baseline),
          pipelineAlloc: Math.round(pipelineAlloc),
          incrementalAlloc: Math.round(incrementalAlloc),

          forecastTotal: Math.round(forecastTotal),

          metaReceita: Math.round(metaReceita),
          metaPropostas: Math.round(metasInfo.metaPropostas),
          hasMetaReceita: metasInfo.hasMetaReceita,
          hasMetaPropostas: metasInfo.hasMetaPropostas,
          metasDetalhadas: metasInfo.metasDetalhadas.map((d) => ({
            ...d,
            valorMensal: Math.round(d.valorMensal),
          })),

          gapReceita: Math.round(gapReceita),
          acaoNecessariaRS: Math.round(acaoNecessariaRS),
          propostasEquiv: Math.ceil(propostasEquiv),

          pctPipelineNoForecast: parseFloat(pctPipelineNoForecast.toFixed(1)),
        });
      }

      // ─── Histórico 12m (R$ enviado x fechado e conversão %) ─
      const volumeHistorico: VolumeHistorico[] = [];
      for (let i = 11; i >= 0; i--) {
        const mesDate = subMonths(agora, i);
        const mKey = format(mesDate, "yyyy-MM");
        const mLabel = format(mesDate, "MMM/yy", { locale: ptBR });

        const enviado = enviadas12m
          .filter((p) => format(new Date(p.data), "yyyy-MM") === mKey)
          .reduce((s, p) => s + safeNumber(p.valor_total), 0);

        const fechado = fechamentos12m.filter((f) => f.mesKey === mKey).reduce((s, f) => s + f.valor, 0);

        volumeHistorico.push({
          mes: mLabel,
          valorEnviado: Math.round(enviado),
          valorFechado: Math.round(fechado),
          conversaoFinanceira: enviado > 0 ? parseFloat(((fechado / enviado) * 100).toFixed(1)) : 0,
        });
      }

      // ─── Insights ───────────────────────────────────────────
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
          level: mesAtual.hasMetaReceita && mesAtual.forecastTotal >= mesAtual.metaReceita ? "success" : "muted",
        });

        if (pipeline.valorPonderado > 0) {
          const pct =
            mesAtual.forecastTotal > 0 ? ((pipeline.valorPonderado / mesAtual.forecastTotal) * 100).toFixed(0) : "0";
          insights.push({
            text: `R$ ${pipeline.valorPonderado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} do seu forecast vem do pipeline atual (${pct}% da projeção do mês foco).`,
            level: "success",
          });
        }

        if (mesAtual.hasMetaReceita) {
          if (mesAtual.forecastTotal >= mesAtual.metaReceita) {
            insights.push({
              text: "Você está no caminho para bater a meta de faturamento do mês selecionado.",
              level: "success",
            });
          } else {
            insights.push({
              text: `Para bater a meta, é necessário gerar +R$ ${mesAtual.acaoNecessariaRS.toLocaleString("pt-BR")} em novas propostas (≈ ${mesAtual.propostasEquiv} propostas).`,
              level: "warning",
            });
          }
        }
      }

      if (tempoMedioFechamentoDias > 0) {
        insights.push({
          text: `Tempo mediano de fechamento: ${tempoMedioFechamentoDias} dias. Esforço adicional só impacta após esse período.`,
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
