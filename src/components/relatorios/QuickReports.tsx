import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Users, 
  DollarSign, 
  MapPin, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Zap,
  ArrowRight
} from "lucide-react";
import { ReportConfig, DatasetType } from "@/hooks/useRelatorios";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface QuickReportsProps {
  onRunReport: (config: ReportConfig) => void;
}

interface QuickReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  dataset: DatasetType;
  config: Partial<ReportConfig>;
  variant?: "default" | "warning" | "success";
}

const quickReports: QuickReportCard[] = [
  {
    id: "propostas-global",
    title: "Propostas (Global)",
    description: "Todas as propostas do sistema",
    icon: FileText,
    dataset: "propostas",
    config: {
      scope: "global",
      filters: {},
      columns: ["cliente", "status", "servico", "valor_total", "valor_liquido", "periodo_dia"],
    },
  },
  {
    id: "propostas-mes",
    title: "Propostas do Mês",
    description: "Propostas criadas este mês",
    icon: Calendar,
    dataset: "propostas",
    config: {
      scope: "periodo",
      dateRange: {
        start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
        end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
      },
      filters: {},
      columns: ["cliente", "status", "servico", "canal", "valor_total", "margem_pct"],
    },
  },
  {
    id: "contratos-canal",
    title: "Contratos por Canal",
    description: "Análise de vendas por canal de origem",
    icon: TrendingUp,
    dataset: "contratos",
    config: {
      scope: "global",
      filters: {},
      columns: ["cliente", "canal", "servico", "valor_total", "valor_liquido", "margem_pct"],
      orderBy: { field: "valor_total", direction: "desc" },
    },
    variant: "success",
  },
  {
    id: "financeiro-atrasados",
    title: "Pagamentos Atrasados",
    description: "Parcelas em atraso que precisam de atenção",
    icon: AlertTriangle,
    dataset: "financeiro",
    config: {
      scope: "global",
      filters: { status: ["atrasado"] },
      columns: ["cliente", "numero_parcela", "valor", "periodo_dia", "dias_atraso"],
      orderBy: { field: "dias_atraso", direction: "desc" },
    },
    variant: "warning",
  },
  {
    id: "financeiro-pendentes",
    title: "A Receber",
    description: "Parcelas pendentes de pagamento",
    icon: DollarSign,
    dataset: "financeiro",
    config: {
      scope: "global",
      filters: { status: ["pendente"] },
      columns: ["cliente", "numero_parcela", "valor", "periodo_dia", "forma"],
      orderBy: { field: "periodo_dia", direction: "asc" },
    },
  },
  {
    id: "financeiro-pagos-mes",
    title: "Pagos no Mês",
    description: "Parcelas recebidas este mês",
    icon: DollarSign,
    dataset: "financeiro",
    config: {
      scope: "periodo",
      dateRange: {
        start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
        end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
      },
      filters: { status: ["pago"] },
      columns: ["cliente", "numero_parcela", "valor", "data_pagamento", "forma"],
    },
    variant: "success",
  },
  {
    id: "clientes-ranking",
    title: "Ranking de Clientes",
    description: "Top clientes por valor total de contratos",
    icon: Users,
    dataset: "clientes",
    config: {
      scope: "global",
      filters: {},
      columns: ["cliente", "cidade", "total_contratos", "total_propostas", "valor_total_contratos"],
      orderBy: { field: "valor_total_contratos", direction: "desc" },
    },
  },
  {
    id: "localizacao-cidade",
    title: "Propostas por Cidade",
    description: "Distribuição geográfica das propostas",
    icon: MapPin,
    dataset: "propostas",
    config: {
      scope: "global",
      filters: {},
      columns: ["cidade", "bairro", "cliente", "valor_total", "servico", "status"],
      orderBy: { field: "cidade", direction: "asc" },
    },
  },
];

export function QuickReports({ onRunReport }: QuickReportsProps) {
  const handleRun = (report: QuickReportCard) => {
    const fullConfig: ReportConfig = {
      dataset: report.dataset,
      scope: report.config.scope || "global",
      dateRange: report.config.dateRange,
      filters: report.config.filters || {},
      columns: report.config.columns || [],
      orderBy: report.config.orderBy,
    };
    onRunReport(fullConfig);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Relatórios Rápidos</CardTitle>
            <CardDescription>Clique para gerar relatórios pré-configurados</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickReports.map((report) => (
            <button
              key={report.id}
              onClick={() => handleRun(report)}
              className={`
                group relative p-4 rounded-lg border text-left transition-all duration-200
                hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5
                ${report.variant === "warning" 
                  ? "border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10" 
                  : report.variant === "success" 
                    ? "border-green-500/30 bg-green-500/5 hover:bg-green-500/10" 
                    : "border-border/50 bg-card hover:bg-muted/30"
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  p-2 rounded-lg shrink-0
                  ${report.variant === "warning" 
                    ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500" 
                    : report.variant === "success" 
                      ? "bg-green-500/10 text-green-600 dark:text-green-500" 
                      : "bg-primary/10 text-primary"
                  }
                `}>
                  <report.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {report.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {report.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {report.config.scope === "periodo" ? "Período" : "Global"}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}