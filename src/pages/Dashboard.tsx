import { Button } from "@/components/ui/button";
import { FileText, UserPlus, DollarSign, Target, TrendingUp, Percent } from "lucide-react";
import { KPICard } from "@/components/kpi/KPICard";
import { TimelineChart } from "@/components/charts/TimelineChart";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { ProximosVencimentos } from "@/components/financeiro/ProximosVencimentos";

const kpiData = [
  {
    title: "Total Bruto",
    value: "R$ 185.400",
    delta: { value: "+12%", direction: "up" as const },
    icon: DollarSign,
  },
  {
    title: "Total Custo",
    value: "R$ 92.700",
    delta: { value: "+8%", direction: "up" as const },
    icon: TrendingUp,
  },
  {
    title: "Valor Líquido",
    value: "R$ 92.700",
    delta: { value: "+15%", direction: "up" as const },
    variant: "liquid" as const,
    icon: Target,
  },
  {
    title: "Margem",
    value: "50%",
    delta: { value: "+3%", direction: "up" as const },
    icon: Percent,
  },
  {
    title: "A Receber",
    value: "R$ 45.200",
    delta: { value: "-2%", direction: "down" as const },
    icon: FileText,
  },
];

const timelineData = [
  { name: "Jan", bruto: 120000, custo: 60000, liquido: 60000 },
  { name: "Fev", bruto: 135000, custo: 65000, liquido: 70000 },
  { name: "Mar", bruto: 155000, custo: 72000, liquido: 83000 },
  { name: "Abr", bruto: 165000, custo: 78000, liquido: 87000 },
  { name: "Mai", bruto: 185400, custo: 92700, liquido: 92700 },
];

const funnelData = [
  { stage: "Novo", count: 150, conversionRate: 100 },
  { stage: "Contato", count: 120, conversionRate: 80 },
  { stage: "Qualificado", count: 85, conversionRate: 71 },
  { stage: "Proposta", count: 62, conversionRate: 73 },
  { stage: "Ganho", count: 42, conversionRate: 68 },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1">Dashboard</h1>
          <p className="text-body text-muted-foreground mt-2">
            Visão geral do seu negócio
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline">
            <UserPlus className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Novo Cliente
          </Button>
          <Button>
            <FileText className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Nova Proposta
          </Button>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {kpiData.map((kpi) => (
          <KPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            delta={kpi.delta}
            variant={kpi.variant}
            icon={kpi.icon}
          />
        ))}
      </div>

      {/* Row 2: Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TimelineChart data={timelineData} />
        <FunnelChart data={funnelData} />
      </div>

      {/* Row 3: Próximos Vencimentos */}
      <ProximosVencimentos />
    </div>
  );
}
