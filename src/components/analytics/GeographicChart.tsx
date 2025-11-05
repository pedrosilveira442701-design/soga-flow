import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GeographicData } from "@/hooks/useAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { MapPin, TrendingUp } from "lucide-react";

interface GeographicChartProps {
  data: GeographicData[] | null;
  isLoading: boolean;
}

export function GeographicChart({ data, isLoading }: GeographicChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Análise Geográfica
          </CardTitle>
          <CardDescription>Carregando dados geográficos...</CardDescription>
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
            <MapPin className="h-5 w-5" />
            Análise Geográfica
          </CardTitle>
          <CardDescription>Valor líquido e taxa de ganho por cidade</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  // Pegar top 10 cidades
  const top10 = data.slice(0, 10);

  // Calcular insights
  const cidadeTop = top10[0];
  const totalLiquido = top10.reduce((sum, d) => sum + d.valor_liquido, 0);
  const mediaWinRate = top10.reduce((sum, d) => sum + d.taxa_ganho, 0) / top10.length;

  const getColorByWinRate = (rate: number) => {
    if (rate >= 60) return "hsl(var(--chart-2))";
    if (rate >= 40) return "hsl(var(--chart-3))";
    return "hsl(var(--chart-5))";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Análise Geográfica - Top 10 Cidades
        </CardTitle>
        <CardDescription>
          Valor líquido e taxa de ganho por localização
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Cidade Líder</p>
              <p className="text-lg font-bold">{cidadeTop.cidade}</p>
              <p className="text-xs text-muted-foreground">
                R$ {cidadeTop.valor_liquido.toLocaleString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Top 10</p>
              <p className="text-lg font-bold">
                R$ {totalLiquido.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-muted-foreground">
                {top10.reduce((sum, d) => sum + d.total_propostas, 0)} propostas
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Win Rate Médio</p>
              <p className="text-lg font-bold">{mediaWinRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                Média das top 10 cidades
              </p>
            </div>
          </div>

          {/* Gráfico de Barras - Valor Líquido */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Valor Líquido por Cidade</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" />
                <YAxis dataKey="cidade" type="category" width={100} />
                <Tooltip
                  formatter={(value: number) => [
                    `R$ ${value.toLocaleString("pt-BR")}`,
                    "Valor Líquido"
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Bar dataKey="valor_liquido" radius={[0, 8, 8, 0]}>
                  {top10.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByWinRate(entry.taxa_ganho)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela de Taxa de Ganho */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Taxa de Ganho por Cidade
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 text-sm font-medium">Cidade</th>
                    <th className="text-right p-2 text-sm font-medium">Propostas</th>
                    <th className="text-right p-2 text-sm font-medium">Ganhas</th>
                    <th className="text-right p-2 text-sm font-medium">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 text-sm">{item.cidade}</td>
                      <td className="p-2 text-sm text-right">{item.total_propostas}</td>
                      <td className="p-2 text-sm text-right">{item.propostas_ganhas}</td>
                      <td className="p-2 text-sm text-right">
                        <span
                          className="font-semibold"
                          style={{ color: getColorByWinRate(item.taxa_ganho) }}
                        >
                          {item.taxa_ganho.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insights de Performance */}
          <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
            <p className="text-sm">
              <strong>Insight:</strong> {cidadeTop.cidade} lidera com{" "}
              {cidadeTop.taxa_ganho >= mediaWinRate ? "excelente" : "considerável"} win rate de{" "}
              {cidadeTop.taxa_ganho.toFixed(1)}% e R${" "}
              {cidadeTop.valor_liquido.toLocaleString("pt-BR")} em valor líquido.
              {cidadeTop.taxa_ganho < mediaWinRate &&
                " Há oportunidade de melhoria na taxa de conversão."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
