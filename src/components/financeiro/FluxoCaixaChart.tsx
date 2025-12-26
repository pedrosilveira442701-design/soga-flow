import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { calcularInsightsTendencia } from "@/hooks/useFinanceiro";

interface FluxoCaixaChartProps {
  data: Array<{
    mes: string;
    recebido: number;
    previsto: number;
    atrasado: number;
    margemRecebida?: number;
    tendenciaEMA?: number;
  }>;
  isLoading?: boolean;
}

// Cores HSL para as categorias financeiras
const FLUXO_COLORS = {
  recebido: { hue: 142, sat: 71, light: 45 },  // Verde
  margemRecebida: { hue: 160, sat: 84, light: 39 },  // Verde escuro/teal
  previsto: { hue: 217, sat: 91, light: 60 },  // Azul
  atrasado: { hue: 0, sat: 84, light: 60 },    // Vermelho
  tendencia: { hue: 271, sat: 76, light: 53 }, // Roxo vibrante
};

export function FluxoCaixaChart({ data, isLoading }: FluxoCaixaChartProps) {
  const [mostrarTendencia, setMostrarTendencia] = useState(true);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  const formatMonth = (mes: string) => {
    const [ano, mesNum] = mes.split("-");
    const meses = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ];
    return `${meses[parseInt(mesNum) - 1]}/${ano.slice(2)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
      return (
        <div className="bg-card border border-border rounded-lg p-4 shadow-xl min-w-[200px]">
          <p className="font-semibold text-base mb-3 border-b pb-2">{formatMonth(label)}</p>
          <div className="space-y-2 text-sm">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between gap-4">
                <span className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: entry.fill || entry.color }}
                  />
                  <span className="text-muted-foreground">{entry.name}:</span>
                </span>
                <span className="font-medium">{formatCurrency(entry.value)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-4 pt-2 border-t font-semibold">
              <span className="text-muted-foreground">Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Fluxo de Caixa (12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Normalizar dados para garantir que margemRecebida e tendenciaEMA existem
  const normalizedData = data.map(d => ({
    ...d,
    margemRecebida: d.margemRecebida ?? 0,
    tendenciaEMA: d.tendenciaEMA ?? 0,
  }));

  // Calcular totais para insights
  const totalRecebido = normalizedData.reduce((sum, d) => sum + d.recebido, 0);
  const totalMargemRecebida = normalizedData.reduce((sum, d) => sum + d.margemRecebida, 0);
  const totalPrevisto = normalizedData.reduce((sum, d) => sum + d.previsto, 0);
  const totalAtrasado = normalizedData.reduce((sum, d) => sum + d.atrasado, 0);

  // Calcular insights da tendência
  const insights = calcularInsightsTendencia(normalizedData as any);
  
  const TrendIcon = insights.direcao === 'crescente' 
    ? TrendingUp 
    : insights.direcao === 'decrescente' 
      ? TrendingDown 
      : Minus;

  const trendColor = insights.direcao === 'crescente' 
    ? 'text-green-500' 
    : insights.direcao === 'decrescente' 
      ? 'text-red-500' 
      : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Fluxo de Caixa (12 meses)
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="tendencia-toggle"
                checked={mostrarTendencia}
                onCheckedChange={setMostrarTendencia}
              />
              <Label htmlFor="tendencia-toggle" className="text-sm font-normal cursor-pointer">
                Tendência EMA
              </Label>
            </div>
            <span className="text-sm font-normal text-muted-foreground">
              Total: {formatCurrency(totalRecebido + totalPrevisto)}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={normalizedData}>
            <defs>
              <linearGradient id="gradient-recebido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`hsl(${FLUXO_COLORS.recebido.hue}, ${FLUXO_COLORS.recebido.sat}%, ${FLUXO_COLORS.recebido.light}%)`} stopOpacity={1} />
                <stop offset="100%" stopColor={`hsl(${FLUXO_COLORS.recebido.hue}, ${FLUXO_COLORS.recebido.sat}%, ${FLUXO_COLORS.recebido.light + 15}%)`} stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="gradient-margemRecebida" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`hsl(${FLUXO_COLORS.margemRecebida.hue}, ${FLUXO_COLORS.margemRecebida.sat}%, ${FLUXO_COLORS.margemRecebida.light}%)`} stopOpacity={1} />
                <stop offset="100%" stopColor={`hsl(${FLUXO_COLORS.margemRecebida.hue}, ${FLUXO_COLORS.margemRecebida.sat}%, ${FLUXO_COLORS.margemRecebida.light + 15}%)`} stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="gradient-previsto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`hsl(${FLUXO_COLORS.previsto.hue}, ${FLUXO_COLORS.previsto.sat}%, ${FLUXO_COLORS.previsto.light}%)`} stopOpacity={1} />
                <stop offset="100%" stopColor={`hsl(${FLUXO_COLORS.previsto.hue}, ${FLUXO_COLORS.previsto.sat}%, ${FLUXO_COLORS.previsto.light + 15}%)`} stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="gradient-atrasado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`hsl(${FLUXO_COLORS.atrasado.hue}, ${FLUXO_COLORS.atrasado.sat}%, ${FLUXO_COLORS.atrasado.light}%)`} stopOpacity={1} />
                <stop offset="100%" stopColor={`hsl(${FLUXO_COLORS.atrasado.hue}, ${FLUXO_COLORS.atrasado.sat}%, ${FLUXO_COLORS.atrasado.light + 15}%)`} stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="mes"
              tickFormatter={formatMonth}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
            />
            <YAxis 
              tickFormatter={formatCurrencyShort} 
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
            <Legend 
              formatter={(value) => <span className="text-sm">{value}</span>}
            />
            <Bar
              dataKey="recebido"
              name="Recebido"
              fill="url(#gradient-recebido)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="margemRecebida"
              name="Margem Líquida"
              fill="url(#gradient-margemRecebida)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="previsto"
              name="Previsto"
              fill="url(#gradient-previsto)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="atrasado"
              name="Atrasado"
              fill="url(#gradient-atrasado)"
              radius={[4, 4, 0, 0]}
            />
            {mostrarTendencia && (
              <Line
                type="monotone"
                dataKey="tendenciaEMA"
                name="Tendência (EMA)"
                stroke={`hsl(${FLUXO_COLORS.tendencia.hue}, ${FLUXO_COLORS.tendencia.sat}%, ${FLUXO_COLORS.tendencia.light}%)`}
                strokeWidth={3}
                strokeDasharray="8 4"
                dot={{ 
                  fill: `hsl(${FLUXO_COLORS.tendencia.hue}, ${FLUXO_COLORS.tendencia.sat}%, ${FLUXO_COLORS.tendencia.light}%)`, 
                  r: 4,
                  strokeWidth: 2,
                  stroke: 'hsl(var(--background))'
                }}
                activeDot={{ 
                  r: 6, 
                  fill: `hsl(${FLUXO_COLORS.tendencia.hue}, ${FLUXO_COLORS.tendencia.sat}%, ${FLUXO_COLORS.tendencia.light}%)`,
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Cards de totais */}
        <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Recebido</p>
            <p className="text-lg font-bold" style={{ color: `hsl(${FLUXO_COLORS.recebido.hue}, ${FLUXO_COLORS.recebido.sat}%, ${FLUXO_COLORS.recebido.light}%)` }}>
              {formatCurrency(totalRecebido)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Margem Líquida</p>
            <p className="text-lg font-bold" style={{ color: `hsl(${FLUXO_COLORS.margemRecebida.hue}, ${FLUXO_COLORS.margemRecebida.sat}%, ${FLUXO_COLORS.margemRecebida.light}%)` }}>
              {formatCurrency(totalMargemRecebida)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Previsto</p>
            <p className="text-lg font-bold" style={{ color: `hsl(${FLUXO_COLORS.previsto.hue}, ${FLUXO_COLORS.previsto.sat}%, ${FLUXO_COLORS.previsto.light}%)` }}>
              {formatCurrency(totalPrevisto)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Atrasado</p>
            <p className="text-lg font-bold" style={{ color: `hsl(${FLUXO_COLORS.atrasado.hue}, ${FLUXO_COLORS.atrasado.sat}%, ${FLUXO_COLORS.atrasado.light}%)` }}>
              {formatCurrency(totalAtrasado)}
            </p>
          </div>
        </div>

        {/* Card de Insights da Tendência */}
        {mostrarTendencia && (
          <div className="mt-4 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <TrendIcon className={`h-5 w-5 ${trendColor}`} />
              <span className="font-semibold">Análise de Tendência (EMA)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Direção</p>
                <p className={`font-semibold capitalize ${trendColor}`}>
                  {insights.direcao === 'crescente' ? '↗ Crescente' : 
                   insights.direcao === 'decrescente' ? '↘ Decrescente' : 
                   '→ Estável'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Variação (3 meses)</p>
                <p className={`font-semibold ${insights.taxaCrescimento >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {insights.taxaCrescimento >= 0 ? '+' : ''}{insights.taxaCrescimento.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Projeção Próximo Mês</p>
                <p className="font-semibold" style={{ color: `hsl(${FLUXO_COLORS.tendencia.hue}, ${FLUXO_COLORS.tendencia.sat}%, ${FLUXO_COLORS.tendencia.light}%)` }}>
                  {formatCurrency(Math.max(0, insights.projecaoProximoMes))}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
