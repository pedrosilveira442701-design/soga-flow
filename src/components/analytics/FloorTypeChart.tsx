import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FloorTypeAnalysisData } from "@/hooks/useAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Package, DollarSign, TrendingUp } from "lucide-react";
import { FALLBACK_PALETTE } from "@/lib/channelColors";

interface FloorTypeChartProps {
  data?: FloorTypeAnalysisData[];
  isLoading?: boolean;
}

// Cores HSL fixas para tipos de piso
const TIPO_COLORS: Record<string, { hue: number; sat: number; light: number }> = {
  "Pintura Epóxi": { hue: 217, sat: 91, light: 60 },
  "Pintura PU": { hue: 262, sat: 83, light: 58 },
  "Pintura PU Quadra": { hue: 280, sat: 70, light: 55 },
  "Pintura Acrílica": { hue: 38, sat: 92, light: 50 },
  "Pintura Acrílica Quadra": { hue: 45, sat: 85, light: 50 },
  "Pintura de Parede": { hue: 28, sat: 90, light: 52 },
  "Piso Autonivelante": { hue: 330, sat: 81, light: 60 },
  "Piso Uretano": { hue: 199, sat: 85, light: 48 },
  "Uretano Vertical": { hue: 185, sat: 80, light: 42 },
  "Rodapé Abaulado": { hue: 293, sat: 69, light: 49 },
  "Concretagem": { hue: 30, sat: 20, light: 45 },
  "Porcelanato": { hue: 217, sat: 91, light: 55 },
  "Cerâmica": { hue: 262, sat: 75, light: 55 },
  "Vinílico": { hue: 330, sat: 75, light: 55 },
  "Laminado": { hue: 38, sat: 85, light: 52 },
  "Madeira": { hue: 142, sat: 71, light: 45 },
  "Não especificado": { hue: 220, sat: 12, light: 55 },
};

function getTipoColor(tipo: string, index: number = 0): { hue: number; sat: number; light: number } {
  if (TIPO_COLORS[tipo]) {
    return TIPO_COLORS[tipo];
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

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
        <div className="bg-card border border-border rounded-lg p-4 shadow-xl min-w-[180px]">
          <p className="font-semibold text-base mb-3">{data.tipo_piso}</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Volume:</span>
              <span className="font-medium">{data.volume_m2.toLocaleString("pt-BR")} m²</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Propostas:</span>
              <span className="font-medium">{data.propostas_count}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Ticket Médio:</span>
              <span className="font-medium">
                R$ {data.ticket_medio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Margem Média:</span>
              <span className="font-medium">{data.margem_media}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Valor Total:</span>
              <span className="font-medium text-green-600">
                R$ {data.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
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
              <Package className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Volume Total</p>
            </div>
            <p className="text-lg font-semibold">
              {totalVolume.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} m²
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Valor Total</p>
            </div>
            <p className="text-lg font-semibold">
              R$ {totalValor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Margem Média</p>
            </div>
            <p className="text-lg font-semibold">{avgMargem.toFixed(1)}%</p>
          </div>
        </div>

        {/* Gráfico de Barras */}
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <defs>
              {data.map((entry, index) => {
                const { hue, sat, light } = getTipoColor(entry.tipo_piso, index);
                return (
                  <linearGradient key={`gradient-tipo-${index}`} id={`gradient-tipo-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={`hsl(${hue}, ${sat}%, ${light}%)`} stopOpacity={1} />
                    <stop offset="100%" stopColor={`hsl(${hue}, ${sat}%, ${light + 12}%)`} stopOpacity={0.7} />
                  </linearGradient>
                );
              })}
              <linearGradient id="gradient-margem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="hsl(142, 71%, 55%)" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="tipo_piso"
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              yAxisId="left"
              label={{ value: "Volume (m²)", angle: -90, position: "insideLeft", fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: "Margem (%)", angle: 90, position: "insideRight", fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
            <Legend />
            <Bar yAxisId="left" dataKey="volume_m2" name="Volume (m²)" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={entry.tipo_piso} fill={`url(#gradient-tipo-${index})`} />
              ))}
            </Bar>
            <Bar
              yAxisId="right"
              dataKey="margem_media"
              name="Margem Média (%)"
              fill="url(#gradient-margem)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Insights */}
        <div className="mt-6 pt-6 border-t space-y-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm font-semibold mb-1">Tipo Mais Lucrativo:</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">{maisLucrativo.tipo_piso}</span> apresenta a maior margem média de{" "}
              <span className="font-medium text-green-600">{maisLucrativo.margem_media}%</span>. Considere focar
              esforços comerciais neste produto.
            </p>
          </div>

          {/* Tabela Detalhada */}
          <div>
            <p className="text-sm font-semibold mb-3">Mix de Produtos:</p>
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
                  {data.map((tipo, idx) => {
                    const percentualVolume = (tipo.volume_m2 / totalVolume) * 100;
                    const { hue, sat, light } = getTipoColor(tipo.tipo_piso, idx);
                    return (
                      <tr key={tipo.tipo_piso} className="border-b last:border-0">
                        <td className="py-2 flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded"
                            style={{ 
                              background: `linear-gradient(135deg, hsl(${hue}, ${sat}%, ${light}%) 0%, hsl(${hue}, ${sat}%, ${light + 10}%) 100%)` 
                            }}
                          />
                          {tipo.tipo_piso}
                        </td>
                        <td className="py-2 text-center">
                          {tipo.volume_m2.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 text-center text-muted-foreground">{percentualVolume.toFixed(1)}%</td>
                        <td className="py-2 text-right">
                          R$ {tipo.ticket_medio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 text-center">
                          <span
                            className={
                              tipo.margem_media >= avgMargem ? "text-green-600 font-medium" : "text-muted-foreground"
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
