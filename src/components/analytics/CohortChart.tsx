import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CohortData } from "@/hooks/useAnalytics";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Users, TrendingUp, Clock } from "lucide-react";

interface CohortChartProps {
  data: CohortData[] | null;
  isLoading: boolean;
}

export function CohortChart({ data, isLoading }: CohortChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Análise de Cohorts
          </CardTitle>
          <CardDescription>Carregando análise de cohorts...</CardDescription>
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
            <Users className="h-5 w-5" />
            Análise de Cohorts
          </CardTitle>
          <CardDescription>Conversão cumulativa por mês de origem</CardDescription>
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
  const totalLeads = last12Months.reduce((sum, d) => sum + d.total_leads, 0);
  const totalConvertidos = last12Months.reduce((sum, d) => sum + d.convertidos, 0);
  const taxaGeralConversao = totalLeads > 0 ? (totalConvertidos / totalLeads) * 100 : 0;
  const mediaDiasConversao = last12Months
    .filter(d => d.dias_medio_conversao > 0)
    .reduce((sum, d) => sum + d.dias_medio_conversao, 0) / 
    last12Months.filter(d => d.dias_medio_conversao > 0).length;

  // Calcular conversão cumulativa
  const cumulativeData = last12Months.map((item, idx) => {
    const previousItems = last12Months.slice(0, idx + 1);
    const cumulativeLeads = previousItems.reduce((sum, d) => sum + d.total_leads, 0);
    const cumulativeConvertidos = previousItems.reduce((sum, d) => sum + d.convertidos, 0);
    
    return {
      ...item,
      taxa_cumulativa: cumulativeLeads > 0 ? (cumulativeConvertidos / cumulativeLeads) * 100 : 0,
    };
  });

  // Formatar mês para display
  const formatMonth = (mesOrigem: string) => {
    const [year, month] = mesOrigem.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  };

  const dataWithFormatted = cumulativeData.map(d => ({
    ...d,
    mes_display: formatMonth(d.mes_origem),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Análise de Cohorts de Entrada
        </CardTitle>
        <CardDescription>
          Conversão cumulativa por mês de origem dos leads
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" />
                Total de Leads (12m)
              </p>
              <p className="text-lg font-bold">{totalLeads}</p>
              <p className="text-xs text-muted-foreground">
                {totalConvertidos} convertidos
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Taxa Geral de Conversão
              </p>
              <p className="text-lg font-bold">{taxaGeralConversao.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                Últimos 12 meses
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Tempo Médio de Conversão
              </p>
              <p className="text-lg font-bold">
                {mediaDiasConversao ? mediaDiasConversao.toFixed(0) : "N/A"} dias
              </p>
              <p className="text-xs text-muted-foreground">
                Média de ciclo
              </p>
            </div>
          </div>

          {/* Gráfico de Linha - Conversão Cumulativa */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Taxa de Conversão Cumulativa</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dataWithFormatted}>
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
                <Line
                  type="monotone"
                  dataKey="taxa_cumulativa"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  name="Taxa Cumulativa"
                  dot={{ fill: "hsl(var(--chart-1))" }}
                />
                <Line
                  type="monotone"
                  dataKey="taxa_conversao"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Taxa Mensal"
                  dot={{ fill: "hsl(var(--chart-3))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Barras - Volume por Cohort */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Volume de Leads por Cohort</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dataWithFormatted}>
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
                <Bar dataKey="total_leads" fill="hsl(var(--chart-2))" name="Total Leads" />
                <Bar dataKey="convertidos" fill="hsl(var(--chart-4))" name="Convertidos" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Insights */}
          <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
            <p className="text-sm">
              <strong>Insight:</strong> A taxa cumulativa de conversão está em{" "}
              {cumulativeData[cumulativeData.length - 1]?.taxa_cumulativa.toFixed(1)}%.
              {cumulativeData.length >= 2 && (
                <>
                  {" "}A conversão{" "}
                  {cumulativeData[cumulativeData.length - 1].taxa_conversao >
                  cumulativeData[cumulativeData.length - 2].taxa_conversao
                    ? "melhorou"
                    : "caiu"}{" "}
                  no último mês comparado ao anterior.
                </>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
