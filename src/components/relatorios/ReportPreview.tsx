import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { TableIcon, TrendingUp, BarChart3, Download } from "lucide-react";

interface ReportPreviewProps {
  data: any[] | null;
  totals: Record<string, number> | null;
  isLoading: boolean;
}

export function ReportPreview({ data, totals, isLoading }: ReportPreviewProps) {
  const formatValue = (value: any, key: string): string => {
    if (value === null || value === undefined) return "-";
    
    // Currency fields
    if (["valor_total", "valor_liquido", "valor", "valor_bruto", "desconto", "valor_potencial", "valor_total_contratos"].includes(key)) {
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
    if (key.includes("created_at") || key.includes("periodo_dia") || key.includes("data_pagamento") || key.includes("vencimento")) {
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

  const formatColumnName = (col: string): string => {
    const labelMap: Record<string, string> = {
      cliente: "Cliente",
      status: "Status",
      servico: "Serviço",
      canal: "Canal",
      cidade: "Cidade",
      bairro: "Bairro",
      m2: "M²",
      valor_total: "Valor Total",
      valor_liquido: "Valor Líquido",
      valor_bruto: "Valor Bruto",
      margem_pct: "Margem %",
      desconto: "Desconto",
      dias_aberta: "Dias Aberta",
      forma_pagamento: "Forma Pgto",
      periodo_mes: "Mês",
      periodo_dia: "Data",
      created_at: "Criado em",
      numero_parcela: "Parcela",
      valor: "Valor Líquido",
      forma: "Forma",
      data_pagamento: "Pago em",
      dias_atraso: "Dias Atraso",
      estagio: "Estágio",
      valor_potencial: "Valor Pot.",
      dias_no_funil: "Dias Funil",
      first_response_minutes: "Min. Resp.",
      responsavel: "Responsável",
      motivo_perda: "Motivo Perda",
      realizada: "Realizada",
      progresso_pct: "Progresso",
      responsavel_obra: "Resp. Obra",
      total_propostas: "Propostas",
      total_contratos: "Contratos",
      valor_total_contratos: "Valor Contratos",
    };
    return labelMap[col] || col.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-border/50 border-dashed">
        <CardContent className="py-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-muted/50">
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Nenhum dado para visualizar</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Configure os parâmetros acima e clique em "Visualizar Prévia" para carregar os dados do relatório
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const columns = Object.keys(data[0]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TableIcon className="h-5 w-5 text-primary" />
            Prévia do Relatório
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {columns.length} colunas
            </Badge>
            <Badge variant="secondary" className="text-xs font-medium">
              {totals?.count || data.length} registros
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Totals Summary */}
        {totals && Object.keys(totals).length > 1 && (
          <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 mr-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Totais:</span>
            </div>
            {totals.valor_bruto !== undefined && (
              <Badge variant="outline" className="text-xs font-mono">
                Valor Bruto: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.valor_bruto)}
              </Badge>
            )}
            {totals.valor_total !== undefined && (
              <Badge variant="outline" className="text-xs font-mono">
                Valor Total: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.valor_total)}
              </Badge>
            )}
            {totals.valor_liquido !== undefined && (
              <Badge variant="outline" className="text-xs font-mono">
                Líquido: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.valor_liquido)}
              </Badge>
            )}
            {totals.valor !== undefined && (
              <Badge variant="outline" className="text-xs font-mono">
                Valor: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.valor)}
              </Badge>
            )}
            {totals.m2 !== undefined && (
              <Badge variant="outline" className="text-xs font-mono">
                M² Total: {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(totals.m2)}
              </Badge>
            )}
          </div>
        )}

        {/* Data Table */}
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <ScrollArea className="h-[450px]">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                <TableRow className="hover:bg-transparent">
                  {columns.slice(0, 12).map((col) => (
                    <TableHead 
                      key={col} 
                      className="text-xs font-semibold whitespace-nowrap py-3 px-4 text-foreground"
                    >
                      {formatColumnName(col)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 100).map((row, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    {columns.slice(0, 12).map((col) => (
                      <TableCell key={col} className="text-sm whitespace-nowrap py-3 px-4">
                        {formatValue(row[col], col)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>
            {columns.length > 12 && `Mostrando 12 de ${columns.length} colunas • `}
            {data.length > 100 
              ? `Mostrando 100 de ${data.length} registros`
              : `${data.length} registro(s)`
            }
          </span>
          {data.length > 100 && (
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              Exporte para ver todos os dados
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}