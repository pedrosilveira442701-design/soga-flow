import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import type { BairroChannelData } from "@/hooks/useChannelAnalytics";

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

  // Calcular max para escala de cores
  const maxValue = Math.max(
    ...data.map((d) => 
      viewMode === "leads" ? d.leads
        : viewMode === "propostas" ? d.propostas
        : viewMode === "fechados" ? d.fechados
        : d.valor_fechados
    )
  );

  const getCellStyle = (value: number) => {
    if (maxValue === 0 || value === 0) return {};
    const intensity = value / maxValue;
    const alpha = Math.max(0.1, intensity * 0.5);
    return {
      backgroundColor: `hsla(var(--primary), ${alpha})`,
    };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Canal x Bairros (Top 15)</CardTitle>
        <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
          <ToggleGroupItem value="leads" size="sm">Leads</ToggleGroupItem>
          <ToggleGroupItem value="propostas" size="sm">Propostas</ToggleGroupItem>
          <ToggleGroupItem value="fechados" size="sm">Fechados</ToggleGroupItem>
          <ToggleGroupItem value="valor" size="sm">Valor</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card">Bairro</TableHead>
                {canais.map((canal) => (
                  <TableHead key={canal} className="text-center min-w-[80px]">
                    {canal}
                  </TableHead>
                ))}
                <TableHead className="text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBairros.map((bairro) => (
                <TableRow key={bairro}>
                  <TableCell className="sticky left-0 bg-card font-medium">
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
                        style={getCellStyle(value)}
                      >
                        {viewMode === "valor" ? formatCurrency(value) : value || "-"}
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
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
