import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type DatasetType = "clientes" | "propostas" | "contratos" | "financeiro" | "vendas" | "leads" | "visitas" | "obras";

export interface ReportFilters {
  status?: string[];
  cliente?: string;
  canal?: string[];
  servico?: string[];
  cidade?: string[];
  bairro?: string[];
  responsavel?: string;
}

export interface ReportConfig {
  dataset: DatasetType;
  scope: "global" | "periodo";
  dateRange?: { start: string; end: string };
  filters: ReportFilters;
  columns: string[];
  groupBy?: string;
  orderBy?: { field: string; direction: "asc" | "desc" };
  limit?: number;
}

export interface ExportHistoryItem {
  id: string;
  nome: string;
  dataset: DatasetType;
  periodo: string;
  formato: "excel" | "pdf";
  created_at: string;
  download_url?: string;
}

// Column definitions per dataset
export const DATASET_COLUMNS: Record<DatasetType, { key: string; label: string; type: string }[]> = {
  clientes: [
    { key: "cliente", label: "Cliente", type: "text" },
    { key: "cidade", label: "Cidade", type: "text" },
    { key: "bairro", label: "Bairro", type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "total_propostas", label: "Total Propostas", type: "number" },
    { key: "total_contratos", label: "Total Contratos", type: "number" },
    { key: "valor_total_contratos", label: "Valor Total Contratos", type: "currency" },
    { key: "created_at", label: "Cadastrado em", type: "date" },
  ],
  propostas: [
    { key: "cliente", label: "Cliente", type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "servico", label: "Serviço", type: "text" },
    { key: "canal", label: "Canal", type: "text" },
    { key: "cidade", label: "Cidade", type: "text" },
    { key: "bairro", label: "Bairro", type: "text" },
    { key: "m2", label: "M²", type: "number" },
    { key: "valor_total", label: "Valor Total", type: "currency" },
    { key: "valor_liquido", label: "Valor Líquido", type: "currency" },
    { key: "margem_pct", label: "Margem %", type: "percent" },
    { key: "desconto", label: "Desconto", type: "currency" },
    { key: "dias_aberta", label: "Dias Aberta", type: "number" },
    { key: "forma_pagamento", label: "Forma Pagamento", type: "text" },
    { key: "periodo_mes", label: "Mês", type: "text" },
    { key: "periodo_dia", label: "Data Proposta", type: "date" },
  ],
  contratos: [
    { key: "cliente", label: "Cliente", type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "servico", label: "Serviço", type: "text" },
    { key: "canal", label: "Canal", type: "text" },
    { key: "cidade", label: "Cidade", type: "text" },
    { key: "bairro", label: "Bairro", type: "text" },
    { key: "m2", label: "M²", type: "number" },
    { key: "valor_total", label: "Valor Total", type: "currency" },
    { key: "valor_liquido", label: "Valor Líquido", type: "currency" },
    { key: "margem_pct", label: "Margem %", type: "percent" },
    { key: "forma_pagamento", label: "Forma Pagamento", type: "text" },
    { key: "periodo_mes", label: "Mês", type: "text" },
    { key: "periodo_dia", label: "Data Início", type: "date" },
  ],
  vendas: [
    { key: "cliente", label: "Cliente", type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "servico", label: "Serviço", type: "text" },
    { key: "canal", label: "Canal", type: "text" },
    { key: "cidade", label: "Cidade", type: "text" },
    { key: "bairro", label: "Bairro", type: "text" },
    { key: "m2", label: "M²", type: "number" },
    { key: "valor_total", label: "Valor Total", type: "currency" },
    { key: "valor_liquido", label: "Valor Líquido", type: "currency" },
    { key: "margem_pct", label: "Margem %", type: "percent" },
    { key: "forma_pagamento", label: "Forma Pagamento", type: "text" },
    { key: "periodo_mes", label: "Mês", type: "text" },
    { key: "periodo_dia", label: "Data Início", type: "date" },
  ],
  financeiro: [
    { key: "cliente", label: "Cliente", type: "text" },
    { key: "numero_parcela", label: "Parcela", type: "number" },
    { key: "valor", label: "Valor", type: "currency" },
    { key: "status", label: "Status", type: "text" },
    { key: "forma", label: "Forma", type: "text" },
    { key: "cidade", label: "Cidade", type: "text" },
    { key: "bairro", label: "Bairro", type: "text" },
    { key: "periodo_dia", label: "Vencimento", type: "date" },
    { key: "data_pagamento", label: "Data Pagamento", type: "date" },
    { key: "dias_atraso", label: "Dias Atraso", type: "number" },
    { key: "periodo_mes", label: "Mês", type: "text" },
  ],
  leads: [
    { key: "cliente", label: "Cliente", type: "text" },
    { key: "estagio", label: "Estágio", type: "text" },
    { key: "canal", label: "Canal", type: "text" },
    { key: "servico", label: "Serviço", type: "text" },
    { key: "cidade", label: "Cidade", type: "text" },
    { key: "bairro", label: "Bairro", type: "text" },
    { key: "m2", label: "M²", type: "number" },
    { key: "valor_potencial", label: "Valor Potencial", type: "currency" },
    { key: "dias_no_funil", label: "Dias no Funil", type: "number" },
    { key: "first_response_minutes", label: "Min. Resposta", type: "number" },
    { key: "responsavel", label: "Responsável", type: "text" },
    { key: "motivo_perda", label: "Motivo Perda", type: "text" },
    { key: "periodo_mes", label: "Mês", type: "text" },
    { key: "periodo_dia", label: "Data Entrada", type: "date" },
  ],
  visitas: [
    { key: "cliente", label: "Cliente", type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "canal", label: "Canal", type: "text" },
    { key: "servico", label: "Serviço", type: "text" },
    { key: "cidade", label: "Cidade", type: "text" },
    { key: "bairro", label: "Bairro", type: "text" },
    { key: "m2", label: "M²", type: "number" },
    { key: "realizada", label: "Realizada", type: "boolean" },
    { key: "responsavel", label: "Responsável", type: "text" },
    { key: "periodo_mes", label: "Mês", type: "text" },
    { key: "periodo_dia", label: "Data Visita", type: "date" },
  ],
  obras: [
    { key: "cliente", label: "Cliente", type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "servico", label: "Serviço", type: "text" },
    { key: "cidade", label: "Cidade", type: "text" },
    { key: "bairro", label: "Bairro", type: "text" },
    { key: "m2", label: "M²", type: "number" },
    { key: "valor_total", label: "Valor Total", type: "currency" },
    { key: "progresso_pct", label: "Progresso %", type: "percent" },
    { key: "responsavel_obra", label: "Responsável", type: "text" },
    { key: "periodo_mes", label: "Mês", type: "text" },
    { key: "periodo_dia", label: "Data Início", type: "date" },
  ],
};

export const DATASET_LABELS: Record<DatasetType, string> = {
  clientes: "Clientes",
  propostas: "Propostas",
  contratos: "Contratos",
  vendas: "Vendas (Contratos)",
  financeiro: "Financeiro",
  leads: "Leads",
  visitas: "Visitas",
  obras: "Obras",
};

export const VIEW_MAP: Record<DatasetType, string> = {
  clientes: "vw_clientes",
  propostas: "vw_propostas",
  contratos: "vw_vendas",
  vendas: "vw_vendas",
  financeiro: "vw_financeiro",
  leads: "vw_leads",
  visitas: "vw_visitas",
  obras: "vw_obras",
};

export function useRelatorios() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTotals, setPreviewTotals] = useState<Record<string, number> | null>(null);

  // Fetch preview data from Supabase views directly
  const fetchPreview = useCallback(async (config: ReportConfig) => {
    if (!user?.id) return;
    
    setPreviewLoading(true);
    setPreviewData(null);
    setPreviewTotals(null);

    try {
      const viewName = VIEW_MAP[config.dataset];
      let query = supabase.from(viewName as any).select("*");
      
      // Apply date range filter if periodo
      if (config.scope === "periodo" && config.dateRange) {
        if (config.dateRange.start) {
          query = query.gte("periodo_dia", config.dateRange.start);
        }
        if (config.dateRange.end) {
          query = query.lte("periodo_dia", config.dateRange.end);
        }
      }

      // Apply filters
      if (config.filters.status?.length) {
        query = query.in("status", config.filters.status);
      }
      if (config.filters.canal?.length) {
        query = query.in("canal", config.filters.canal);
      }
      if (config.filters.servico?.length) {
        query = query.in("servico", config.filters.servico);
      }
      if (config.filters.cidade?.length) {
        query = query.in("cidade", config.filters.cidade);
      }
      if (config.filters.bairro?.length) {
        query = query.in("bairro", config.filters.bairro);
      }
      if (config.filters.cliente) {
        query = query.ilike("cliente", `%${config.filters.cliente}%`);
      }
      if (config.filters.responsavel) {
        query = query.ilike("responsavel", `%${config.filters.responsavel}%`);
      }

      // Apply ordering
      if (config.orderBy) {
        query = query.order(config.orderBy.field, { ascending: config.orderBy.direction === "asc" });
      } else {
        query = query.order("periodo_dia", { ascending: false, nullsFirst: false });
      }

      // Limit for preview
      query = query.limit(config.limit || 100);

      const { data, error } = await query;

      if (error) throw error;

      // Filter columns if specified
      let filteredData = data || [];
      if (config.columns.length > 0) {
        filteredData = (data || []).map(row => {
          const filtered: any = {};
          config.columns.forEach(col => {
            if (col in row) {
              filtered[col] = row[col];
            }
          });
          return filtered;
        });
      }

      setPreviewData(filteredData);

      // Calculate totals for numeric columns
      const totals: Record<string, number> = { count: filteredData.length };
      const numericCols = ["valor_total", "valor_liquido", "valor", "m2", "desconto"];
      numericCols.forEach(col => {
        const sum = filteredData.reduce((acc, row) => acc + (Number(row[col]) || 0), 0);
        if (sum > 0) totals[col] = sum;
      });
      setPreviewTotals(totals);

    } catch (error: any) {
      console.error("Preview error:", error);
      toast({
        title: "Erro ao carregar prévia",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  }, [user?.id, toast]);

  // Export data (calls edge function for Excel/PDF generation)
  const exportReport = useCallback(async (config: ReportConfig, format: "excel" | "pdf") => {
    if (!user?.id) return;

    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-report", {
        body: {
          ...config,
          format,
          userId: user.id,
        },
      });

      if (error) throw error;

      if (data?.downloadUrl) {
        // Open download link
        window.open(data.downloadUrl, "_blank");
        toast({
          title: "Exportação concluída",
          description: `Relatório ${format.toUpperCase()} gerado com sucesso.`,
        });
      } else if (data?.csv) {
        // For CSV/Excel fallback
        const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const extension = format === "excel" ? "csv" : format;
        link.download = `relatorio_${config.dataset}_${new Date().toISOString().split("T")[0]}.${extension}`;
        link.click();
        URL.revokeObjectURL(url);
        toast({
          title: "Exportação concluída",
          description: `Relatório ${format === "excel" ? "Excel" : "PDF"} gerado com sucesso.`,
        });
      }

      return data;
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Erro na exportação",
        description: error.message || "Falha ao gerar relatório",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [user?.id, toast]);

  // Fetch distinct filter values for dropdowns
  const fetchFilterOptions = useCallback(async (dataset: DatasetType) => {
    if (!user?.id) return { canais: [], servicos: [], cidades: [], bairros: [], statuses: [] };

    const viewName = VIEW_MAP[dataset];
    
    try {
      const { data } = await supabase
        .from(viewName as any)
        .select("*")
        .limit(500);

      const rows = (data || []) as any[];
      const canais = [...new Set(rows.map(r => r.canal).filter(Boolean))] as string[];
      const servicos = [...new Set(rows.map(r => r.servico).filter(Boolean))] as string[];
      const cidades = [...new Set(rows.map(r => r.cidade).filter(Boolean))] as string[];
      const bairros = [...new Set(rows.map(r => r.bairro).filter(Boolean))] as string[];
      const statuses = [...new Set(rows.map(r => r.status).filter(Boolean))] as string[];

      return { canais, servicos, cidades, bairros, statuses };
    } catch (error) {
      console.error("Filter options error:", error);
      return { canais: [], servicos: [], cidades: [], bairros: [], statuses: [] };
    }
  }, [user?.id]);

  return {
    previewData,
    previewLoading,
    previewTotals,
    isExporting,
    fetchPreview,
    exportReport,
    fetchFilterOptions,
    datasetColumns: DATASET_COLUMNS,
    datasetLabels: DATASET_LABELS,
  };
}
