import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { useState } from "react";

interface TimelineChartProps {
  data: Array<{
    name: string;
    bruto: number;
    custo: number;
    liquido: number;
  }>;
  title?: string;
}

export function TimelineChart({ data, title = "Linha do Tempo Financeira" }: TimelineChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const toggleSeries = (seriesName: string) => {
    setHiddenSeries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seriesName)) {
        newSet.delete(seriesName);
      } else {
        newSet.add(seriesName);
      }
      return newSet;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="p-6">
      <h3 className="text-h3 mb-6">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={13}
            tickLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={13}
            tickLine={false}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              padding: "12px",
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend
            onClick={(e) => toggleSeries(e.dataKey as string)}
            wrapperStyle={{ cursor: "pointer" }}
          />
          {!hiddenSeries.has("bruto") && (
            <Line
              type="monotone"
              dataKey="bruto"
              stroke="#2E90FA"
              strokeWidth={2}
              name="Bruto"
              dot={{ fill: "#2E90FA", r: 4 }}
            />
          )}
          {!hiddenSeries.has("custo") && (
            <Line
              type="monotone"
              dataKey="custo"
              stroke="#9CA3AF"
              strokeWidth={2}
              name="Custo"
              dot={{ fill: "#9CA3AF", r: 4 }}
            />
          )}
          {!hiddenSeries.has("liquido") && (
            <Line
              type="monotone"
              dataKey="liquido"
              stroke="#12B76A"
              strokeWidth={2}
              name="Líquido"
              dot={{ fill: "#12B76A", r: 4 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
