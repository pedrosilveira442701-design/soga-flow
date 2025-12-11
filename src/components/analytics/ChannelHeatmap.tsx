import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { HeatmapData } from "@/hooks/useChannelAnalytics";

interface ChannelHeatmapProps {
  data?: HeatmapData[];
  isLoading: boolean;
}

type ViewMode = "leads" | "fechados" | "valor";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HORAS = Array.from({ length: 24 }, (_, i) => i);

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function getIntensityColor(value: number, max: number, mode: ViewMode): string {
  if (max === 0 || value === 0) return "bg-muted";
  
  const intensity = value / max;
  
  if (mode === "fechados") {
    if (intensity > 0.75) return "bg-green-500";
    if (intensity > 0.5) return "bg-green-400";
    if (intensity > 0.25) return "bg-green-300";
    return "bg-green-200";
  }
  
  if (mode === "valor") {
    if (intensity > 0.75) return "bg-amber-500";
    if (intensity > 0.5) return "bg-amber-400";
    if (intensity > 0.25) return "bg-amber-300";
    return "bg-amber-200";
  }
  
  // leads
  if (intensity > 0.75) return "bg-blue-500";
  if (intensity > 0.5) return "bg-blue-400";
  if (intensity > 0.25) return "bg-blue-300";
  return "bg-blue-200";
}

export function ChannelHeatmap({ data, isLoading }: ChannelHeatmapProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("leads");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Heat Zone - Leads por Dia/Hora</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Heat Zone - Leads por Dia/Hora</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum dado disponível para o período selecionado
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calcular máximo para escala de cores
  const maxValue = Math.max(
    ...data.map((d) => 
      viewMode === "leads" ? d.leads : 
      viewMode === "fechados" ? d.fechados : 
      d.valor
    )
  );

  // Agrupar por hora para mostrar apenas horário comercial expandido (6h-22h)
  const horasVisiveis = HORAS.filter((h) => h >= 6 && h <= 22);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Heat Zone - Leads por Dia/Hora</CardTitle>
        <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
          <ToggleGroupItem value="leads" size="sm">Leads</ToggleGroupItem>
          <ToggleGroupItem value="fechados" size="sm">Fechados</ToggleGroupItem>
          <ToggleGroupItem value="valor" size="sm">Valor</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <TooltipProvider>
            <div className="min-w-[600px]">
              {/* Header com horas */}
              <div className="flex gap-1 mb-1 ml-12">
                {horasVisiveis.map((hora) => (
                  <div key={hora} className="w-8 text-center text-xs text-muted-foreground">
                    {hora}h
                  </div>
                ))}
              </div>

              {/* Grid */}
              {DIAS.map((dia, diaIdx) => (
                <div key={dia} className="flex gap-1 mb-1">
                  <div className="w-10 flex items-center text-sm font-medium text-muted-foreground">
                    {dia}
                  </div>
                  {horasVisiveis.map((hora) => {
                    const cellData = data.find((d) => d.dia === diaIdx && d.hora === hora);
                    const value = cellData
                      ? viewMode === "leads" ? cellData.leads
                        : viewMode === "fechados" ? cellData.fechados
                        : cellData.valor
                      : 0;

                    return (
                      <Tooltip key={hora}>
                        <TooltipTrigger asChild>
                          <div
                            className={`w-8 h-8 rounded cursor-pointer transition-colors ${getIntensityColor(value, maxValue, viewMode)}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <p className="font-medium">{dia}, {hora}h-{hora + 1}h</p>
                            <p>{cellData?.leads || 0} leads</p>
                            <p>{cellData?.fechados || 0} fechados</p>
                            <p>{formatCurrency(cellData?.valor || 0)}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}

              {/* Legenda */}
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span>Menos</span>
                <div className="flex gap-1">
                  <div className={`w-6 h-4 rounded ${viewMode === "leads" ? "bg-blue-200" : viewMode === "fechados" ? "bg-green-200" : "bg-amber-200"}`} />
                  <div className={`w-6 h-4 rounded ${viewMode === "leads" ? "bg-blue-300" : viewMode === "fechados" ? "bg-green-300" : "bg-amber-300"}`} />
                  <div className={`w-6 h-4 rounded ${viewMode === "leads" ? "bg-blue-400" : viewMode === "fechados" ? "bg-green-400" : "bg-amber-400"}`} />
                  <div className={`w-6 h-4 rounded ${viewMode === "leads" ? "bg-blue-500" : viewMode === "fechados" ? "bg-green-500" : "bg-amber-500"}`} />
                </div>
                <span>Mais</span>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
