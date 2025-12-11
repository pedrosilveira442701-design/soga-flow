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

// Cores HSL consistentes com o design system
const MODE_COLORS = {
  leads: {
    base: "199 89% 48%", // Azul petróleo
    levels: [
      { opacity: 0.25, label: "Baixo" },
      { opacity: 0.5, label: "Médio" },
      { opacity: 0.75, label: "Alto" },
      { opacity: 1, label: "Muito Alto" },
    ],
  },
  fechados: {
    base: "142 76% 36%", // Verde
    levels: [
      { opacity: 0.25, label: "Baixo" },
      { opacity: 0.5, label: "Médio" },
      { opacity: 0.75, label: "Alto" },
      { opacity: 1, label: "Muito Alto" },
    ],
  },
  valor: {
    base: "45 93% 47%", // Amarelo/Dourado
    levels: [
      { opacity: 0.25, label: "Baixo" },
      { opacity: 0.5, label: "Médio" },
      { opacity: 0.75, label: "Alto" },
      { opacity: 1, label: "Muito Alto" },
    ],
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function getIntensityStyle(value: number, max: number, mode: ViewMode): React.CSSProperties {
  if (max === 0 || value === 0) {
    return { backgroundColor: "hsl(var(--muted))" };
  }
  
  const intensity = value / max;
  const baseColor = MODE_COLORS[mode].base;
  
  // Calcular opacidade baseada na intensidade
  let opacity: number;
  if (intensity > 0.75) opacity = 1;
  else if (intensity > 0.5) opacity = 0.75;
  else if (intensity > 0.25) opacity = 0.5;
  else opacity = 0.3;
  
  // Aplicar degradê sutil
  return {
    background: `linear-gradient(135deg, hsla(${baseColor}, ${opacity}) 0%, hsla(${baseColor}, ${opacity * 0.85}) 100%)`,
    boxShadow: intensity > 0.5 ? `0 2px 4px hsla(${baseColor}, 0.2)` : undefined,
  };
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
            <div className="min-w-[700px]">
              {/* Header com horas - usando grid */}
              <div 
                className="grid gap-1 mb-1"
                style={{ gridTemplateColumns: `40px repeat(${horasVisiveis.length}, 32px)` }}
              >
                <div /> {/* Espaço para labels dos dias */}
                {horasVisiveis.map((hora) => (
                  <div key={hora} className="text-center text-xs text-muted-foreground">
                    {hora}h
                  </div>
                ))}
              </div>

              {/* Grid de células */}
              {DIAS.map((dia, diaIdx) => (
                <div 
                  key={dia} 
                  className="grid gap-1 mb-1"
                  style={{ gridTemplateColumns: `40px repeat(${horasVisiveis.length}, 32px)` }}
                >
                  <div className="flex items-center text-sm font-medium text-muted-foreground">
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
                            className="h-8 rounded cursor-pointer transition-all duration-200 hover:scale-105 hover:ring-2 hover:ring-primary/30"
                            style={getIntensityStyle(value, maxValue, viewMode)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm space-y-1">
                            <p className="font-semibold border-b border-border pb-1">{dia}, {hora}h-{hora + 1}h</p>
                            <p className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Leads:</span>
                              <span className="font-medium">{cellData?.leads || 0}</span>
                            </p>
                            <p className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Fechados:</span>
                              <span className="font-medium">{cellData?.fechados || 0}</span>
                            </p>
                            <p className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Valor:</span>
                              <span className="font-medium">{formatCurrency(cellData?.valor || 0)}</span>
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}

              {/* Legenda com degradês */}
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span>Menos</span>
                <div className="flex gap-1">
                  {MODE_COLORS[viewMode].levels.map((level, idx) => (
                    <div
                      key={idx}
                      className="w-6 h-4 rounded"
                      style={{
                        background: `linear-gradient(135deg, hsla(${MODE_COLORS[viewMode].base}, ${level.opacity}) 0%, hsla(${MODE_COLORS[viewMode].base}, ${level.opacity * 0.85}) 100%)`,
                      }}
                      title={level.label}
                    />
                  ))}
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
