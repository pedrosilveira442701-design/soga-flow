import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ChannelFunnelData } from "@/hooks/useChannelAnalytics";

interface ChannelFunnelChartProps {
  data?: ChannelFunnelData[];
  isLoading: boolean;
}

const FUNNEL_COLORS = {
  leads: "#3b82f6",
  propostas: "#8b5cf6",
  fechados: "#22c55e",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    if (!data) return null;

    const taxaLeadProp = data.leads > 0 ? ((data.propostas / data.leads) * 100).toFixed(1) : 0;
    const taxaPropFech = data.propostas > 0 ? ((data.fechados / data.propostas) * 100).toFixed(1) : 0;

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <p style={{ color: FUNNEL_COLORS.leads }}>Leads: {data.leads}</p>
          <p style={{ color: FUNNEL_COLORS.propostas }}>Propostas: {data.propostas}</p>
          <p style={{ color: FUNNEL_COLORS.fechados }}>Fechados: {data.fechados}</p>
          <hr className="my-2" />
          <p className="text-muted-foreground">Lead→Proposta: {taxaLeadProp}%</p>
          <p className="text-muted-foreground">Proposta→Fechado: {taxaPropFech}%</p>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Conversão por Canal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topChannels} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
              <YAxis 
                type="category" 
                dataKey="canal" 
                tick={{ fontSize: 12 }} 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="leads" fill={FUNNEL_COLORS.leads} name="Leads" radius={[0, 4, 4, 0]} />
              <Bar dataKey="propostas" fill={FUNNEL_COLORS.propostas} name="Propostas" radius={[0, 4, 4, 0]} />
              <Bar dataKey="fechados" fill={FUNNEL_COLORS.fechados} name="Fechados" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda */}
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: FUNNEL_COLORS.leads }} />
            <span className="text-sm">Leads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: FUNNEL_COLORS.propostas }} />
            <span className="text-sm">Propostas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: FUNNEL_COLORS.fechados }} />
            <span className="text-sm">Fechados</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
