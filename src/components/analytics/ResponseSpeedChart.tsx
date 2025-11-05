import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponseSpeedData } from "@/hooks/useAnalytics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Clock, TrendingDown } from "lucide-react";

interface ResponseSpeedChartProps {
  data?: ResponseSpeedData[];
  isLoading?: boolean;
}

export function ResponseSpeedChart({ data, isLoading }: ResponseSpeedChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Velocidade de Resposta vs Taxa de Conversão</CardTitle>
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
          <CardTitle>Velocidade de Resposta vs Taxa de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sem dados de tempo de resposta no período selecionado</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const label = data.tempo_resposta_horas < 24
        ? `${data.tempo_resposta_horas.toFixed(1)}h`
        : `${(data.tempo_resposta_horas / 24).toFixed(1)} dias`;

      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">Tempo de Resposta: {label}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Taxa de Conversão:</span>{" "}
            <span className="font-medium">{data.taxa_conversao}%</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Leads:</span>{" "}
            <span className="font-medium">{data.leads_count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Calcular insights
  const bestPerformance = [...data].sort((a, b) => b.taxa_conversao - a.taxa_conversao)[0];
  const avgConversao = data.reduce((sum, d) => sum + d.taxa_conversao, 0) / data.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Velocidade de Resposta vs Taxa de Conversão</span>
          <div className="text-right">
            <p className="text-sm font-normal text-muted-foreground">Taxa Média</p>
            <p className="text-lg font-bold text-primary">{avgConversao.toFixed(1)}%</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="tempo_resposta_horas"
              className="text-xs"
              label={{ value: "Tempo de Resposta (horas)", position: "insideBottom", offset: -5 }}
              tickFormatter={(value) => {
                if (value < 24) return `${value}h`;
                return `${(value / 24).toFixed(0)}d`;
              }}
            />
            <YAxis
              className="text-xs"
              label={{ value: "Taxa de Conversão (%)", angle: -90, position: "insideLeft" }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={avgConversao} stroke="#94a3b8" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="taxa_conversao"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: "#3b82f6", r: 6 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Insights */}
        <div className="mt-4 pt-4 border-t space-y-3">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-3">
              <TrendingDown className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold mb-1">🎯 Melhor Performance</p>
                <p className="text-sm text-muted-foreground">
                  Leads respondidos em{" "}
                  <span className="font-medium">
                    {bestPerformance.tempo_resposta_horas < 24
                      ? `${bestPerformance.tempo_resposta_horas.toFixed(1)} horas`
                      : `${(bestPerformance.tempo_resposta_horas / 24).toFixed(1)} dias`}
                  </span>{" "}
                  têm taxa de conversão de{" "}
                  <span className="font-medium text-green-500">{bestPerformance.taxa_conversao}%</span>
                </p>
              </div>
            </div>
          </div>

          {/* Recomendação de SLA */}
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm font-semibold mb-1">📋 SLA Comercial Recomendado:</p>
            <p className="text-sm text-muted-foreground">
              Para maximizar conversão, estabeleça meta de resposta em até{" "}
              <span className="font-medium">
                {bestPerformance.tempo_resposta_horas < 24
                  ? `${Math.ceil(bestPerformance.tempo_resposta_horas)} horas`
                  : `${Math.ceil(bestPerformance.tempo_resposta_horas / 24)} dias`}
              </span>
              . Leads respondidos mais rapidamente têm{" "}
              <span className="font-medium">
                {(bestPerformance.taxa_conversao - avgConversao).toFixed(1)}%
              </span>{" "}
              a mais de chance de conversão.
            </p>
          </div>

          {/* Distribuição */}
          <div>
            <p className="text-sm font-semibold mb-2">⏱️ Distribuição de Tempo:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {data.map((item) => {
                const label = item.tempo_resposta_horas < 24
                  ? `${item.tempo_resposta_horas.toFixed(1)}h`
                  : `${(item.tempo_resposta_horas / 24).toFixed(1)}d`;

                return (
                  <div
                    key={item.tempo_resposta_horas}
                    className="p-3 rounded-lg border bg-muted/30"
                  >
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className="text-lg font-semibold">{item.taxa_conversao}%</p>
                    <p className="text-xs text-muted-foreground">{item.leads_count} leads</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
