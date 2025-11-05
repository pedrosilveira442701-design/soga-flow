import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LossReasonData } from "@/hooks/useAnalytics";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { AlertTriangle, TrendingDown } from "lucide-react";

interface LossReasonsChartProps {
  data: LossReasonData[] | null;
  isLoading: boolean;
}

export function LossReasonsChart({ data, isLoading }: LossReasonsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Razões de Perda
          </CardTitle>
          <CardDescription>Carregando análise de perdas...</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Razões de Perda
          </CardTitle>
          <CardDescription>Tendência mensal de oportunidades perdidas</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  // Últimos 12 meses
  const last12Months = data.slice(-12);

  // Calcular métricas
  const totalPerdidas = last12Months.reduce((sum, d) => sum + d.perdidas, 0);
  const mediaTaxaPerda = last12Months.reduce((sum, d) => sum + d.taxa_perda, 0) / last12Months.length;
  
  // Detectar tendência
  const firstHalf = last12Months.slice(0, 6);
  const secondHalf = last12Months.slice(6);
  const mediaFirstHalf = firstHalf.reduce((sum, d) => sum + d.taxa_perda, 0) / firstHalf.length;
  const mediaSecondHalf = secondHalf.reduce((sum, d) => sum + d.taxa_perda, 0) / secondHalf.length;
  const tendencia = mediaSecondHalf > mediaFirstHalf ? "crescente" : "decrescente";
  const mudancaTaxa = ((mediaSecondHalf - mediaFirstHalf) / mediaFirstHalf) * 100;

  // Formatar mês
  const formatMonth = (mes: string) => {
    const [year, month] = mes.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  };

  const dataWithFormatted = last12Months.map(d => ({
    ...d,
    mes_display: formatMonth(d.mes),
  }));

  // Calcular linha de tendência (média móvel simples de 3 meses)
  const dataWithTrend = dataWithFormatted.map((item, idx) => {
    const window = dataWithFormatted.slice(Math.max(0, idx - 2), idx + 1);
    const avg = window.reduce((sum, d) => sum + d.taxa_perda, 0) / window.length;
    return {
      ...item,
      tendencia: avg,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Análise de Oportunidades Perdidas
        </CardTitle>
        <CardDescription>
          Tendência mensal de taxa de perda e volume
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />
                Total Perdidas (12m)
              </p>
              <p className="text-lg font-bold">{totalPerdidas}</p>
              <p className="text-xs text-muted-foreground">
                Oportunidades não convertidas
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taxa Média de Perda</p>
              <p className="text-lg font-bold">{mediaTaxaPerda.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                Últimos 12 meses
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tendência</p>
              <p className={`text-lg font-bold ${tendencia === "crescente" ? "text-destructive" : "text-success"}`}>
                {tendencia === "crescente" ? "↑" : "↓"} {Math.abs(mudancaTaxa).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {tendencia === "crescente" ? "Piora" : "Melhora"} nos últimos 6m
              </p>
            </div>
          </div>

          {/* Gráfico de Área - Taxa de Perda */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Taxa de Perda Mensal</h4>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dataWithTrend}>
                <defs>
                  <linearGradient id="colorTaxaPerda" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="mes_display" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="taxa_perda"
                  stroke="hsl(var(--destructive))"
                  fillOpacity={1}
                  fill="url(#colorTaxaPerda)"
                  name="Taxa de Perda"
                />
                <Line
                  type="monotone"
                  dataKey="tendencia"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Tendência (MA3)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Barras - Volume de Perdas */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Volume de Oportunidades Perdidas</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dataWithFormatted}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="mes_display" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="perdidas"
                  stroke="hsl(var(--chart-5))"
                  strokeWidth={2}
                  name="Volume Perdidas"
                  dot={{ fill: "hsl(var(--chart-5))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Alerta de Tendência */}
          {tendencia === "crescente" && Math.abs(mudancaTaxa) > 10 && (
            <div className="p-4 bg-destructive/10 rounded-lg border-l-4 border-destructive">
              <p className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <strong>Atenção:</strong> A taxa de perda aumentou {Math.abs(mudancaTaxa).toFixed(1)}%
                nos últimos 6 meses. Recomenda-se análise detalhada dos motivos e ações corretivas.
              </p>
            </div>
          )}

          {/* Insights */}
          <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
            <p className="text-sm">
              <strong>Insight:</strong> A taxa de perda está{" "}
              {tendencia === "crescente" ? "aumentando" : "diminuindo"} com média de{" "}
              {mediaTaxaPerda.toFixed(1)}% nos últimos 12 meses.
              {tendencia === "decrescente" && " Continue monitorando as práticas de sucesso atuais."}
              {tendencia === "crescente" && " Investigue possíveis causas: preço, concorrência, qualidade do lead, etc."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
