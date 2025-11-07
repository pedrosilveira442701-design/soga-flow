import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";

interface RecebimentosTendenciaData {
  mes: string;
  valor: number;
  isAtual: boolean;
}

interface RecebimentosTendenciaChartProps {
  data: RecebimentosTendenciaData[];
}

export function RecebimentosTendenciaChart({ data }: RecebimentosTendenciaChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elev2">
          <p className="text-caption text-muted-foreground mb-1">{data.mes}</p>
          <p className="text-body font-semibold text-foreground">
            {formatCurrency(data.valor)}
          </p>
          {data.isAtual && (
            <p className="text-[11px] text-primary font-medium mt-1">
              Período Atual
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Encontrar o ponto atual para destacar
  const pontoAtual = data.find((d) => d.isAtual);

  return (
    <Card className="shadow-elev1">
      <CardHeader>
        <CardTitle className="text-h3">Tendência de Recebimentos</CardTitle>
        <p className="text-caption text-muted-foreground mt-1">
          Evolução dos últimos 12 meses
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
            <XAxis
              dataKey="mes"
              className="text-caption"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              className="text-caption"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="valor"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.isAtual) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  );
                }
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--background))"
                    strokeWidth={1}
                  />
                );
              }}
              activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
