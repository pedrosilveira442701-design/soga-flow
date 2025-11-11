import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PipelineData {
  name: string;
  value: number;
  count: number;
  color: string;
}

interface PipelineDistributionChartProps {
  data: PipelineData[];
}

export function PipelineDistributionChart({ data }: PipelineDistributionChartProps) {
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

  const visibleData = data.filter(item => !hiddenSeries.has(item.name));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-1">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.count} proposta{item.count !== 1 ? 's' : ''}
          </p>
          <p className="text-sm font-medium mt-1">{formatCurrency(item.value)}</p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = () => (
    <div className="flex flex-wrap gap-4 justify-center mt-4">
      {data.map((item) => (
        <div
          key={item.name}
          onClick={() => toggleSeries(item.name)}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div
            className="w-3 h-3 rounded-sm transition-all"
            style={{
              backgroundColor: hiddenSeries.has(item.name) ? 'hsl(var(--muted-foreground))' : item.color,
              opacity: hiddenSeries.has(item.name) ? 0.3 : 1,
            }}
          />
          <span className={cn(
            "text-sm transition-all",
            hiddenSeries.has(item.name) && "text-muted-foreground line-through"
          )}>
            {item.name}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="p-6 shadow-elev1">
      <h3 className="text-h3 mb-6">Distribuição do Pipeline de Propostas</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={visibleData}>
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
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {visibleData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <CustomLegend />
    </Card>
  );
}
