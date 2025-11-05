import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WaterfallData } from "@/hooks/useAnalytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { TrendingDown, AlertCircle } from "lucide-react";

interface WaterfallChartProps {
  data?: WaterfallData[];
  isLoading?: boolean;
}

export function WaterfallChart({ data, isLoading }: WaterfallChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Waterfall de Margem</CardTitle>
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
          <CardTitle>Waterfall de Margem</CardTitle>
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

  // Preparar dados para waterfall com posições corretas
  const waterfallData = data.map((item, index) => {
    let start = 0;
    if (index > 0) {
      start = data
        .slice(0, index)
        .reduce((sum, prev) => sum + prev.value, 0);
    }

    return {
      ...item,
      start: item.value < 0 ? start + item.value : start,
      end: item.value < 0 ? start : start + item.value,
      displayValue: Math.abs(item.value),
    };
  });

  const maxValue = Math.max(...waterfallData.map((d) => d.end));
  const minValue = Math.min(...waterfallData.map((d) => d.start));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{data.name}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Valor:</span>{" "}
            <span className="font-medium">
              R$ {Math.abs(data.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  const getBarColor = (type: string) => {
    switch (type) {
      case "increase":
        return "#10b981";
      case "decrease":
        return "#ef4444";
      case "total":
        return "#3b82f6";
      default:
        return "#94a3b8";
    }
  };

  // Calcular margem líquida percentual
  const valorBruto = data[0]?.value || 0;
  const valorLiquido = data[data.length - 1]?.value || 0;
  const margemPercentual = valorBruto > 0 ? (valorLiquido / valorBruto) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Waterfall de Margem</span>
          <div className="text-right">
            <p className="text-sm font-normal text-muted-foreground">Margem Líquida</p>
            <p className="text-lg font-bold text-primary">{margemPercentual.toFixed(1)}%</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={waterfallData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[minValue * 1.1, maxValue * 1.1]}
              className="text-xs"
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
            
            {/* Barras invisíveis para criar o efeito cascata */}
            <Bar dataKey="start" stackId="stack" fill="transparent" />
            
            {/* Barras visíveis */}
            <Bar dataKey="displayValue" stackId="stack" radius={[4, 4, 0, 0]}>
              {waterfallData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.type)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Insights */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-semibold mb-3">💰 Análise de Vazamentos:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data
              .filter((item) => item.type === "decrease")
              .map((item) => {
                const percentual = valorBruto > 0 ? (Math.abs(item.value) / valorBruto) * 100 : 0;
                return (
                  <div
                    key={item.name}
                    className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {Math.abs(item.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          {" "}({percentual.toFixed(1)}% do bruto)
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Resumo */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Valor Bruto</p>
              <p className="text-lg font-semibold">
                R$ {valorBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <p className="text-xs text-muted-foreground">Reduções</p>
              <p className="text-lg font-semibold text-destructive">
                -R$ {(valorBruto - valorLiquido).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <p className="text-xs text-muted-foreground">Valor Líquido</p>
              <p className="text-lg font-semibold text-primary">
                R$ {valorLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
