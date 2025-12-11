import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ChannelDayData } from "@/hooks/useChannelAnalytics";

interface ChannelDayChartProps {
  data?: ChannelDayData[];
  isLoading: boolean;
}

// Paleta de cores bem distintas e espaçadas no espectro
const CHANNEL_COLORS: Record<string, string> = {
  // Azuis
  "Google": "#3B82F6",        // Azul vibrante
  "Facebook": "#1D4ED8",      // Azul escuro
  "Orgânico": "#0EA5E9",      // Azul céu
  
  // Rosa/Magenta (bem separado)
  "Instagram": "#EC4899",     // Rosa vibrante
  
  // Âmbar/Dourado (bem diferente do rosa)
  "Indicação": "#F59E0B",     // Âmbar
  
  // Verdes
  "WhatsApp": "#22C55E",      // Verde vivo
  
  // Roxos/Violetas
  "Site": "#8B5CF6",          // Violeta
  "Síndico Profissional": "#6366F1", // Índigo
  
  // Neutros
  "Telefone": "#64748B",      // Cinza azulado
  "Não informado": "#94A3B8", // Cinza claro
};

// Cores de fallback bem distintas para canais não mapeados
const FALLBACK_COLORS = [
  "#F97316",  // Laranja
  "#14B8A6",  // Teal
  "#A855F7",  // Roxo
  "#EF4444",  // Vermelho
  "#84CC16",  // Lima
  "#0891B2",  // Ciano
  "#DC2626",  // Vermelho escuro
  "#7C3AED",  // Violeta escuro
  "#059669",  // Verde escuro
  "#D946EF",  // Fúcsia
];

function getChannelColor(canal: string, index: number = 0): string {
  // Match exato
  if (CHANNEL_COLORS[canal]) {
    return CHANNEL_COLORS[canal];
  }
  
  // Verificar prefixos comuns
  if (canal.startsWith("Indicação")) return "#F59E0B";  // Âmbar
  if (canal.startsWith("Outro")) return "#14B8A6";       // Teal
  if (canal.includes("Síndico")) return "#6366F1";       // Índigo
  if (canal.includes("MKT") || canal.includes("Marketing")) return "#A855F7"; // Roxo
  
  // Fallback determinístico baseado no índice
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
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
              {canaisArray.map((canal, index) => (
                <Bar
                  key={canal}
                  dataKey={canal}
                  stackId="a"
                  fill={getChannelColor(canal, index)}
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
