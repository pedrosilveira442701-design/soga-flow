import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend } from "recharts";
import type { ChannelMetrics } from "@/hooks/useChannelAnalytics";

interface ChannelPerformanceTableProps {
  data?: ChannelMetrics[];
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes("Taxa") ? formatPercent(entry.value) : formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ChannelPerformanceTable({ data, isLoading }: ChannelPerformanceTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Canal</CardTitle>
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
          <CardTitle>Desempenho por Canal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum dado disponível para o período selecionado
          </p>
        </CardContent>
      </Card>
    );
  }

  // Preparar dados para o gráfico
  const chartData = data.slice(0, 8).map((ch) => ({
    canal: ch.canal,
    "Valor Fechado": ch.valor_fechados,
    "Taxa Conversão": ch.taxa_proposta_fechado,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Desempenho por Canal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gráfico */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="canal" 
                tick={{ fontSize: 12 }} 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }} 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }} 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="Valor Fechado" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
              <Line 
                yAxisId="right"
                type="monotone"
                dataKey="Taxa Conversão" 
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canal</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Propostas</TableHead>
                <TableHead className="text-right">Fechados</TableHead>
                <TableHead className="text-right">Valor Propostas</TableHead>
                <TableHead className="text-right">Valor Fechado</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead className="text-right">Lead→Prop</TableHead>
                <TableHead className="text-right">Prop→Fech</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.canal}>
                  <TableCell className="font-medium">
                    <Badge variant="outline">{row.canal}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{row.leads}</TableCell>
                  <TableCell className="text-right">{row.propostas}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">{row.fechados}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.valor_propostas)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(row.valor_fechados)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.ticket_medio)}</TableCell>
                  <TableCell className="text-right">
                    <span className={row.taxa_lead_proposta >= 30 ? "text-green-600" : "text-muted-foreground"}>
                      {formatPercent(row.taxa_lead_proposta)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={row.taxa_proposta_fechado >= 20 ? "text-green-600" : "text-muted-foreground"}>
                      {formatPercent(row.taxa_proposta_fechado)}
                    </span>
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
