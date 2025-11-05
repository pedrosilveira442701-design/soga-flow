import { Button } from "@/components/ui/button";
import { FileText, UserPlus, DollarSign, Target, TrendingUp, Percent } from "lucide-react";
import { KPICard } from "@/components/kpi/KPICard";
import { TimelineChart } from "@/components/charts/TimelineChart";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { ProximosVencimentos } from "@/components/financeiro/ProximosVencimentos";
import { ProximasVisitas } from "@/components/visitas/ProximasVisitas";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/useDashboard";

export default function Dashboard() {
  const { kpis, timelineData, funnelData, isLoading } = useDashboard();

  const kpiData = [
    {
      title: "Total Bruto",
      value: kpis.bruto.value,
      delta: kpis.bruto.delta,
      icon: DollarSign,
    },
    {
      title: "Total Custo",
      value: kpis.custo.value,
      delta: kpis.custo.delta,
      icon: TrendingUp,
    },
    {
      title: "Valor Líquido",
      value: kpis.liquido.value,
      delta: kpis.liquido.delta,
      variant: "liquid" as const,
      icon: Target,
    },
    {
      title: "Margem",
      value: kpis.margem.value,
      delta: kpis.margem.delta,
      icon: Percent,
    },
    {
      title: "A Receber",
      value: kpis.aReceber.value,
      delta: kpis.aReceber.delta,
      icon: FileText,
    },
  ];
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
          <Button variant="outline" size="lg">
            <UserPlus className="h-5 w-5" strokeWidth={2} />
            Novo Cliente
          </Button>
          <Button size="lg">
            <FileText className="h-5 w-5" strokeWidth={2} />
            Nova Proposta
          </Button>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : (
          kpiData.map((kpi) => (
            <KPICard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              delta={kpi.delta}
              variant={kpi.variant}
              icon={kpi.icon}
            />
          ))
        )}
      </div>

      {/* Row 2: Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TimelineChart data={timelineData} />
        <FunnelChart data={funnelData} />
      </div>

      {/* Row 3: Widgets de Vencimentos e Visitas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProximosVencimentos />
        <ProximasVisitas />
      </div>
    </div>
  );
}
