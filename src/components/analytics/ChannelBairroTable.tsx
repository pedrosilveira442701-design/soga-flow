import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import type { BairroChannelData } from "@/hooks/useChannelAnalytics";

interface ChannelBairroTableProps {
  data?: BairroChannelData[];
  isLoading: boolean;
}

type ViewMode = "leads" | "propostas" | "fechados" | "valor";

// Cores HSL fixas por canal - consistente com outros gráficos de Analytics
const CHANNEL_COLORS: Record<string, { hue: number; sat: number; light: number }> = {
  "Instagram": { hue: 330, sat: 80, light: 55 },
  "Google": { hue: 4, sat: 90, light: 58 },
  "Indicação": { hue: 262, sat: 83, light: 58 },
  "Site": { hue: 199, sat: 89, light: 48 },
  "WhatsApp": { hue: 142, sat: 70, light: 45 },
  "Facebook": { hue: 221, sat: 83, light: 53 },
  "Telefone": { hue: 38, sat: 92, light: 50 },
  "Outros": { hue: 215, sat: 16, light: 47 },
};

const FALLBACK_COLORS = [
  { hue: 280, sat: 65, light: 55 },
  { hue: 173, sat: 58, light: 39 },
  { hue: 24, sat: 95, light: 53 },
  { hue: 47, sat: 96, light: 53 },
];

function getChannelColor(canal: string): { hue: number; sat: number; light: number } {
  if (CHANNEL_COLORS[canal]) {
    return CHANNEL_COLORS[canal];
  }
  // Fallback consistente baseado no hash do nome
  const hash = canal.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ChannelBairroTable({ data, isLoading }: ChannelBairroTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("valor");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Canal x Bairros</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Canal x Bairros</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum dado disponível para o período selecionado
          </p>
        </CardContent>
      </Card>
    );
  }

  // Extrair bairros e canais únicos
  const bairros = Array.from(new Set(data.map((d) => d.bairro))).sort();
  const canais = Array.from(new Set(data.map((d) => d.canal))).sort();

  // Criar matriz bairro x canal
  const matrix = new Map<string, Map<string, BairroChannelData>>();
  data.forEach((d) => {
    if (!matrix.has(d.bairro)) {
      matrix.set(d.bairro, new Map());
    }
    matrix.get(d.bairro)!.set(d.canal, d);
  });

  // Calcular totais por bairro
  const bairroTotals = new Map<string, number>();
  bairros.forEach((bairro) => {
    let total = 0;
    canais.forEach((canal) => {
      const cellData = matrix.get(bairro)?.get(canal);
      if (cellData) {
        total += viewMode === "leads" ? cellData.leads
          : viewMode === "propostas" ? cellData.propostas
          : viewMode === "fechados" ? cellData.fechados
          : cellData.valor_fechados;
      }
    });
    bairroTotals.set(bairro, total);
  });

  // Ordenar bairros por total
  const sortedBairros = [...bairros].sort((a, b) => 
    (bairroTotals.get(b) || 0) - (bairroTotals.get(a) || 0)
  ).slice(0, 15); // Top 15 bairros

  // Calcular totais por canal (para rodapé) - SOMENTE dos top 15 bairros
  const canalTotalsTop15 = new Map<string, number>();
  canais.forEach((canal) => {
    let total = 0;
    sortedBairros.forEach((bairro) => {
      const cellData = matrix.get(bairro)?.get(canal);
      if (cellData) {
        total += viewMode === "leads" ? cellData.leads
          : viewMode === "propostas" ? cellData.propostas
          : viewMode === "fechados" ? cellData.fechados
          : cellData.valor_fechados;
      }
    });
    canalTotalsTop15.set(canal, total);
  });

  // Calcular total dos top 15 bairros
  const top15Total = Array.from(canalTotalsTop15.values()).reduce((sum, val) => sum + val, 0);

  // Calcular totais por canal (TODOS os bairros, não apenas top 15)
  const canalTotalsAll = new Map<string, number>();
  canais.forEach((canal) => {
    let total = 0;
    bairros.forEach((bairro) => {
      const cellData = matrix.get(bairro)?.get(canal);
      if (cellData) {
        total += viewMode === "leads" ? cellData.leads
          : viewMode === "propostas" ? cellData.propostas
          : viewMode === "fechados" ? cellData.fechados
          : cellData.valor_fechados;
      }
    });
    canalTotalsAll.set(canal, total);
  });

  // Calcular total geral absoluto (todos os bairros)
  const grandTotalAll = Array.from(canalTotalsAll.values()).reduce((sum, val) => sum + val, 0);

  // Calcular percentual que os top 15 representam do total
  const top15Percentage = grandTotalAll > 0 ? ((top15Total / grandTotalAll) * 100).toFixed(1) : "0";

  // Calcular max para escala de cores por canal
  const maxByCanal = new Map<string, number>();
  canais.forEach((canal) => {
    let max = 0;
    data.forEach((d) => {
      if (d.canal === canal) {
        const value = viewMode === "leads" ? d.leads
          : viewMode === "propostas" ? d.propostas
          : viewMode === "fechados" ? d.fechados
          : d.valor_fechados;
        if (value > max) max = value;
      }
    });
    maxByCanal.set(canal, max);
  });

  const getCellStyle = (value: number, canal: string) => {
    const maxValue = maxByCanal.get(canal) || 0;
    if (maxValue === 0 || value === 0) return {};
    
    const { hue, sat, light } = getChannelColor(canal);
    const intensity = value / maxValue;
    
    // Calcular lightness baseado na intensidade (mais intenso = mais saturado)
    const baseLightness = 92 - (intensity * 35); // 92% a 57%
    
    return {
      background: `linear-gradient(135deg, hsl(${hue}, ${sat}%, ${baseLightness}%) 0%, hsl(${hue}, ${sat}%, ${baseLightness + 5}%) 100%)`,
      color: intensity > 0.6 ? `hsl(${hue}, ${sat}%, 15%)` : undefined,
    };
  };

  const getHeaderStyle = (canal: string) => {
    const { hue, sat, light } = getChannelColor(canal);
    return {
      background: `linear-gradient(135deg, hsl(${hue}, ${sat}%, ${light}%) 0%, hsl(${hue}, ${sat}%, ${light + 10}%) 100%)`,
      color: 'white',
      textShadow: '0 1px 2px rgba(0,0,0,0.2)',
    };
  };

  const getFooterCellStyle = (canal: string) => {
    const { hue, sat } = getChannelColor(canal);
    return {
      background: `hsl(${hue}, ${sat}%, 92%)`,
      color: `hsl(${hue}, ${sat}%, 25%)`,
      fontWeight: 600,
    };
  };

  const getViewModeLabel = () => {
    switch (viewMode) {
      case "leads": return "quantidade de leads";
      case "propostas": return "quantidade de propostas";
      case "fechados": return "quantidade de contratos fechados";
      case "valor": return "valor total dos contratos fechados";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle>Canal x Bairros (Top 15)</CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            Exibindo {getViewModeLabel()} por canal de origem e bairro do cliente
          </CardDescription>
        </div>
        <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
          <ToggleGroupItem value="leads" size="sm">Leads</ToggleGroupItem>
          <ToggleGroupItem value="propostas" size="sm">Propostas</ToggleGroupItem>
          <ToggleGroupItem value="fechados" size="sm">Fechados</ToggleGroupItem>
          <ToggleGroupItem value="valor" size="sm">Valor Fechados</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10">Bairro</TableHead>
                {canais.map((canal) => (
                  <TableHead 
                    key={canal} 
                    className="text-center min-w-[80px] rounded-t"
                    style={getHeaderStyle(canal)}
                  >
                    {canal}
                  </TableHead>
                ))}
                <TableHead className="text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBairros.map((bairro) => (
                <TableRow key={bairro}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium">
                    <Badge variant="outline" className="whitespace-nowrap">
                      {bairro}
                    </Badge>
                  </TableCell>
                  {canais.map((canal) => {
                    const cellData = matrix.get(bairro)?.get(canal);
                    const value = cellData
                      ? viewMode === "leads" ? cellData.leads
                        : viewMode === "propostas" ? cellData.propostas
                        : viewMode === "fechados" ? cellData.fechados
                        : cellData.valor_fechados
                      : 0;

                    return (
                      <TableCell 
                        key={canal} 
                        className="text-center"
                        style={getCellStyle(value, canal)}
                      >
                        {viewMode === "valor" ? (value > 0 ? formatCurrency(value) : "-") : (value || "-")}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-bold">
                    {viewMode === "valor" 
                      ? formatCurrency(bairroTotals.get(bairro) || 0)
                      : bairroTotals.get(bairro) || 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="sticky left-0 bg-muted/30 z-10 font-medium">
                  Subtotal Top 15
                </TableCell>
                {canais.map((canal) => (
                  <TableCell 
                    key={canal} 
                    className="text-center"
                    style={getFooterCellStyle(canal)}
                  >
                    {viewMode === "valor" 
                      ? formatCurrency(canalTotalsTop15.get(canal) || 0)
                      : canalTotalsTop15.get(canal) || 0}
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium bg-muted/30">
                  {viewMode === "valor" ? formatCurrency(top15Total) : top15Total}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="sticky left-0 bg-muted/50 z-10 font-bold">
                  TOTAL GERAL
                </TableCell>
                {canais.map((canal) => {
                  const { hue, sat } = getChannelColor(canal);
                  return (
                    <TableCell 
                      key={canal} 
                      className="text-center font-bold"
                      style={{
                        background: `hsl(${hue}, ${sat}%, 88%)`,
                        color: `hsl(${hue}, ${sat}%, 20%)`,
                      }}
                    >
                      {viewMode === "valor" 
                        ? formatCurrency(canalTotalsAll.get(canal) || 0)
                        : canalTotalsAll.get(canal) || 0}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right font-bold bg-muted/50">
                  {viewMode === "valor" ? formatCurrency(grandTotalAll) : grandTotalAll}
                </TableCell>
              </TableRow>
              <TableRow className="bg-primary/10 text-primary">
                <TableCell className="sticky left-0 bg-primary/10 z-10 font-medium" colSpan={canais.length + 1}>
                  Top 15 representa
                </TableCell>
                <TableCell className="text-right font-bold">
                  {top15Percentage}%
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
