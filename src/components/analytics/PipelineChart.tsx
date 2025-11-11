import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineData } from "@/hooks/useAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { DollarSign, TrendingUp } from "lucide-react";

interface PipelineChartProps {
  data?: PipelineData[];
  isLoading?: boolean;
}

const COLORS = {
  "Entrou em Contato": "#8b5cf6",
  "Visita Agendada": "#8b5cf6",
  "Visita Realizada": "#8b5cf6",
  "Proposta Pendente": "#f59e0b",
  "Gerou Proposta": "#f59e0b",
  "Fechou Contrato": "#10b981",
  "Em Execução": "#ec4899",
  "Finalizado": "#10b981",
  "Perdido": "#ef4444",
};

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
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{data.estagio}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Leads:</span>{" "}
            <span className="font-medium">{data.count}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Probabilidade:</span>{" "}
            <span className="font-medium">{data.probabilidade}%</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Valor Ponderado:</span>{" "}
            <span className="font-medium">
              R$ {data.valor_ponderado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </p>
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
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="estagio" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              label={{ value: "Valor Ponderado (R$)", angle: -90, position: "insideLeft" }}
              className="text-xs"
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="valor_ponderado" 
              name="Valor Ponderado"
              radius={[8, 8, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.estagio as keyof typeof COLORS] || "#94a3b8"} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Insights */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Distribuição por Estágio:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.map((stage) => (
              <div 
                key={stage.estagio} 
                className="p-3 rounded-lg bg-muted/50 border"
              >
                <p className="text-xs text-muted-foreground">{stage.estagio}</p>
                <p className="text-sm font-semibold">
                  {stage.count} leads ({stage.probabilidade}%)
                </p>
                <p className="text-xs text-muted-foreground">
                  R$ {stage.valor_ponderado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
