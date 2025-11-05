import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FunnelStageData } from "@/hooks/useAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { TrendingDown, Clock } from "lucide-react";

interface FunnelChartProps {
  data?: FunnelStageData[];
  isLoading?: boolean;
}

const COLORS = {
  Novo: "#3b82f6",
  Contato: "#8b5cf6",
  Negociação: "#ec4899",
  "Proposta Enviada": "#f59e0b",
  Fechado: "#10b981",
  Perdido: "#ef4444",
};

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
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{data.estagio}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Leads:</span>{" "}
            <span className="font-medium">{data.count}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Taxa:</span>{" "}
            <span className="font-medium">{data.taxa_conversao}%</span>
          </p>
          <p className="text-sm flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Tempo médio:</span>{" "}
            <span className="font-medium">{data.tempo_medio_dias} dias</span>
          </p>
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
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="estagio" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              yAxisId="left"
              label={{ value: "Número de Leads", angle: -90, position: "insideLeft" }}
              className="text-xs"
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              label={{ value: "Dias", angle: 90, position: "insideRight" }}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              yAxisId="left"
              dataKey="count" 
              name="Leads"
              radius={[8, 8, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.estagio as keyof typeof COLORS] || "#94a3b8"} 
                />
              ))}
            </Bar>
            <Bar 
              yAxisId="right"
              dataKey="tempo_medio_dias" 
              name="Tempo Médio (dias)"
              fill="#f59e0b"
              radius={[8, 8, 0, 0]}
              opacity={0.6}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Insights de Gargalos */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-semibold mb-2">🔍 Insights de Gargalos:</p>
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
