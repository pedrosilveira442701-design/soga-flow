import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { TableIcon, TrendingUp } from "lucide-react";

interface ReportPreviewProps {
  data: any[] | null;
  totals: Record<string, number> | null;
  isLoading: boolean;
}

export function ReportPreview({ data, totals, isLoading }: ReportPreviewProps) {
  const formatValue = (value: any, key: string): string => {
    if (value === null || value === undefined) return "-";
    
    // Currency fields
    if (["valor_total", "valor_liquido", "valor", "desconto", "valor_potencial", "valor_total_contratos"].includes(key)) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
    }
    
    // Percentage fields
    if (["margem_pct", "progresso_pct"].includes(key)) {
      return `${Number(value).toFixed(1)}%`;
    }
    
    // Boolean
    if (typeof value === "boolean") {
      return value ? "Sim" : "Não";
    }
    
    // Date fields
    if (key.includes("created_at") || key.includes("periodo_dia") || key.includes("data_pagamento")) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return new Intl.DateTimeFormat("pt-BR").format(date);
        }
      } catch {
        // Fall through
      }
    }
    
    // Numbers
    if (typeof value === "number") {
      return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
    }
    
    return String(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TableIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Clique em "Visualizar Prévia" para carregar os dados</p>
        </CardContent>
      </Card>
    );
  }

  const columns = Object.keys(data[0]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TableIcon className="h-5 w-5" />
          Prévia do Relatório
        </CardTitle>
        <Badge variant="secondary">{totals?.count || data.length} registros</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Totals Summary */}
        {totals && Object.keys(totals).length > 1 && (
          <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Resumo:</span>
            </div>
            {totals.valor_total !== undefined && (
              <Badge variant="outline" className="text-sm">
                Valor Total: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.valor_total)}
              </Badge>
            )}
            {totals.valor_liquido !== undefined && (
              <Badge variant="outline" className="text-sm">
                Valor Líquido: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.valor_liquido)}
              </Badge>
            )}
            {totals.valor !== undefined && (
              <Badge variant="outline" className="text-sm">
                Valor: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.valor)}
              </Badge>
            )}
            {totals.m2 !== undefined && (
              <Badge variant="outline" className="text-sm">
                M² Total: {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(totals.m2)}
              </Badge>
            )}
          </div>
        )}

        {/* Data Table */}
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.slice(0, 10).map((col) => (
                  <TableHead key={col} className="text-xs font-medium whitespace-nowrap">
                    {col.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 100).map((row, i) => (
                <TableRow key={i}>
                  {columns.slice(0, 10).map((col) => (
                    <TableCell key={col} className="text-sm whitespace-nowrap">
                      {formatValue(row[col], col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {data.length > 100 && (
          <p className="text-xs text-muted-foreground text-center">
            Mostrando 100 de {data.length} registros. Exporte para ver todos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
