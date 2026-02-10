import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForecast } from "@/hooks/useForecast";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ComposedChart, Legend, Cell,
} from "recharts";
import { TrendingUp, Target, Clock, AlertTriangle, BarChart3 } from "lucide-react";

const OUTLIER_OPTIONS = [
  { value: "90", label: "90 dias" },
  { value: "120", label: "120 dias" },
  { value: "150", label: "150 dias" },
  { value: "180", label: "180 dias (padrão)" },
  { value: "210", label: "210 dias" },
];

export function ForecastSection() {
  const [outlierLimit, setOutlierLimit] = useState(180);
  const { data, isLoading } = useForecast({ outlierLimit });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          Sem dados suficientes para projeção. Cadastre propostas fechadas para ativar.
        </CardContent>
      </Card>
    );
  }

  const { kpis, forecastData, metaGapData, histogram } = data;

  return (
    <div className="space-y-6">
      {/* Header + Controle de Outlier */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Previsibilidade de Fechamento
          </h2>
          <p className="text-muted-foreground">
            Projeção mensal de receita baseada em histórico real com tratamento de outliers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Limite outlier:</span>
          <Select
            value={String(outlierLimit)}
            onValueChange={(v) => setOutlierLimit(Number(v))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTLIER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Mediana (P50)</p>
                <p className="text-2xl font-bold">{kpis.p50} dias</p>
                <p className="text-xs text-muted-foreground mt-1">
                  P25: {kpis.p25}d · P75: {kpis.p75}d
                </p>
              </div>
              <Clock className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
                <p className="text-2xl font-bold">{(kpis.taxaConversao * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.totalFechadas}/{kpis.totalEnviadas} propostas
                </p>
              </div>
              <Target className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">
                  R$ {kpis.ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Outliers</p>
                <p className="text-2xl font-bold">{kpis.percentualOutliers}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.outlierCount} propostas &gt; {outlierLimit}d
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aviso de amostra pequena */}
      {kpis.sampleWarning && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm">
            <strong>Amostra pequena:</strong> apenas {kpis.totalFechadas} contratos fechados nos últimos 12 meses.
            A previsibilidade pode ficar distorcida.
          </AlertDescription>
        </Alert>
      )}

      {/* Forecast de Receita */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast de Receita</CardTitle>
          <CardDescription>
            Projeção mensal com cenários otimista (P25), esperado (P50) e conservador (P75)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {forecastData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Sem propostas abertas para projetar
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={forecastData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number) =>
                    `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
                  }
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="p25"
                  name="Otimista (P25)"
                  stroke="hsl(var(--chart-2))"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="p50"
                  name="Esperado (P50)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="p75"
                  name="Conservador (P75)"
                  stroke="hsl(var(--chart-4))"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Propostas vs Meta + Histograma side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Propostas vs Meta */}
        <Card>
          <CardHeader>
            <CardTitle>Projeção vs Meta</CardTitle>
            <CardDescription>
              Gap entre receita projetada e meta, com propostas necessárias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metaGapData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados para exibir
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={metaGapData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis
                      tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                      className="text-xs"
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`,
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="projetado" name="Projetado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gap" name="Gap" fill="hsl(var(--destructive))" fillOpacity={0.6} radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>

                {/* Propostas necessárias */}
                <Separator className="my-4" />
                <div className="flex flex-wrap gap-3">
                  {metaGapData
                    .filter((d) => d.propostasNecessarias > 0)
                    .map((d) => (
                      <Badge key={d.mes} variant="outline" className="text-sm py-1 px-3">
                        {d.mes}: <span className="font-bold ml-1">+{d.propostasNecessarias}</span> propostas
                      </Badge>
                    ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Histograma */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição do Tempo de Fechamento</CardTitle>
            <CardDescription>
              Histograma com percentis e limite configurado ({outlierLimit}d)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {histogram.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados para exibir
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={histogram} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="range" className="text-xs" label={{ value: "Dias", position: "insideBottom", offset: -2 }} />
                  <YAxis className="text-xs" label={{ value: "Propostas", angle: -90, position: "insideLeft" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value} propostas`, "Quantidade"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {histogram.map((entry) => (
                      <Cell
                        key={entry.range}
                        fill={
                          entry.rangeStart >= outlierLimit
                            ? "hsl(var(--destructive) / 0.5)"
                            : "hsl(var(--primary) / 0.7)"
                        }
                      />
                    ))}
                  </Bar>
                  {/* Linhas de referência P25, P50, P75 */}
                  <ReferenceLine
                    x={`${Math.floor(kpis.p25 / 15) * 15}-${Math.floor(kpis.p25 / 15) * 15 + 15}`}
                    stroke="hsl(var(--chart-2))"
                    strokeDasharray="3 3"
                    label={{ value: `P25 (${kpis.p25}d)`, position: "top", fill: "hsl(var(--chart-2))", fontSize: 11 }}
                  />
                  <ReferenceLine
                    x={`${Math.floor(kpis.p50 / 15) * 15}-${Math.floor(kpis.p50 / 15) * 15 + 15}`}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    label={{ value: `P50 (${kpis.p50}d)`, position: "top", fill: "hsl(var(--primary))", fontSize: 11 }}
                  />
                  <ReferenceLine
                    x={`${Math.floor(kpis.p75 / 15) * 15}-${Math.floor(kpis.p75 / 15) * 15 + 15}`}
                    stroke="hsl(var(--chart-4))"
                    strokeDasharray="3 3"
                    label={{ value: `P75 (${kpis.p75}d)`, position: "top", fill: "hsl(var(--chart-4))", fontSize: 11 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
