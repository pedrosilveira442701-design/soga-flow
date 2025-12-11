import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineData } from "@/hooks/useAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { DollarSign, TrendingUp } from "lucide-react";
import { FALLBACK_PALETTE } from "@/lib/channelColors";

interface PipelineChartProps {
  data?: PipelineData[];
  isLoading?: boolean;
}

// Cores HSL fixas para estágios do pipeline
const PIPELINE_COLORS: Record<string, { hue: number; sat: number; light: number }> = {
  "Entrou em Contato": { hue: 262, sat: 83, light: 58 },
  "Visita Agendada": { hue: 199, sat: 85, light: 48 },
  "Visita Realizada": { hue: 199, sat: 85, light: 42 },
  "Proposta Pendente": { hue: 38, sat: 92, light: 50 },
  "Gerou Proposta": { hue: 38, sat: 92, light: 55 },
  "Fechou Contrato": { hue: 142, sat: 71, light: 45 },
  "Em Execução": { hue: 330, sat: 81, light: 60 },
  "Finalizado": { hue: 142, sat: 65, light: 42 },
  "Perdido": { hue: 0, sat: 84, light: 60 },
};

function getPipelineColor(estagio: string, index: number = 0): { hue: number; sat: number; light: number } {
  if (PIPELINE_COLORS[estagio]) {
    return PIPELINE_COLORS[estagio];
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

export function PipelineChart({ data, isLoading }: PipelineChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Ponderado</CardTitle>
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
          <CardTitle>Pipeline Ponderado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sem dados disponíveis para o período selecionado</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPonderado = data.reduce((sum, d) => sum + d.valor_ponderado, 0);

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
              <span className="text-muted-foreground">Probabilidade:</span>
              <span className="font-medium">{data.probabilidade}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Valor Ponderado:</span>
              <span className="font-medium text-green-600">
                R$ {data.valor_ponderado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pipeline Ponderado</span>
          <div className="text-right">
            <p className="text-sm font-normal text-muted-foreground">Total Ponderado</p>
            <p className="text-lg font-bold text-primary">
              R$ {totalPonderado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <defs>
              {data.map((entry, index) => {
                const { hue, sat, light } = getPipelineColor(entry.estagio, index);
                return (
                  <linearGradient key={`gradient-pipeline-${index}`} id={`gradient-pipeline-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={`hsl(${hue}, ${sat}%, ${light}%)`} stopOpacity={1} />
                    <stop offset="100%" stopColor={`hsl(${hue}, ${sat}%, ${light + 12}%)`} stopOpacity={0.7} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="estagio" 
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
            />
            <YAxis 
              label={{ value: "Valor Ponderado (R$)", angle: -90, position: "insideLeft", fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickLine={false}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
            <Legend />
            <Bar 
              dataKey="valor_ponderado" 
              name="Valor Ponderado"
              radius={[6, 6, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#gradient-pipeline-${index})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Insights */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Distribuição por Estágio:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.map((stage, idx) => {
              const { hue, sat, light } = getPipelineColor(stage.estagio, idx);
              return (
                <div 
                  key={stage.estagio} 
                  className="p-3 rounded-lg border"
                  style={{ 
                    background: `hsla(${hue}, ${sat}%, ${light}%, 0.1)`,
                    borderColor: `hsla(${hue}, ${sat}%, ${light}%, 0.3)`,
                  }}
                >
                  <p className="text-xs text-muted-foreground">{stage.estagio}</p>
                  <p className="text-sm font-semibold">
                    {stage.count} leads ({stage.probabilidade}%)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    R$ {stage.valor_ponderado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
