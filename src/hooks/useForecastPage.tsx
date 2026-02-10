import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ForecastPageParams {
  horizonte: 3 | 6 | 12;
  volumeAjuste: number;
  conversaoAjuste: number;
  ticketAjuste: number;
}

export interface BaseStats {
  valorEnviado12m: number;
  valorFechado12m: number;
  conversaoFinanceira: number;
  ticketReal: number;
  receitaMediaMensal: number;
  numContratos12m: number;
  volumeEnviadoMensal: number; // media mensal em R$ de propostas enviadas
  amostraPequena: boolean;
}

export interface CenarioEfetivo {
  receitaBase: number;       // receita_media_mensal
  volumeMensal: number;      // volume enviado mensal ajustado (R$)
  conversao: number;         // conversão financeira ajustada
  ticket: number;            // ticket médio ajustado
}

export interface ForecastMensal {
  mes: string;
  mesKey: string;
  forecast: number;
  meta: number;
  gap: number;
  acaoNecessariaRS: number;       // gap em R$ de propostas adicionais
  propostasEquivalentes: number;  // info secundária: gap / (ticket * conversao)
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

      // Fetch all data in parallel
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

      const metasAtivas = todasMetas.filter((m) =>
        ["vendas", "vendas (r$)", "receita"].some(
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
          const valor = Number(c.valor_negociado || prop.valor_total || 0);
          const mesKey = format(closeDate, "yyyy-MM");
          return { valor, mesKey };
        })
        .filter(Boolean) as { valor: number; mesKey: string }[];

      // === Financial metrics (all in R$) ===
      const valorEnviado12m = enviadas12m.reduce((s, p) => s + Number(p.valor_total || 0), 0);
      const valorFechado12m = fechamentos12m.reduce((s, f) => s + f.valor, 0);
      const numContratos12m = fechamentos12m.length;
      const conversaoFinanceira = valorEnviado12m > 0 ? valorFechado12m / valorEnviado12m : 0;
      const ticketReal = numContratos12m > 0 ? valorFechado12m / numContratos12m : 0;
      const receitaMediaMensal = valorFechado12m / 12;
      const volumeEnviadoMensal = valorEnviado12m / 12;

      const baseStats: BaseStats = {
        valorEnviado12m,
        valorFechado12m,
        conversaoFinanceira,
        ticketReal,
        receitaMediaMensal,
        numContratos12m,
        volumeEnviadoMensal,
        amostraPequena: numContratos12m < 10,
      };

      // Effective scenario
      const cenario: CenarioEfetivo = {
        receitaBase: receitaMediaMensal,
        volumeMensal: volumeEnviadoMensal * params.volumeAjuste,
        conversao: conversaoFinanceira * params.conversaoAjuste,
        ticket: ticketReal * params.ticketAjuste,
      };

      // Forecast formula: receita_media_mensal * fator_volume * fator_conversao * fator_ticket
      const forecastValue = receitaMediaMensal * params.volumeAjuste * params.conversaoAjuste * params.ticketAjuste;

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
        const meta = getMetaMensal(mesKey);
        const gap = Math.max(0, meta - forecastValue);
        // Ação necessária em R$: quanto precisa enviar a mais em propostas
        // gap = acaoRS * conversaoFinanceira => acaoRS = gap / conversaoFinanceira
        const acaoNecessariaRS = cenario.conversao > 0 ? gap / cenario.conversao : 0;
        const propostasEquivalentes =
          cenario.ticket > 0 && cenario.conversao > 0
            ? Math.ceil(gap / (cenario.ticket * cenario.conversao))
            : 0;
        forecastMensal.push({
          mes: mesLabel,
          mesKey,
          forecast: Math.round(forecastValue),
          meta: Math.round(meta),
          gap: Math.round(gap),
          acaoNecessariaRS: Math.round(acaoNecessariaRS),
          propostasEquivalentes,
        });
      }

      // Volume histórico mensal (financial)
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

      // Insights engine (deterministic, R$-based)
      const insights: Insight[] = [];
      const mesAtual = forecastMensal[0];

      if (baseStats.amostraPequena) {
        insights.push({
          text: `Dados insuficientes para previsão confiável (apenas ${numContratos12m} contratos em 12 meses)`,
          level: "muted",
        });
      }

      if (mesAtual && mesAtual.meta > 0) {
        if (mesAtual.forecast >= mesAtual.meta) {
          insights.push({ text: "Você está no caminho para bater a meta deste mês", level: "success" });
        } else {
          const acaoRS = mesAtual.acaoNecessariaRS;
          const equiv = mesAtual.propostasEquivalentes;
          insights.push({
            text: `Para bater a meta, precisa gerar +R$ ${acaoRS.toLocaleString("pt-BR")} em propostas (≈ ${equiv} propostas)`,
            level: "warning",
          });
        }
      }

      // Compare forecast vs 12m average
      if (receitaMediaMensal > 0 && mesAtual) {
        const delta = ((mesAtual.forecast - receitaMediaMensal) / receitaMediaMensal) * 100;
        if (Math.abs(delta) > 5) {
          insights.push({
            text: `Forecast está ${delta > 0 ? "+" : ""}${delta.toFixed(0)}% ${delta > 0 ? "acima" : "abaixo"} da média dos últimos 12 meses`,
            level: delta > 0 ? "success" : "warning",
          });
        }
      }

      // Bottleneck detection: which factor is dragging the most
      const volFactor = params.volumeAjuste;
      const convFactor = params.conversaoAjuste;
      const tickFactor = params.ticketAjuste;
      const minFactor = Math.min(volFactor, convFactor, tickFactor);
      if (minFactor < 0.8) {
        if (minFactor === volFactor) {
          insights.push({ text: "Seu principal gargalo hoje é o volume de propostas enviadas", level: "destructive" });
        } else if (minFactor === convFactor) {
          insights.push({ text: "Seu principal gargalo hoje é a conversão financeira", level: "destructive" });
        } else {
          insights.push({ text: "Seu principal gargalo hoje é o ticket médio", level: "destructive" });
        }
      }

      if (mesAtual && mesAtual.forecast > 0) {
        insights.push({
          text: `Mantendo o cenário atual, o mês fecha em R$ ${mesAtual.forecast.toLocaleString("pt-BR")}`,
          level: "muted",
        });
      }

      return { baseStats, cenario, forecastMensal, volumeHistorico, metasAtivas, insights };
    },
    enabled: !!user,
  });
}
