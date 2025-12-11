import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";

export interface ChannelFilters {
  period: "today" | "7d" | "week" | "month" | "30d" | "year" | "custom";
  startDate?: Date;
  endDate?: Date;
  canais?: string[];
  bairros?: string[];
}

export interface ChannelMetrics {
  canal: string;
  leads: number;
  propostas: number;
  fechados: number;
  valor_propostas: number;
  valor_fechados: number;
  valor_margem_fechados: number;
  ticket_medio: number;
  taxa_lead_proposta: number;
  taxa_proposta_fechado: number;
}

export interface HeatmapData {
  dia: number; // 0-6 (seg-dom)
  hora: number; // 0-23
  leads: number;
  fechados: number;
  valor: number;
}

export interface ChannelDayData {
  dia: string;
  [canal: string]: number | string;
}

export interface BairroChannelData {
  bairro: string;
  canal: string;
  leads: number;
  propostas: number;
  fechados: number;
  valor_propostas: number;
  valor_fechados: number;
}

export interface ChannelFunnelData {
  canal: string;
  leads: number;
  propostas: number;
  fechados: number;
}

export interface OverviewKPIs {
  total_leads: number;
  total_propostas: number;
  total_fechados: number;
  valor_propostas: number;
  valor_fechados: number;
  canal_top: string;
  canal_top_leads: number;
  canal_top_fechados: number;
  canal_top_valor: number;
}

function getDateRange(filters: ChannelFilters): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (filters.period) {
    case "today":
      start = startOfDay(now);
      end = endOfDay(now);
      break;
    case "7d":
      start = startOfDay(subDays(now, 7));
      end = endOfDay(now);
      break;
    case "week":
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case "month":
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case "30d":
      start = startOfDay(subDays(now, 30));
      end = endOfDay(now);
      break;
    case "year":
      start = startOfYear(now);
      end = endOfYear(now);
      break;
    case "custom":
      start = filters.startDate || startOfDay(subDays(now, 30));
      end = filters.endDate || endOfDay(now);
      break;
    default:
      start = startOfDay(subDays(now, 30));
      end = endOfDay(now);
  }

  return { start, end };
}

export function useChannelAnalytics(filters: ChannelFilters) {
  const { user } = useAuth();

  // Busca dados brutos de leads com cliente (para bairro)
  const { data: rawData, isLoading: loadingRaw } = useQuery({
    queryKey: ["channel-analytics", "raw", filters, user?.id],
    queryFn: async () => {
      if (!user) return { leads: [], propostas: [], contratos: [] };

      // Calcular datas DENTRO do queryFn para evitar problemas de closure
      const { start, end } = getDateRange(filters);
      const startISO = start.toISOString();
      const endISO = end.toISOString();

      console.log("[ChannelAnalytics] Período:", filters.period, "De:", startISO, "Até:", endISO);

      // Buscar leads com cliente
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select(`
          id,
          created_at,
          origem,
          estagio,
          valor_potencial,
          cliente_id,
          clientes(bairro, cidade)
        `)
        .eq("user_id", user.id)
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      if (leadsError) throw leadsError;

      // Buscar propostas
      const { data: propostas, error: propostasError } = await supabase
        .from("propostas")
        .select(`
          id,
          created_at,
          status,
          valor_total,
          liquido,
          margem_pct,
          lead_id,
          cliente_id,
          clientes(bairro, cidade)
        `)
        .eq("user_id", user.id)
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      if (propostasError) throw propostasError;

      // Buscar contratos (fechados) - filtrar por data_inicio (data do contrato)
      const startDate = start.toISOString().split('T')[0]; // YYYY-MM-DD
      const endDate = end.toISOString().split('T')[0];
      
      const { data: contratos, error: contratosError } = await supabase
        .from("contratos")
        .select(`
          id,
          created_at,
          data_inicio,
          valor_negociado,
          margem_pct,
          proposta_id,
          cliente_id,
          clientes(bairro, cidade)
        `)
        .eq("user_id", user.id)
        .gte("data_inicio", startDate)
        .lte("data_inicio", endDate);

      if (contratosError) throw contratosError;

      console.log("[ChannelAnalytics] Dados:", {
        leads: leads?.length || 0,
        propostas: propostas?.length || 0,
        contratos: contratos?.length || 0
      });

      return { leads: leads || [], propostas: propostas || [], contratos: contratos || [] };
    },
    enabled: !!user,
  });

  // Métricas por Canal
  const { data: channelMetrics, isLoading: loadingChannelMetrics } = useQuery({
    queryKey: ["channel-analytics", "metrics", rawData, filters.canais],
    queryFn: async () => {
      if (!rawData) return [];

      const { leads, propostas, contratos } = rawData;
      
      // Mapear lead_id para origem
      const leadOrigemMap = new Map<string, string>();
      leads.forEach((lead: any) => {
        leadOrigemMap.set(lead.id, lead.origem || "Não informado");
      });

      // Agrupar por canal
      const channelData = new Map<string, ChannelMetrics>();

      // Processar leads
      leads.forEach((lead: any) => {
        const canal = lead.origem || "Não informado";
        if (filters.canais?.length && !filters.canais.includes(canal)) return;

        if (!channelData.has(canal)) {
          channelData.set(canal, {
            canal,
            leads: 0,
            propostas: 0,
            fechados: 0,
            valor_propostas: 0,
            valor_fechados: 0,
            valor_margem_fechados: 0,
            ticket_medio: 0,
            taxa_lead_proposta: 0,
            taxa_proposta_fechado: 0,
          });
        }
        channelData.get(canal)!.leads++;
      });

      // Processar propostas - APENAS as que têm lead_id (propostas vinculadas a leads)
      propostas.forEach((proposta: any) => {
        // Ignorar propostas sem lead_id para análise de canal
        if (!proposta.lead_id) return;
        
        const canal = leadOrigemMap.get(proposta.lead_id) || "Não informado";
        if (filters.canais?.length && !filters.canais.includes(canal)) return;

        if (!channelData.has(canal)) {
          channelData.set(canal, {
            canal,
            leads: 0,
            propostas: 0,
            fechados: 0,
            valor_propostas: 0,
            valor_fechados: 0,
            valor_margem_fechados: 0,
            ticket_medio: 0,
            taxa_lead_proposta: 0,
            taxa_proposta_fechado: 0,
          });
        }
        const data = channelData.get(canal)!;
        data.propostas++;
        data.valor_propostas += parseFloat(String(proposta.valor_total || 0));
      });

      // Mapear proposta_id -> lead_id (apenas propostas com lead)
      const propostaLeadMap = new Map<string, string>();
      propostas.forEach((p: any) => {
        if (p.lead_id) propostaLeadMap.set(p.id, p.lead_id);
      });

      // Processar contratos (fechados) - APENAS os que podem ser rastreados até um lead
      contratos.forEach((contrato: any) => {
        // Ignorar contratos que não podem ser rastreados até um lead
        if (!contrato.proposta_id) return;
        
        const leadId = propostaLeadMap.get(contrato.proposta_id);
        if (!leadId) return; // Proposta sem lead_id, ignorar
        
        const canal = leadOrigemMap.get(leadId) || "Não informado";
        if (filters.canais?.length && !filters.canais.includes(canal)) return;

        if (!channelData.has(canal)) {
          channelData.set(canal, {
            canal,
            leads: 0,
            propostas: 0,
            fechados: 0,
            valor_propostas: 0,
            valor_fechados: 0,
            valor_margem_fechados: 0,
            ticket_medio: 0,
            taxa_lead_proposta: 0,
            taxa_proposta_fechado: 0,
          });
        }
        const data = channelData.get(canal)!;
        data.fechados++;
        const valorFechado = parseFloat(String(contrato.valor_negociado || 0));
        data.valor_fechados += valorFechado;
        const margemPct = parseFloat(String(contrato.margem_pct || 0));
        data.valor_margem_fechados += valorFechado * (margemPct / 100);
      });

      // Calcular taxas
      channelData.forEach((data) => {
        data.ticket_medio = data.fechados > 0 ? data.valor_fechados / data.fechados : 0;
        data.taxa_lead_proposta = data.leads > 0 ? (data.propostas / data.leads) * 100 : 0;
        data.taxa_proposta_fechado = data.propostas > 0 ? (data.fechados / data.propostas) * 100 : 0;
      });

      return Array.from(channelData.values()).sort((a, b) => b.valor_fechados - a.valor_fechados);
    },
    enabled: !!rawData,
  });

  // Heatmap Dia x Hora
  const { data: heatmapData, isLoading: loadingHeatmap } = useQuery({
    queryKey: ["channel-analytics", "heatmap", rawData, filters.canais],
    queryFn: async () => {
      if (!rawData) return [];

      const { leads, contratos } = rawData;
      
      // Criar mapa para lead_id -> origem
      const leadOrigemMap = new Map<string, string>();
      leads.forEach((lead: any) => {
        leadOrigemMap.set(lead.id, lead.origem || "Não informado");
      });

      // Inicializar matriz 7x24
      const heatmap: HeatmapData[] = [];
      for (let dia = 0; dia < 7; dia++) {
        for (let hora = 0; hora < 24; hora++) {
          heatmap.push({ dia, hora, leads: 0, fechados: 0, valor: 0 });
        }
      }

      // Preencher leads
      leads.forEach((lead: any) => {
        const canal = lead.origem || "Não informado";
        if (filters.canais?.length && !filters.canais.includes(canal)) return;

        const date = new Date(lead.created_at);
        const dia = (date.getDay() + 6) % 7; // 0 = Segunda
        const hora = date.getHours();
        const idx = dia * 24 + hora;
        heatmap[idx].leads++;
        heatmap[idx].valor += parseFloat(String(lead.valor_potencial || 0));
      });

      // Preencher fechados - apenas contratos rastreáveis até um lead
      const propostaLeadMap = new Map<string, string>();
      rawData.propostas.forEach((p: any) => {
        if (p.lead_id) propostaLeadMap.set(p.id, p.lead_id);
      });

      contratos.forEach((contrato: any) => {
        // Ignorar contratos que não podem ser rastreados até um lead
        if (!contrato.proposta_id) return;
        
        const leadId = propostaLeadMap.get(contrato.proposta_id);
        if (!leadId) return;
        
        const canal = leadOrigemMap.get(leadId) || "Não informado";
        if (filters.canais?.length && !filters.canais.includes(canal)) return;

        const date = new Date(contrato.data_inicio);
        const dia = (date.getDay() + 6) % 7;
        const hora = date.getHours();
        const idx = dia * 24 + hora;
        heatmap[idx].fechados++;
      });

      return heatmap;
    },
    enabled: !!rawData,
  });

  // Canal x Dia da Semana
  const { data: channelDayData, isLoading: loadingChannelDay } = useQuery({
    queryKey: ["channel-analytics", "channel-day", rawData, filters.canais],
    queryFn: async () => {
      if (!rawData) return [];

      const { leads } = rawData;
      const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
      
      // Inicializar dados
      const data: Record<string, Record<string, number>> = {};
      diasSemana.forEach((dia) => {
        data[dia] = {};
      });

      // Contar leads por dia e canal
      leads.forEach((lead: any) => {
        const canal = lead.origem || "Não informado";
        if (filters.canais?.length && !filters.canais.includes(canal)) return;

        const date = new Date(lead.created_at);
        const diaIdx = (date.getDay() + 6) % 7;
        const dia = diasSemana[diaIdx];
        
        if (!data[dia][canal]) data[dia][canal] = 0;
        data[dia][canal]++;
      });

      // Converter para array
      return diasSemana.map((dia) => ({
        dia,
        ...data[dia],
      }));
    },
    enabled: !!rawData,
  });

  // Canal x Bairro
  const { data: bairroChannelData, isLoading: loadingBairroChannel } = useQuery({
    queryKey: ["channel-analytics", "bairro-channel", rawData, filters.canais, filters.bairros],
    queryFn: async () => {
      if (!rawData) return [];

      const { leads, propostas, contratos } = rawData;
      
      // Mapear lead_id para origem
      const leadOrigemMap = new Map<string, string>();
      const leadBairroMap = new Map<string, string>();
      leads.forEach((lead: any) => {
        leadOrigemMap.set(lead.id, lead.origem || "Não informado");
        leadBairroMap.set(lead.id, (lead.clientes as any)?.bairro || "Não informado");
      });

      // Agrupar por bairro x canal
      const dataMap = new Map<string, BairroChannelData>();

      // Processar leads
      leads.forEach((lead: any) => {
        const canal = lead.origem || "Não informado";
        const bairro = (lead.clientes as any)?.bairro || "Não informado";
        
        if (filters.canais?.length && !filters.canais.includes(canal)) return;
        if (filters.bairros?.length && !filters.bairros.includes(bairro)) return;

        const key = `${bairro}|${canal}`;
        if (!dataMap.has(key)) {
          dataMap.set(key, {
            bairro,
            canal,
            leads: 0,
            propostas: 0,
            fechados: 0,
            valor_propostas: 0,
            valor_fechados: 0,
          });
        }
        dataMap.get(key)!.leads++;
      });

      // Processar propostas - APENAS as que têm lead_id
      propostas.forEach((proposta: any) => {
        // Ignorar propostas sem lead_id para análise de canal
        if (!proposta.lead_id) return;
        
        const canal = leadOrigemMap.get(proposta.lead_id) || "Não informado";
        const bairro = (proposta.clientes as any)?.bairro || "Não informado";
        
        if (filters.canais?.length && !filters.canais.includes(canal)) return;
        if (filters.bairros?.length && !filters.bairros.includes(bairro)) return;

        const key = `${bairro}|${canal}`;
        if (!dataMap.has(key)) {
          dataMap.set(key, {
            bairro,
            canal,
            leads: 0,
            propostas: 0,
            fechados: 0,
            valor_propostas: 0,
            valor_fechados: 0,
          });
        }
        const data = dataMap.get(key)!;
        data.propostas++;
        data.valor_propostas += parseFloat(String(proposta.valor_total || 0));
      });

      // Processar contratos
      const propostaLeadMap = new Map<string, string>();
      propostas.forEach((p: any) => {
        if (p.lead_id) propostaLeadMap.set(p.id, p.lead_id);
      });

      // Processar contratos - APENAS os rastreáveis até um lead
      contratos.forEach((contrato: any) => {
        // Ignorar contratos que não podem ser rastreados até um lead
        if (!contrato.proposta_id) return;
        
        const leadId = propostaLeadMap.get(contrato.proposta_id);
        if (!leadId) return;
        
        const canal = leadOrigemMap.get(leadId) || "Não informado";
        const bairro = (contrato.clientes as any)?.bairro || "Não informado";
        
        if (filters.canais?.length && !filters.canais.includes(canal)) return;
        if (filters.bairros?.length && !filters.bairros.includes(bairro)) return;

        const key = `${bairro}|${canal}`;
        if (!dataMap.has(key)) {
          dataMap.set(key, {
            bairro,
            canal,
            leads: 0,
            propostas: 0,
            fechados: 0,
            valor_propostas: 0,
            valor_fechados: 0,
          });
        }
        const data = dataMap.get(key)!;
        data.fechados++;
        data.valor_fechados += parseFloat(String(contrato.valor_negociado || 0));
      });

      return Array.from(dataMap.values()).sort((a, b) => b.valor_fechados - a.valor_fechados);
    },
    enabled: !!rawData,
  });

  // KPIs Gerais - usa rawData para totais REAIS do período
  const { data: overviewKPIs, isLoading: loadingOverview } = useQuery({
    queryKey: ["channel-analytics", "overview", rawData, channelMetrics],
    queryFn: async (): Promise<OverviewKPIs> => {
      if (!rawData) {
        return {
          total_leads: 0,
          total_propostas: 0,
          total_fechados: 0,
          valor_propostas: 0,
          valor_fechados: 0,
          canal_top: "-",
          canal_top_leads: 0,
          canal_top_fechados: 0,
          canal_top_valor: 0,
        };
      }

      const { leads, propostas, contratos } = rawData;

      // TOTAIS REAIS do período (sem filtro de lead_id)
      const total_leads = leads.length;
      const total_propostas = propostas.length;
      const total_fechados = contratos.length;
      const valor_propostas = propostas.reduce((sum: number, p: any) => 
        sum + parseFloat(String(p.valor_total || 0)), 0);
      const valor_fechados = contratos.reduce((sum: number, c: any) => 
        sum + parseFloat(String(c.valor_negociado || 0)), 0);

      // Canal top por valor fechado (usa channelMetrics que é filtrado por canal)
      const canalTop = channelMetrics?.[0];

      return {
        total_leads,
        total_propostas,
        total_fechados,
        valor_propostas,
        valor_fechados,
        canal_top: canalTop?.canal || "-",
        canal_top_leads: canalTop?.leads || 0,
        canal_top_fechados: canalTop?.fechados || 0,
        canal_top_valor: canalTop?.valor_fechados || 0,
      };
    },
    enabled: !!rawData,
  });

  // Funil por Canal
  const { data: funnelData, isLoading: loadingFunnel } = useQuery({
    queryKey: ["channel-analytics", "funnel", channelMetrics],
    queryFn: async (): Promise<ChannelFunnelData[]> => {
      if (!channelMetrics) return [];
      return channelMetrics.map((ch) => ({
        canal: ch.canal,
        leads: ch.leads,
        propostas: ch.propostas,
        fechados: ch.fechados,
      }));
    },
    enabled: !!channelMetrics,
  });

  // Lista de canais únicos
  const { data: availableCanais } = useQuery({
    queryKey: ["channel-analytics", "canais-list", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: leads } = await supabase
        .from("leads")
        .select("origem")
        .eq("user_id", user.id)
        .not("origem", "is", null);

      const canais = new Set<string>();
      leads?.forEach((l) => {
        if (l.origem) canais.add(l.origem);
      });
      
      return Array.from(canais).sort();
    },
    enabled: !!user,
  });

  // Lista de bairros únicos
  const { data: availableBairros } = useQuery({
    queryKey: ["channel-analytics", "bairros-list", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: clientes } = await supabase
        .from("clientes")
        .select("bairro")
        .eq("user_id", user.id)
        .not("bairro", "is", null);

      const bairros = new Set<string>();
      clientes?.forEach((c) => {
        if (c.bairro) bairros.add(c.bairro);
      });
      
      return Array.from(bairros).sort();
    },
    enabled: !!user,
  });

  const isLoading = loadingRaw || loadingChannelMetrics || loadingHeatmap || 
    loadingChannelDay || loadingBairroChannel || loadingOverview || loadingFunnel;

  return {
    channelMetrics,
    heatmapData,
    channelDayData,
    bairroChannelData,
    overviewKPIs,
    funnelData,
    availableCanais,
    availableBairros,
    isLoading,
    loadingChannelMetrics,
    loadingHeatmap,
    loadingChannelDay,
    loadingBairroChannel,
    loadingOverview,
    loadingFunnel,
  };
}
