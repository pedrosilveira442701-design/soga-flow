import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ChannelDayData } from "@/hooks/useChannelAnalytics";
import { getChannelColor, FALLBACK_PALETTE } from "@/lib/channelColors";

interface ChannelDayChartProps {
  data?: ChannelDayData[];
  isLoading: boolean;
}

function getChannelColorHSL(canal: string, index: number = 0): string {
  const { hue, sat, light } = getChannelColor(canal, index);
  return `${hue} ${sat}% ${light}%`;
}

function getGradientId(canal: string): string {
  return `gradient-day-${canal.replace(/\s+/g, '-').toLowerCase()}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value} leads
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ChannelDayChart({ data, isLoading }: ChannelDayChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Canal x Dia da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Canal x Dia da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum dado disponível para o período selecionado
          </p>
        </CardContent>
      </Card>
    );
  }

  // Extrair todos os canais únicos
  const canais = new Set<string>();
  data.forEach((d) => {
    Object.keys(d).forEach((key) => {
      if (key !== "dia") canais.add(key);
    });
  });

  const canaisArray = Array.from(canais);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Canal x Dia da Semana</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <defs>
                {canaisArray.map((canal, index) => {
                  const hsl = getChannelColorHSL(canal, index);
                  return (
                    <linearGradient key={canal} id={getGradientId(canal)} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={`hsl(${hsl})`} stopOpacity={1} />
                      <stop offset="100%" stopColor={`hsl(${hsl})`} stopOpacity={0.6} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="dia" 
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value) => <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>}
              />
              {canaisArray.map((canal, index) => (
                <Bar
                  key={canal}
                  dataKey={canal}
                  stackId="a"
                  fill={`url(#${getGradientId(canal)})`}
                  radius={index === canaisArray.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
