import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PerformanceByResponsibleData } from "@/hooks/useAnalytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Users, TrendingUp, Clock, Target } from "lucide-react";
import { FALLBACK_PALETTE } from "@/lib/channelColors";

interface PerformanceChartProps {
  data?: PerformanceByResponsibleData[];
  isLoading?: boolean;
}

// Cores HSL para responsáveis
const getResponsibleColor = (index: number) => {
  const { hue, sat, light } = FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
  return `hsl(${hue}, ${sat}%, ${light}%)`;
};

const getResponsibleColorGradient = (index: number) => {
  const { hue, sat, light } = FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
  return {
    start: `hsl(${hue}, ${sat}%, ${light}%)`,
    end: `hsl(${hue}, ${sat}%, ${light + 12}%)`,
  };
};

export function PerformanceChart({ data, isLoading }: PerformanceChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance por Responsável</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance por Responsável</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sem dados de responsáveis no período selecionado</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-4 shadow-xl min-w-[180px]">
          <p className="font-semibold text-base mb-3">{data.responsavel}</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Leads:</span>
              <span className="font-medium">{data.leads_count}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Propostas:</span>
              <span className="font-medium">{data.propostas_count}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Taxa Conversão:</span>
              <span className="font-medium">{data.taxa_conversao}%</span>
            </div>
            <hr className="border-border my-2" />
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Ciclo Médio:</span>
              <span className="font-medium">{data.ciclo_medio_dias} dias</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Ticket Médio:</span>
              <span className="font-medium">
                R$ {data.ticket_medio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Margem Média:</span>
              <span className="font-medium">{data.margem_media}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calcular médias gerais
  const avgCiclo = data.reduce((sum, d) => sum + d.ciclo_medio_dias, 0) / data.length;
  const avgTicket = data.reduce((sum, d) => sum + d.ticket_medio, 0) / data.length;
  const avgMargem = data.reduce((sum, d) => sum + d.margem_media, 0) / data.length;
  const avgConversao = data.reduce((sum, d) => sum + d.taxa_conversao, 0) / data.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Responsável</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Ciclo Médio</p>
            </div>
            <p className="text-lg font-semibold">{avgCiclo.toFixed(1)} dias</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Ticket Médio</p>
            </div>
            <p className="text-lg font-semibold">
              R$ {avgTicket.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Margem Média</p>
            </div>
            <p className="text-lg font-semibold">{avgMargem.toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Taxa Conversão</p>
            </div>
            <p className="text-lg font-semibold">{avgConversao.toFixed(1)}%</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <defs>
              {data.map((_, index) => {
                const colors = getResponsibleColorGradient(index);
                return (
                  <linearGradient key={`gradient-resp-${index}`} id={`gradient-resp-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.start} stopOpacity={1} />
                    <stop offset="100%" stopColor={colors.end} stopOpacity={0.7} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="responsavel"
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              angle={-45}
              textAnchor="end"
              height={80}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              tick={{ fontSize: 11 }} 
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
            <Legend />
            <Bar dataKey="leads_count" name="Leads" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-leads-${index}`} fill={`url(#gradient-resp-${index})`} />
              ))}
            </Bar>
            <Bar dataKey="taxa_conversao" name="Taxa Conversão %" fill="hsl(142, 65%, 42%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Tabela Detalhada */}
        <div className="mt-6 pt-6 border-t">
          <p className="text-sm font-semibold mb-3">Detalhamento Completo:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-2 font-semibold">Responsável</th>
                  <th className="pb-2 font-semibold text-center">Leads</th>
                  <th className="pb-2 font-semibold text-center">Conv. %</th>
                  <th className="pb-2 font-semibold text-center">Ciclo (dias)</th>
                  <th className="pb-2 font-semibold text-right">Ticket Médio</th>
                  <th className="pb-2 font-semibold text-center">Margem %</th>
                </tr>
              </thead>
              <tbody>
                {data.map((resp, index) => {
                  const { hue, sat, light } = FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
                  return (
                    <tr key={resp.responsavel} className="border-b last:border-0">
                      <td className="py-2 flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded"
                          style={{ 
                            background: `linear-gradient(135deg, hsl(${hue}, ${sat}%, ${light}%) 0%, hsl(${hue}, ${sat}%, ${light + 10}%) 100%)` 
                          }}
                        />
                        {resp.responsavel}
                      </td>
                      <td className="py-2 text-center">{resp.leads_count}</td>
                      <td className="py-2 text-center">
                        <span
                          className={
                            resp.taxa_conversao >= avgConversao
                              ? "text-green-600 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {resp.taxa_conversao}%
                        </span>
                      </td>
                      <td className="py-2 text-center">
                        <span
                          className={
                            resp.ciclo_medio_dias <= avgCiclo
                              ? "text-green-600 font-medium"
                              : "text-orange-500"
                          }
                        >
                          {resp.ciclo_medio_dias}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        R$ {resp.ticket_medio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 text-center">
                        <span
                          className={
                            resp.margem_media >= avgMargem
                              ? "text-green-600 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {resp.margem_media}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
