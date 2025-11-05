import { useState } from "react";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { FunnelChart } from "@/components/analytics/FunnelChart";
import { PipelineChart } from "@/components/analytics/PipelineChart";
import { ScatterChart } from "@/components/analytics/ScatterChart";
import { useAnalytics, AnalyticsFilters as Filters } from "@/hooks/useAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, TrendingUp, DollarSign } from "lucide-react";

export default function Analytics() {
  const [filters, setFilters] = useState<Filters>({});
  const {
    funnelData,
    loadingFunnel,
    pipelineData,
    loadingPipeline,
    scatterData,
    loadingScatter,
  } = useAnalytics(filters);

  // Calcular KPIs principais
  const totalLeads = funnelData?.reduce((sum, stage) => sum + stage.count, 0) || 0;
  const totalPonderado = pipelineData?.reduce((sum, stage) => sum + stage.valor_ponderado, 0) || 0;
  const avgMargem = scatterData && scatterData.length > 0
    ? scatterData.reduce((sum, p) => sum + p.margem_pct, 0) / scatterData.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Análise detalhada de funil, pipeline e performance
        </p>
      </div>

      {/* Filtros Globais */}
      <AnalyticsFilters filters={filters} onChange={setFilters} />

      {/* KPIs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
                <p className="text-2xl font-bold">{totalLeads}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Ponderado</p>
                <p className="text-2xl font-bold">
                  R$ {totalPonderado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Margem Média</p>
                <p className="text-2xl font-bold">{avgMargem.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="space-y-6">
        {/* Funil de Conversão */}
        <FunnelChart data={funnelData} isLoading={loadingFunnel} />

        {/* Pipeline Ponderado */}
        <PipelineChart data={pipelineData} isLoading={loadingPipeline} />

        {/* Scatter Preço x Margem */}
        <ScatterChart data={scatterData} isLoading={loadingScatter} />
      </div>
    </div>
  );
}
