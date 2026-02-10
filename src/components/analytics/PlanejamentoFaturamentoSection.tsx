import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePlanejamentoFaturamento } from "@/hooks/usePlanejamentoFaturamento";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Legend, Line,
} from "recharts";
import { DollarSign, TrendingUp, FileText, Target, AlertTriangle } from "lucide-react";

export function PlanejamentoFaturamentoSection() {
  const { data, isLoading } = usePlanejamentoFaturamento();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-80" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-[350px]" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          Sem dados suficientes. Cadastre propostas e contratos para ativar.
        </CardContent>
      </Card>
    );
  }

  const { kpis, projecaoMensal, metaGapData, volumeHistorico } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Planejamento de Faturamento
        </h2>
        <p className="text-muted-foreground">
          Projeção de receita futura baseada em volume de propostas, conversão e ticket médio (últimos 12 meses)
        </p>
      </div>

      {/* Aviso de amostra pequena */}
      {kpis.amostraPequena && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm">
            <strong>Amostra pequena:</strong> apenas {kpis.totalFechadas12m} contratos fechados nos últimos 12 meses.
            A previsibilidade pode ficar distorcida.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Propostas em Aberto</p>
            <p className="text-2xl font-bold">{kpis.volumePropostasAberto}</p>
            <p className="text-xs text-muted-foreground mt-1">
              R$ {kpis.valorTotalAberto.toLocaleString("pt-BR")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
            <p className="text-2xl font-bold">{(kpis.taxaConversao * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.totalFechadas12m}/{kpis.totalEnviadas12m} (12m)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
            <p className="text-2xl font-bold">
              R$ {kpis.ticketMedio.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Mediana fechamento: {kpis.medianaFechamentoDias}d
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Faturamento Projetado</p>
            <p className="text-2xl font-bold">
              R$ {kpis.faturamentoProjetadoMensal.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total das propostas abertas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projeção Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Projeção Mensal de Faturamento</CardTitle>
          <CardDescription>
            Volume de propostas → conversão esperada → receita projetada por mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projecaoMensal.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Sem propostas abertas para projetar
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={projecaoMensal} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                  className="text-xs"
                />
                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "Faturamento Projetado")
                      return [`R$ ${value.toLocaleString("pt-BR")}`, name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="faturamentoProjetado"
                  name="Faturamento Projetado"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="volumePropostas"
                  name="Volume Propostas"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="conversaoEsperada"
                  name="Conversão Esperada"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Volume Histórico + Meta Gap side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Histórico */}
        <Card>
          <CardHeader>
            <CardTitle>Volume Histórico (12 meses)</CardTitle>
            <CardDescription>
              Propostas enviadas vs fechadas por mês com taxa de conversão
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={volumeHistorico} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${v}%`}
                  className="text-xs"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="enviadas" name="Enviadas" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="fechadas" name="Fechadas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="taxaConversao"
                  name="Conversão %"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Meta vs Projetado */}
        <Card>
          <CardHeader>
            <CardTitle>Projeção vs Meta</CardTitle>
            <CardDescription>
              Gap entre faturamento projetado e meta, com propostas necessárias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metaGapData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados para exibir
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={metaGapData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis
                      tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                      className="text-xs"
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `R$ ${value.toLocaleString("pt-BR")}`,
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
                  </BarChart>
                </ResponsiveContainer>
                <Separator className="my-3" />
                <div className="flex flex-wrap gap-2">
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
      </div>
    </div>
  );
}
