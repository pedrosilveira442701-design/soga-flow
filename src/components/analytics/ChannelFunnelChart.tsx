import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import type { ChannelFunnelData } from "@/hooks/useChannelAnalytics";
import { getChannelColor, getFunnelColorHSL, FUNNEL_COLORS } from "@/lib/channelColors";

interface ChannelFunnelChartProps {
  data?: ChannelFunnelData[];
  isLoading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    if (!data) return null;

    const taxaLeadProp = data.leads > 0 ? ((data.propostas / data.leads) * 100).toFixed(1) : 0;
    const taxaPropFech = data.propostas > 0 ? ((data.fechados / data.propostas) * 100).toFixed(1) : 0;

    return (
      <div className="bg-card border border-border rounded-lg p-4 shadow-xl min-w-[180px]">
        <p className="font-semibold text-base mb-3">{label}</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span style={{ color: getFunnelColorHSL('leads') }}>Leads:</span>
            <span className="font-medium">{data.leads}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span style={{ color: getFunnelColorHSL('propostas') }}>Propostas:</span>
            <span className="font-medium">{data.propostas}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span style={{ color: getFunnelColorHSL('fechados') }}>Fechados:</span>
            <span className="font-medium">{data.fechados}</span>
          </div>
          <hr className="border-border my-2" />
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Lead→Prop:</span>
            <span className="font-medium">{taxaLeadProp}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Prop→Fech:</span>
            <span className="font-medium">{taxaPropFech}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function ChannelFunnelChart({ data, isLoading }: ChannelFunnelChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil de Conversão por Canal</CardTitle>
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
          <CardTitle>Funil de Conversão por Canal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum dado disponível para o período selecionado
          </p>
        </CardContent>
      </Card>
    );
  }

  // Pegar top 6 canais por leads
  const topChannels = [...data].sort((a, b) => b.leads - a.leads).slice(0, 6);

  // Criar mapa de índices para cores únicas
  const canalIndexMap = new Map<string, number>();
  topChannels.forEach((ch, idx) => canalIndexMap.set(ch.canal, idx));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Conversão por Canal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topChannels} layout="vertical">
              <defs>
                {/* Gradientes para cada métrica do funil */}
                <linearGradient id="gradient-leads" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={getFunnelColorHSL('leads')} stopOpacity={1} />
                  <stop offset="100%" stopColor={getFunnelColorHSL('leads')} stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="gradient-propostas" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={getFunnelColorHSL('propostas')} stopOpacity={1} />
                  <stop offset="100%" stopColor={getFunnelColorHSL('propostas')} stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="gradient-fechados" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={getFunnelColorHSL('fechados')} stopOpacity={1} />
                  <stop offset="100%" stopColor={getFunnelColorHSL('fechados')} stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
              <YAxis 
                type="category" 
                dataKey="canal" 
                tick={({ x, y, payload }) => {
                  const idx = canalIndexMap.get(payload.value) ?? 0;
                  const { hue, sat, light } = getChannelColor(payload.value, idx);
                  return (
                    <text 
                      x={x} 
                      y={y} 
                      dy={4} 
                      textAnchor="end" 
                      fontSize={12}
                      fontWeight={500}
                      fill={`hsl(${hue}, ${sat}%, ${Math.max(light - 5, 30)}%)`}
                    >
                      {payload.value}
                    </text>
                  );
                }}
                tickLine={false}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              />
              <Bar dataKey="leads" fill="url(#gradient-leads)" name="Leads" radius={[0, 4, 4, 0]} />
              <Bar dataKey="propostas" fill="url(#gradient-propostas)" name="Propostas" radius={[0, 4, 4, 0]} />
              <Bar dataKey="fechados" fill="url(#gradient-fechados)" name="Fechados" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda com gradientes */}
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded" 
              style={{ 
                background: `linear-gradient(90deg, ${getFunnelColorHSL('leads')} 0%, ${getFunnelColorHSL('leads')}99 100%)` 
              }} 
            />
            <span className="text-sm">Leads</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded" 
              style={{ 
                background: `linear-gradient(90deg, ${getFunnelColorHSL('propostas')} 0%, ${getFunnelColorHSL('propostas')}99 100%)` 
              }} 
            />
            <span className="text-sm">Propostas</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded" 
              style={{ 
                background: `linear-gradient(90deg, ${getFunnelColorHSL('fechados')} 0%, ${getFunnelColorHSL('fechados')}99 100%)` 
              }} 
            />
            <span className="text-sm">Fechados</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
