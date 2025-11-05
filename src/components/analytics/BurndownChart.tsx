import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BurndownData } from "@/hooks/useAnalytics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { Target, TrendingUp, TrendingDown } from "lucide-react";

interface BurndownChartProps {
  data?: BurndownData[];
  isLoading?: boolean;
}

export function BurndownChart({ data, isLoading }: BurndownChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Burndown de Metas</CardTitle>
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
          <CardTitle>Burndown de Metas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma meta cadastrada ou sem dados de realização</p>
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
          <p className="font-semibold mb-2">{data.mes}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Meta:</span>{" "}
            <span className="font-medium">
              R$ {data.meta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Realizado:</span>{" "}
            <span className="font-medium">
              R$ {data.realizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Acum. Meta:</span>{" "}
            <span className="font-medium">
              R$ {data.acumulado_meta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Acum. Real:</span>{" "}
            <span className="font-medium">
              R$ {data.acumulado_realizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </p>
          <p className="text-sm mt-2">
            <span className="text-muted-foreground">Performance:</span>{" "}
            <span
              className={`font-medium ${
                data.realizado >= data.meta ? "text-green-500" : "text-destructive"
              }`}
            >
              {data.meta > 0 ? ((data.realizado / data.meta) * 100).toFixed(1) : 0}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Calcular performance total
  const totalMeta = data[data.length - 1]?.acumulado_meta || 0;
  const totalRealizado = data[data.length - 1]?.acumulado_realizado || 0;
  const performanceGeral = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0;
  const gap = totalMeta - totalRealizado;

  // Verificar tendência (últimos 3 meses)
  const ultimosMeses = data.slice(-3);
  const performancesRecentes = ultimosMeses.map((d) =>
    d.meta > 0 ? (d.realizado / d.meta) * 100 : 0
  );
  const tendenciaPositiva =
    performancesRecentes.length >= 2 &&
    performancesRecentes[performancesRecentes.length - 1] >
      performancesRecentes[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Burndown de Metas</span>
          <div className="text-right">
            <p className="text-sm font-normal text-muted-foreground">Performance Acumulada</p>
            <p
              className={`text-lg font-bold ${
                performanceGeral >= 100 ? "text-green-500" : "text-destructive"
              }`}
            >
              {performanceGeral.toFixed(1)}%
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="mes" className="text-xs" tick={{ fontSize: 11 }} />
            <YAxis
              className="text-xs"
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Área de gap entre meta e realizado */}
            <Area
              type="monotone"
              dataKey="acumulado_meta"
              fill="#3b82f620"
              stroke="none"
            />
            
            {/* Linhas */}
            <Line
              type="monotone"
              dataKey="acumulado_meta"
              name="Meta Acumulada"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="acumulado_realizado"
              name="Realizado Acumulado"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Insights e Tendências */}
        <div className="mt-4 pt-4 border-t space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            {tendenciaPositiva ? (
              <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">
                Tendência: {tendenciaPositiva ? "Positiva ↗" : "Negativa ↘"}
              </p>
              <p className="text-sm text-muted-foreground">
                {tendenciaPositiva
                  ? "Desempenho melhorando nos últimos meses. Continue focado!"
                  : "Desempenho em queda. Recomenda-se ajustar estratégia comercial."}
              </p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground">Meta Total</p>
              <p className="text-lg font-semibold text-primary">
                R$ {totalMeta.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div
              className={`text-center p-3 rounded-lg ${
                performanceGeral >= 100
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-muted/50"
              }`}
            >
              <p className="text-xs text-muted-foreground">Realizado</p>
              <p className="text-lg font-semibold">
                R$ {totalRealizado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div
              className={`text-center p-3 rounded-lg ${
                gap > 0
                  ? "bg-destructive/10 border border-destructive/20"
                  : "bg-green-500/10 border border-green-500/20"
              }`}
            >
              <p className="text-xs text-muted-foreground">
                {gap > 0 ? "Falta Atingir" : "Superou"}
              </p>
              <p
                className={`text-lg font-semibold ${
                  gap > 0 ? "text-destructive" : "text-green-500"
                }`}
              >
                R$ {Math.abs(gap).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Projeção */}
          {gap > 0 && data.length >= 3 && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm font-semibold mb-1">📈 Projeção Linear:</p>
              <p className="text-sm text-muted-foreground">
                Com base na tendência atual, você precisa de{" "}
                <span className="font-medium">
                  R${" "}
                  {(gap / (data.length || 1)).toLocaleString("pt-BR", {
                    maximumFractionDigits: 0,
                  })}
                  /mês
                </span>{" "}
                adicionais para atingir a meta.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
