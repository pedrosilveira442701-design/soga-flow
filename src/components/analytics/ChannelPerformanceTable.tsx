import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend, LabelList, Cell } from "recharts";
import type { ChannelMetrics } from "@/hooks/useChannelAnalytics";

interface ChannelPerformanceTableProps {
  data?: ChannelMetrics[];
  isLoading: boolean;
}

// Cores consistentes por canal
const CHANNEL_COLORS: Record<string, string> = {
  "Orgânico": "hsl(195, 60%, 35%)", // Azul petróleo
  "Síndico Profissional": "hsl(145, 55%, 40%)", // Verde
  "Sindico Profissional": "hsl(145, 55%, 40%)", // Verde (variante)
  "Instagram": "hsl(330, 70%, 55%)", // Rosa
  "Google": "hsl(217, 90%, 50%)", // Azul Google
  "Indicação": "hsl(45, 90%, 50%)", // Amarelo
  "Não informado": "hsl(220, 10%, 50%)", // Cinza
  "Outros": "hsl(220, 10%, 60%)", // Cinza claro
};

const DEFAULT_COLOR = "hsl(var(--primary))";

function getChannelColor(canal: string): string {
  return CHANNEL_COLORS[canal] || DEFAULT_COLOR;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyShort(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Tooltip avançado com todas as métricas
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    if (!data) return null;
    
    return (
      <div className="bg-card border border-border rounded-lg p-4 shadow-xl min-w-[200px]">
        <p className="font-semibold text-base mb-3 text-foreground">{label}</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Valor Fechado:</span>
            <span className="font-medium text-green-600">{formatCurrency(data["Valor Fechado"] || 0)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Taxa Conversão:</span>
            <span className="font-medium">{formatPercent(data["Taxa Conversão"] || 0)}</span>
          </div>
          <hr className="border-border my-2" />
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Leads:</span>
            <span className="font-medium">{data.leads || 0}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Propostas:</span>
            <span className="font-medium">{data.propostas || 0}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Fechados:</span>
            <span className="font-medium text-green-600">{data.fechados || 0}</span>
          </div>
          <hr className="border-border my-2" />
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Lead→Prop:</span>
            <span className="font-medium">{formatPercent(data.taxa_lead_proposta || 0)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Prop→Fech:</span>
            <span className="font-medium">{formatPercent(data.taxa_proposta_fechado || 0)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom label para mostrar valor acima das barras
const CustomBarLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;
  
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      fill="hsl(var(--foreground))"
      textAnchor="middle"
      fontSize={11}
      fontWeight={500}
    >
      {formatCurrencyShort(value)}
    </text>
  );
};

// Custom label para mostrar % acima dos pontos da linha
const CustomLineLabel = (props: any) => {
  const { x, y, value } = props;
  if (value === undefined || value === null) return null;
  
  return (
    <text
      x={x}
      y={y - 12}
      fill="hsl(var(--chart-2))"
      textAnchor="middle"
      fontSize={10}
      fontWeight={600}
    >
      {formatPercent(value)}
    </text>
  );
};

// Custom tick para eixo X com mini-métricas
const CustomXAxisTick = (props: any) => {
  const { x, y, payload, data } = props;
  const channelData = data?.find((d: any) => d.canal === payload.value);
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        fill="hsl(var(--foreground))"
        fontSize={12}
        fontWeight={500}
      >
        {payload.value}
      </text>
      {channelData && (
        <text
          x={0}
          y={0}
          dy={26}
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize={9}
        >
          {channelData.leads}L • {channelData.propostas}P • {channelData.fechados}F
        </text>
      )}
    </g>
  );
};

export function ChannelPerformanceTable({ data, isLoading }: ChannelPerformanceTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Canal</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Canal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum dado disponível para o período selecionado
          </p>
        </CardContent>
      </Card>
    );
  }

  // Filtrar canais com valor zero e ordenar por valor fechado (descendente)
  const filteredData = data
    .filter((ch) => ch.valor_fechados > 0 || ch.leads > 0 || ch.propostas > 0)
    .sort((a, b) => b.valor_fechados - a.valor_fechados);

  // Agrupar canais de baixo volume em "Outros" se houver muitos
  const MIN_CHANNELS_TO_GROUP = 6;
  const MIN_VALUE_THRESHOLD = 0.02; // 2% do total
  
  let chartData: any[] = [];
  
  if (filteredData.length > MIN_CHANNELS_TO_GROUP) {
    const totalValor = filteredData.reduce((sum, ch) => sum + ch.valor_fechados, 0);
    const threshold = totalValor * MIN_VALUE_THRESHOLD;
    
    const mainChannels = filteredData.filter((ch) => ch.valor_fechados >= threshold);
    const otherChannels = filteredData.filter((ch) => ch.valor_fechados < threshold && ch.valor_fechados > 0);
    
    chartData = mainChannels.slice(0, 8).map((ch) => ({
      canal: ch.canal,
      "Valor Fechado": ch.valor_fechados,
      "Taxa Conversão": ch.taxa_proposta_fechado,
      leads: ch.leads,
      propostas: ch.propostas,
      fechados: ch.fechados,
      taxa_lead_proposta: ch.taxa_lead_proposta,
      taxa_proposta_fechado: ch.taxa_proposta_fechado,
    }));
    
    // Adicionar "Outros" se houver canais agrupados
    if (otherChannels.length > 0) {
      const outrosTotal = otherChannels.reduce((sum, ch) => sum + ch.valor_fechados, 0);
      const outrosLeads = otherChannels.reduce((sum, ch) => sum + ch.leads, 0);
      const outrosPropostas = otherChannels.reduce((sum, ch) => sum + ch.propostas, 0);
      const outrosFechados = otherChannels.reduce((sum, ch) => sum + ch.fechados, 0);
      
      chartData.push({
        canal: `Outros (${otherChannels.length})`,
        "Valor Fechado": outrosTotal,
        "Taxa Conversão": outrosPropostas > 0 ? (outrosFechados / outrosPropostas) * 100 : 0,
        leads: outrosLeads,
        propostas: outrosPropostas,
        fechados: outrosFechados,
        taxa_lead_proposta: outrosLeads > 0 ? (outrosPropostas / outrosLeads) * 100 : 0,
        taxa_proposta_fechado: outrosPropostas > 0 ? (outrosFechados / outrosPropostas) * 100 : 0,
      });
    }
  } else {
    chartData = filteredData.slice(0, 8).map((ch) => ({
      canal: ch.canal,
      "Valor Fechado": ch.valor_fechados,
      "Taxa Conversão": ch.taxa_proposta_fechado,
      leads: ch.leads,
      propostas: ch.propostas,
      fechados: ch.fechados,
      taxa_lead_proposta: ch.taxa_lead_proposta,
      taxa_proposta_fechado: ch.taxa_proposta_fechado,
    }));
  }

  // Calcular max value para escala do eixo Y
  const maxValor = Math.max(...chartData.map((d) => d["Valor Fechado"]));
  const yAxisMax = Math.ceil(maxValor * 1.15 / 10000) * 10000; // Add 15% headroom for labels

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Desempenho por Canal
        </CardTitle>
        <CardDescription>
          Canais ordenados por valor fechado. Contratos rastreados via cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gráfico */}
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 40 }}>
              <defs>
                {/* Gradientes para cada canal */}
                {chartData.map((item, index) => (
                  <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={getChannelColor(item.canal)} stopOpacity={1} />
                    <stop offset="100%" stopColor={getChannelColor(item.canal)} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="canal" 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tick={(props) => <CustomXAxisTick {...props} data={chartData} />}
                height={50}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 11 }} 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCurrencyShort(v)}
                domain={[0, yAxisMax]}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }} 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              />
              <Bar 
                yAxisId="left"
                dataKey="Valor Fechado" 
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#gradient-${index})`} />
                ))}
                <LabelList dataKey="Valor Fechado" content={<CustomBarLabel />} />
              </Bar>
              <Line 
                yAxisId="right"
                type="monotone"
                dataKey="Taxa Conversão" 
                stroke="hsl(var(--chart-2))"
                strokeWidth={2.5}
                dot={{ fill: "hsl(var(--chart-2))", r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                activeDot={{ r: 7, strokeWidth: 2 }}
                connectNulls
              >
                <LabelList dataKey="Taxa Conversão" content={<CustomLineLabel />} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canal</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Propostas</TableHead>
                <TableHead className="text-right">Fechados</TableHead>
                <TableHead className="text-right">Valor Propostas</TableHead>
                <TableHead className="text-right">Valor Fechado</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead className="text-right">Lead→Prop</TableHead>
                <TableHead className="text-right">Prop→Fech</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.canal}>
                  <TableCell className="font-medium">
                    <Badge variant="outline">{row.canal}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{row.leads}</TableCell>
                  <TableCell className="text-right">{row.propostas}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">{row.fechados}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.valor_propostas)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(row.valor_fechados)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.ticket_medio)}</TableCell>
                  <TableCell className="text-right">
                    <span className={row.taxa_lead_proposta >= 30 ? "text-green-600" : "text-muted-foreground"}>
                      {formatPercent(row.taxa_lead_proposta)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={row.taxa_proposta_fechado >= 20 ? "text-green-600" : "text-muted-foreground"}>
                      {formatPercent(row.taxa_proposta_fechado)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
