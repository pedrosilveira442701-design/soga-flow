import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FunnelStageData } from "@/hooks/useAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { TrendingDown, Clock } from "lucide-react";
import { FALLBACK_PALETTE } from "@/lib/channelColors";

interface FunnelChartProps {
  data?: FunnelStageData[];
  isLoading?: boolean;
}

// Cores HSL fixas para estágios do funil
const STAGE_COLORS: Record<string, { hue: number; sat: number; light: number }> = {
  "Novo": { hue: 217, sat: 91, light: 60 },
  "Contato": { hue: 262, sat: 83, light: 58 },
  "Negociação": { hue: 330, sat: 81, light: 60 },
  "Proposta Enviada": { hue: 38, sat: 92, light: 50 },
  "Fechado": { hue: 142, sat: 71, light: 45 },
  "Perdido": { hue: 0, sat: 84, light: 60 },
};

function getStageColor(estagio: string, index: number = 0): { hue: number; sat: number; light: number } {
  if (STAGE_COLORS[estagio]) {
    return STAGE_COLORS[estagio];
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

export function FunnelChart({ data, isLoading }: FunnelChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
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
          <CardTitle>Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sem dados disponíveis para o período selecionado</p>
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
          <p className="font-semibold text-base mb-3">{data.estagio}</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Leads:</span>
              <span className="font-medium">{data.count}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Taxa:</span>
              <span className="font-medium">{data.taxa_conversao}%</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Tempo médio:
              </span>
              <span className="font-medium">{data.tempo_medio_dias} dias</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Identificar gargalos (estágios com tempo acima da média)
  const avgTime = data.reduce((sum, s) => sum + s.tempo_medio_dias, 0) / data.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Funil de Conversão</span>
          <span className="text-sm font-normal text-muted-foreground">
            Taxa de conversão e tempo médio por etapa
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <defs>
              {data.map((entry, index) => {
                const { hue, sat, light } = getStageColor(entry.estagio, index);
                return (
                  <linearGradient key={`gradient-funnel-${index}`} id={`gradient-funnel-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={`hsl(${hue}, ${sat}%, ${light}%)`} stopOpacity={1} />
                    <stop offset="100%" stopColor={`hsl(${hue}, ${sat}%, ${light + 10}%)`} stopOpacity={0.7} />
                  </linearGradient>
                );
              })}
              <linearGradient id="gradient-time" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="hsl(38, 92%, 60%)" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="estagio" 
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
            />
            <YAxis 
              yAxisId="left"
              label={{ value: "Número de Leads", angle: -90, position: "insideLeft", fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              label={{ value: "Dias", angle: 90, position: "insideRight", fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
            <Legend />
            <Bar 
              yAxisId="left"
              dataKey="count" 
              name="Leads"
              radius={[6, 6, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#gradient-funnel-${index})`}
                />
              ))}
            </Bar>
            <Bar 
              yAxisId="right"
              dataKey="tempo_medio_dias" 
              name="Tempo Médio (dias)"
              fill="url(#gradient-time)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Insights de Gargalos */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-semibold mb-2">Insights de Gargalos:</p>
          <div className="space-y-1">
            {data
              .filter((stage) => stage.tempo_medio_dias > avgTime)
              .map((stage) => (
                <p key={stage.estagio} className="text-sm text-muted-foreground">
                  • <span className="font-medium">{stage.estagio}</span>: {stage.tempo_medio_dias} dias 
                  (acima da média de {avgTime.toFixed(1)} dias)
                </p>
              ))}
            {data.filter((stage) => stage.tempo_medio_dias > avgTime).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum gargalo identificado - todos os estágios estão dentro da média!
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
