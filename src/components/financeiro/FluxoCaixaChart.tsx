import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

interface FluxoCaixaChartProps {
  data: Array<{
    mes: string;
    recebido: number;
    previsto: number;
    atrasado: number;
  }>;
  isLoading?: boolean;
}

export function FluxoCaixaChart({ data, isLoading }: FluxoCaixaChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatMonth = (mes: string) => {
    const [ano, mesNum] = mes.split("-");
    const meses = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    return `${meses[parseInt(mesNum) - 1]}/${ano.slice(2)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Fluxo de Caixa (12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Fluxo de Caixa (12 meses)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="mes"
              tickFormatter={formatMonth}
              className="text-xs"
            />
            <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={formatMonth}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Legend />
            <Bar
              dataKey="recebido"
              name="Recebido"
              fill="hsl(var(--chart-2))"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="previsto"
              name="Previsto"
              fill="hsl(var(--chart-1))"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="atrasado"
              name="Atrasado"
              fill="hsl(var(--destructive))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
