import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ChannelDayData } from "@/hooks/useChannelAnalytics";

interface ChannelDayChartProps {
  data?: ChannelDayData[];
  isLoading: boolean;
}

const CHANNEL_COLORS: Record<string, string> = {
  "Google": "#4285F4",
  "Instagram": "#E4405F",
  "Facebook": "#1877F2",
  "WhatsApp": "#25D366",
  "Indicação": "#FF9800",
  "Site": "#9C27B0",
  "Telefone": "#607D8B",
  "Não informado": "#9E9E9E",
};

function getChannelColor(canal: string): string {
  return CHANNEL_COLORS[canal] || `hsl(${Math.random() * 360}, 70%, 50%)`;
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
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="dia" 
                tick={{ fontSize: 12 }} 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {canaisArray.map((canal) => (
                <Bar
                  key={canal}
                  dataKey={canal}
                  stackId="a"
                  fill={getChannelColor(canal)}
                  radius={canaisArray.indexOf(canal) === canaisArray.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
