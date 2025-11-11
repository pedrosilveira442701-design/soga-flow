import { Button } from "@/components/ui/button";
import { FileText, UserPlus, DollarSign, HandCoins, Receipt, XCircle, Clock, CheckCircle2 } from "lucide-react";
import { KPICard } from "@/components/kpi/KPICard";
import { TimelineChart } from "@/components/charts/TimelineChart";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { RecebimentosTendenciaChart } from "@/components/charts/RecebimentosTendenciaChart";
import { PipelineDistributionChart } from "@/components/charts/PipelineDistributionChart";
import { ProximosVencimentos } from "@/components/financeiro/ProximosVencimentos";
import { ProximasVisitas } from "@/components/visitas/ProximasVisitas";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard, FilterPeriod } from "@/hooks/useDashboard";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { useState } from "react";

export default function Dashboard() {
  const [period, setPeriod] = useState<FilterPeriod>("month");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>();

  const { kpis, timelineData, funnelData, recebimentosTendencia, isLoading } = useDashboard({
    period,
    customDateRange,
  });

  const kpiData: Array<{
    title: string;
    value: string;
    delta?: { value: string; direction: "up" | "down" };
    variant?: "default" | "liquid";
    icon: any;
  }> = [
    {
      title: "Recebido no Período",
      value: kpis.recebidoMes.value,
      delta: kpis.recebidoMes.delta,
      icon: DollarSign,
    },
    {
      title: "Volume Real de Propostas",
      value: kpis.totalPropostas.value,
      delta: kpis.totalPropostas.delta,
      icon: FileText,
    },
    {
      title: "Valor Total de Contratos",
      value: kpis.totalContratos.value,
      delta: kpis.totalContratos.delta,
      icon: HandCoins,
    },
    {
      title: "Valor Total a Receber Líquido",
      value: kpis.totalAReceberLiquido.value,
      variant: "liquid" as const,
      icon: Receipt,
    },
  ];
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1">Dashboard</h1>
            <p className="text-body text-muted-foreground mt-2">
              Visão geral do seu negócio
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline">
              <UserPlus className="mr-3 h-5 w-5" strokeWidth={1.5} />
              Novo Cliente
            </Button>
            <Button>
              <FileText className="mr-3 h-5 w-5" strokeWidth={1.5} />
              Nova Proposta
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <DashboardFilters
          period={period}
          onPeriodChange={setPeriod}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
        />
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
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

      {/* Row 2: Pipeline de Propostas */}
      <div>
        <h2 className="text-h2 mb-4">Pipeline de Propostas</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : (
            <>
              <KPICard
                title="Total de Propostas"
                value={kpis.totalPropostasCount.value}
                subValue={kpis.totalPropostasCount.subValue}
                delta={kpis.totalPropostasCount.delta}
                variant="default"
                icon={FileText}
              />
              <KPICard
                title="Propostas Perdidas"
                value={kpis.propostasPerdidas.value}
                subValue={kpis.propostasPerdidas.subValue}
                delta={kpis.propostasPerdidas.delta}
                variant="danger"
                icon={XCircle}
              />
              <KPICard
                title="Propostas em Repouso"
                value={kpis.propostasRepouso.value}
                subValue={kpis.propostasRepouso.subValue}
                delta={kpis.propostasRepouso.delta}
                variant="repouso"
                icon={Clock}
              />
              <KPICard
                title="Volume Real (Ativas)"
                value={kpis.propostasAtivas.value}
                subValue={kpis.propostasAtivas.subValue}
                delta={kpis.propostasAtivas.delta}
                variant="success"
                icon={CheckCircle2}
              />
            </>
          )}
        </div>
      </div>

      {/* Row 3: Gráfico de Distribuição */}
      {!isLoading && <PipelineDistributionChart data={kpis.pipelineDistribution} />}

      {/* Row 4: Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TimelineChart data={timelineData} />
        <FunnelChart data={funnelData} />
      </div>

      {/* Row 5: Tendência de Recebimentos */}
      <RecebimentosTendenciaChart data={recebimentosTendencia} />

      {/* Row 6: Widgets de Vencimentos e Visitas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProximosVencimentos />
        <ProximasVisitas />
      </div>
    </div>
  );
}
