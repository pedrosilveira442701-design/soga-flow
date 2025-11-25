import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FloorTypeAnalysisData } from "@/hooks/useAnalytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Package, DollarSign, TrendingUp } from "lucide-react";

interface FloorTypeChartProps {
  data?: FloorTypeAnalysisData[];
  isLoading?: boolean;
}

const TIPO_COLORS: Record<string, string> = {
  "Pintura Epóxi": "#3B82F6",
  "Pintura PU": "#8B5CF6",
  "Pintura PU Quadra": "#8B5CF6",
  "Pintura Acrílica": "#F59E0B",
  "Pintura Acrílica Quadra": "#F59E0B",
  "Pintura de Parede": "#F59E0B",
  "Piso Autonivelante": "#EC4899",
  "Rodapé Abaulado": "#D946EF",
  "Concretagem": "#78716C",
  "Porcelanato": "#3b82f6",
  "Cerâmica": "#8b5cf6",
  "Vinílico": "#ec4899",
  "Laminado": "#f59e0b",
  "Madeira": "#10b981",
  "Não especificado": "#94a3b8",
};

export function FloorTypeChart({ data, isLoading }: FloorTypeChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise por Tipos de Piso</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise por Tipos de Piso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sem dados de tipos de piso no período selecionado</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{data.tipo_piso}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Volume:</span>{" "}
            <span className="font-medium">{data.volume_m2.toLocaleString("pt-BR")} m²</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Propostas:</span>{" "}
            <span className="font-medium">{data.propostas_count}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Ticket Médio:</span>{" "}
            <span className="font-medium">
              R$ {data.ticket_medio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Margem Média:</span>{" "}
            <span className="font-medium">{data.margem_media}%</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Valor Total:</span>{" "}
            <span className="font-medium">
              R$ {data.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Calcular totais
  const totalVolume = data.reduce((sum, d) => sum + d.volume_m2, 0);
  const totalValor = data.reduce((sum, d) => sum + d.valor_total, 0);
  const avgMargem = data.reduce((sum, d) => sum + d.margem_media, 0) / data.length;

  // Identificar tipo mais lucrativo
  const maisLucrativo = [...data].sort((a, b) => b.margem_media - a.margem_media)[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise por Tipos de Piso</CardTitle>
      </CardHeader>
      <CardContent>
        {/* KPIs Overview */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Volume Total</p>
            </div>
            <p className="text-lg font-semibold">
              {totalVolume.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} m²
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Valor Total</p>
            </div>
            <p className="text-lg font-semibold">
              R$ {totalValor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Margem Média</p>
            </div>
            <p className="text-lg font-semibold">{avgMargem.toFixed(1)}%</p>
          </div>
        </div>

        {/* Gráfico de Barras */}
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="tipo_piso"
              className="text-xs"
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              yAxisId="left"
              className="text-xs"
              label={{ value: "Volume (m²)", angle: -90, position: "insideLeft" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              className="text-xs"
              label={{ value: "Margem (%)", angle: 90, position: "insideRight" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar yAxisId="left" dataKey="volume_m2" name="Volume (m²)" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.tipo_piso} fill={TIPO_COLORS[entry.tipo_piso] || "#94a3b8"} />
              ))}
            </Bar>
            <Bar
              yAxisId="right"
              dataKey="margem_media"
              name="Margem Média (%)"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              opacity={0.6}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Insights */}
        <div className="mt-6 pt-6 border-t space-y-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm font-semibold mb-1">🏆 Tipo Mais Lucrativo:</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">{maisLucrativo.tipo_piso}</span> apresenta a maior
              margem média de <span className="font-medium text-green-500">{maisLucrativo.margem_media}%</span>.
              Considere focar esforços comerciais neste produto.
            </p>
          </div>

          {/* Tabela Detalhada */}
          <div>
            <p className="text-sm font-semibold mb-3">📊 Mix de Produtos:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-semibold">Tipo</th>
                    <th className="pb-2 font-semibold text-center">Volume (m²)</th>
                    <th className="pb-2 font-semibold text-center">% do Total</th>
                    <th className="pb-2 font-semibold text-right">Ticket Médio</th>
                    <th className="pb-2 font-semibold text-center">Margem %</th>
                    <th className="pb-2 font-semibold text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((tipo) => {
                    const percentualVolume = (tipo.volume_m2 / totalVolume) * 100;
                    return (
                      <tr key={tipo.tipo_piso} className="border-b last:border-0">
                        <td className="py-2 flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: TIPO_COLORS[tipo.tipo_piso] || "#94a3b8" }}
                          />
                          {tipo.tipo_piso}
                        </td>
                        <td className="py-2 text-center">
                          {tipo.volume_m2.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 text-center text-muted-foreground">
                          {percentualVolume.toFixed(1)}%
                        </td>
                        <td className="py-2 text-right">
                          R$ {tipo.ticket_medio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 text-center">
                          <span
                            className={
                              tipo.margem_media >= avgMargem
                                ? "text-green-500 font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {tipo.margem_media}%
                          </span>
                        </td>
                        <td className="py-2 text-right font-medium">
                          R$ {tipo.valor_total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
