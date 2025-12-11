import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import type { BairroChannelData } from "@/hooks/useChannelAnalytics";
import { getChannelColor, FALLBACK_PALETTE } from "@/lib/channelColors";

interface ChannelBairroTableProps {
  data?: BairroChannelData[];
  isLoading: boolean;
}

type ViewMode = "leads" | "propostas" | "fechados" | "valor";

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


  // Calcular max global para escala de cores única
  const globalMax = Math.max(
    ...data.map((d) =>
      viewMode === "leads" ? d.leads
        : viewMode === "propostas" ? d.propostas
        : viewMode === "fechados" ? d.fechados
        : d.valor_fechados
    )
  );

  // Criar mapa de índices para canais (garante cores únicas mesmo com fallback)
  const canalIndexMap = new Map<string, number>();
  canais.forEach((canal, idx) => canalIndexMap.set(canal, idx));

  const getCellStyle = (value: number, canal: string) => {
    if (globalMax === 0 || value === 0) return {};
    
    const idx = canalIndexMap.get(canal) ?? 0;
    const { hue, sat } = getChannelColor(canal, idx);
    const intensity = value / globalMax;
    
    // Borda esquerda colorida pelo canal + fundo com intensidade sutil
    const bgAlpha = 0.06 + (intensity * 0.22); // 6% a 28%
    
    return {
      borderLeft: `3px solid hsl(${hue}, ${sat}%, 48%)`,
      background: `hsla(${hue}, ${sat}%, 50%, ${bgAlpha})`,
      fontWeight: intensity > 0.5 ? 600 : 400,
    };
  };

  // Estilo minimalista para tag de cabeçalho do canal
  const getHeaderTagStyle = (canal: string): React.CSSProperties => {
    const idx = canalIndexMap.get(canal) ?? 0;
    const { hue, sat, light } = getChannelColor(canal, idx);
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '28px',
      padding: '0 10px',
      borderRadius: '4px',
      background: `hsla(${hue}, ${sat}%, ${light}%, 0.15)`,
      color: `hsl(${hue}, ${sat}%, ${Math.max(light - 10, 30)}%)`,
      fontSize: '13px',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      transition: 'background 0.15s ease',
    };
  };

  const getFooterCellStyle = (canal: string) => {
    const idx = canalIndexMap.get(canal) ?? 0;
    const { hue, sat } = getChannelColor(canal, idx);
    return {
      borderLeft: `3px solid hsl(${hue}, ${sat}%, 45%)`,
      background: `hsla(${hue}, ${sat}%, 50%, 0.15)`,
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
                    className="text-center min-w-[100px] p-2"
                  >
                    <span 
                      style={getHeaderTagStyle(canal)}
                      className="hover:opacity-85"
                    >
                      {canal}
                    </span>
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
