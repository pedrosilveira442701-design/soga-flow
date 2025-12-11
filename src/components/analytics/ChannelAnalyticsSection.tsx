import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import { useChannelAnalytics, type ChannelFilters } from "@/hooks/useChannelAnalytics";
import { ChannelFilters as ChannelFiltersComponent } from "./ChannelFilters";
import { ChannelOverviewCards } from "./ChannelOverviewCards";
import { ChannelPerformanceTable } from "./ChannelPerformanceTable";
import { ChannelHeatmap } from "./ChannelHeatmap";
import { ChannelDayChart } from "./ChannelDayChart";
import { ChannelBairroTable } from "./ChannelBairroTable";
import { ChannelFunnelChart } from "./ChannelFunnelChart";

export function ChannelAnalyticsSection() {
  const [filters, setFilters] = useState<ChannelFilters>({ period: "30d" });
  
  const {
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
  } = useChannelAnalytics(filters);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Analytics de Canais de Venda
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            De onde vêm os clientes? Quando eles vêm? Onde eles estão?
          </p>
        </CardHeader>
        <CardContent>
          <ChannelFiltersComponent 
            filters={filters} 
            onChange={setFilters}
            availableCanais={availableCanais || []}
            availableBairros={availableBairros || []}
          />
        </CardContent>
      </Card>

      {/* KPIs Overview */}
      <ChannelOverviewCards data={overviewKPIs} isLoading={loadingOverview} />

      {/* Performance por Canal (Tabela + Gráfico) */}
      <ChannelPerformanceTable data={channelMetrics} isLoading={loadingChannelMetrics} />

      {/* Heat Zone - Dia x Hora */}
      <ChannelHeatmap data={heatmapData} isLoading={loadingHeatmap} />

      {/* Canal x Dia da Semana */}
      <ChannelDayChart data={channelDayData} isLoading={loadingChannelDay} />

      {/* Canal x Bairros */}
      <ChannelBairroTable data={bairroChannelData} isLoading={loadingBairroChannel} />

      {/* Funil por Canal */}
      <ChannelFunnelChart data={funnelData} isLoading={loadingFunnel} />
    </div>
  );
}
