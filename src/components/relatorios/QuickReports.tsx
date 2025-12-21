import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Users, 
  DollarSign, 
  MapPin, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Zap
} from "lucide-react";
import { ReportConfig, DatasetType } from "@/hooks/useRelatorios";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

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
      columns: ["cliente", "status", "servico", "valor_total", "valor_liquido", "created_at"],
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Relatórios Rápidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickReports.map((report) => (
            <Card
              key={report.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                report.variant === "warning" ? "border-yellow-500/50" : 
                report.variant === "success" ? "border-green-500/50" : ""
              }`}
              onClick={() => handleRun(report)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    report.variant === "warning" ? "bg-yellow-500/10 text-yellow-600" :
                    report.variant === "success" ? "bg-green-500/10 text-green-600" :
                    "bg-primary/10 text-primary"
                  }`}>
                    <report.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{report.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {report.description}
                    </p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {report.config.scope === "periodo" ? "Por período" : "Global"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
