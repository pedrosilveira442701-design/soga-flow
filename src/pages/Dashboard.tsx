import { Button } from "@/components/ui/button";
import { FileText, UserPlus, DollarSign, HandCoins, XCircle, Clock, CheckCircle2, Wallet, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
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

  const kpiDataFinanceiro: Array<{
    title: string;
    value: string;
    delta?: { value: string; direction: "up" | "down" };
    variant?: "default" | "liquid" | "success";
    icon: any;
  }> = [
    {
      title: "Recebido no Período",
      value: kpis.recebidoMes.value,
      delta: kpis.recebidoMes.delta,
      icon: DollarSign,
    },
    {
      title: "Total Recebido Líquido",
      value: kpis.totalRecebidoLiquido.value,
      variant: "success" as const,
      icon: Wallet,
    },
    {
      title: "Margem Líquida a Receber",
      value: kpis.totalAReceberLiquido.value,
      variant: "liquid" as const,
      icon: TrendingUp,
    },
  ];

  const kpiDataOperacional: Array<{
    title: string;
    value: string;
    delta?: { value: string; direction: "up" | "down" };
    variant?: "default" | "liquid" | "success";
    icon: any;
  }> = [
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
          
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              size="lg"
              asChild
              className="group relative overflow-hidden border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-300"
            >
              <Link to="/leads?new=true" className="flex items-center gap-3 px-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <UserPlus className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="font-medium">Adicionar Lead</span>
              </Link>
            </Button>
            <Button 
              size="lg"
              asChild
              className="group relative overflow-hidden shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
            >
              <Link to="/propostas?new=true" className="flex items-center gap-3 px-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/20 group-hover:bg-primary-foreground/30 transition-colors">
                  <FileText className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <span className="font-medium">Nova Proposta</span>
              </Link>
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

      {/* Row 1: KPI Cards - Indicadores Financeiros */}
      <div>
        <h2 className="text-h3 mb-4 text-muted-foreground">Indicadores Financeiros</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : (
            kpiDataFinanceiro.map((kpi) => (
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
      </div>

      {/* Row 2: KPI Cards - Indicadores Operacionais */}
      <div>
        <h2 className="text-h3 mb-4 text-muted-foreground">Indicadores Operacionais</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : (
            kpiDataOperacional.map((kpi) => (
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
      </div>

      {/* Row 3: Pipeline de Propostas */}
      <div>
        <h2 className="text-h2 mb-4">Pipeline de Propostas</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : (
            <>
              <KPICard
                title="Volume Total de Propostas"
                value={kpis.totalPropostasCount.value}
                subValue={kpis.totalPropostasCount.subValue}
                delta={kpis.totalPropostasCount.delta}
                variant="default"
                icon={FileText}
              />
              <KPICard
                title="Volume Real (Abertas)"
                value={kpis.propostasAtivas.value}
                subValue={kpis.propostasAtivas.subValue}
                delta={kpis.propostasAtivas.delta}
                variant="success"
                icon={CheckCircle2}
              />
              <KPICard
                title="Contratos Fechados"
                value={kpis.contratosFechados.value}
                subValue={kpis.contratosFechados.subValue}
                delta={kpis.contratosFechados.delta}
                variant="success"
                icon={HandCoins}
              />
            </>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Row 4: Gráfico de Distribuição */}
      {!isLoading && <PipelineDistributionChart data={kpis.pipelineDistribution} />}

      {/* Row 5: Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TimelineChart data={timelineData} />
        <FunnelChart data={funnelData} />
      </div>

      {/* Row 6: Tendência de Recebimentos */}
      <RecebimentosTendenciaChart data={recebimentosTendencia} />

      {/* Row 7: Widgets de Vencimentos e Visitas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProximosVencimentos />
        <ProximasVisitas />
      </div>
    </div>
  );
}
