import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ChannelDayData } from "@/hooks/useChannelAnalytics";

interface ChannelDayChartProps {
  data?: ChannelDayData[];
  isLoading: boolean;
}

// Cores fixas por canal - consistente com ChannelPerformanceTable
const CHANNEL_COLORS: Record<string, string> = {
  "Orgânico": "0 84% 60%",           // HSL vermelho coral
  "Síndico Profissional": "142 76% 36%", // HSL verde
  "Instagram": "330 81% 60%",        // HSL rosa
  "Google": "217 91% 60%",           // HSL azul
  "Indicação": "45 93% 47%",         // HSL amarelo/âmbar
  "Não informado": "215 16% 47%",    // HSL cinza
  "WhatsApp": "142 69% 58%",         // HSL verde claro
  "Facebook": "221 83% 53%",         // HSL azul escuro
  "Site": "263 70% 50%",             // HSL roxo
  "Telefone": "215 25% 27%",         // HSL cinza escuro
  "Outros": "174 42% 41%",           // HSL teal
};

// Cores de fallback para canais não mapeados
const FALLBACK_COLORS = [
  "24 95% 53%",   // Laranja
  "174 42% 41%",  // Teal
  "270 60% 70%",  // Roxo claro
  "0 72% 51%",    // Vermelho
  "84 81% 44%",   // Lima
];

function getChannelColorHSL(canal: string, index: number = 0): string {
  if (CHANNEL_COLORS[canal]) {
    return CHANNEL_COLORS[canal];
  }
  
  // Verificar prefixos comuns
  if (canal.startsWith("Indicação")) return CHANNEL_COLORS["Indicação"];
  if (canal.startsWith("Outro")) return CHANNEL_COLORS["Outros"];
  if (canal.includes("Síndico")) return CHANNEL_COLORS["Síndico Profissional"];
  if (canal.includes("MKT") || canal.includes("Marketing")) return "270 60% 70%";
  
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
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
