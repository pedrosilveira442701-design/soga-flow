import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/ui/card";

interface FunnelChartProps {
  data: Array<{
    stage: string;
    count: number;
    conversionRate?: number;
  }>;
  title?: string;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#06b6d4", "#22c55e"];

export function FunnelChart({ data, title = "Funil de Vendas" }: FunnelChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elev2">
          <p className="text-caption font-medium">{payload[0].payload.stage}</p>
          <p className="text-body text-primary font-semibold">
            {payload[0].value} leads
          </p>
          {payload[0].payload.conversionRate && (
            <p className="text-caption text-muted-foreground">
              Taxa: {payload[0].payload.conversionRate}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6">
      <h3 className="text-h3 mb-6">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={13} tickLine={false} />
          <YAxis
            type="category"
            dataKey="stage"
            stroke="hsl(var(--muted-foreground))"
            fontSize={13}
            tickLine={false}
            width={100}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="count" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
