import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { InsightsChat } from "@/components/insights/InsightsChat";
import { InsightsFilters } from "@/components/insights/InsightsFilters";
import { useInsights, InsightFilters } from "@/hooks/useInsights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download, Code, RefreshCw, Save, Clock, Trash2, Eye, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4"];

export default function Insights() {
  const [filters, setFilters] = useState<InsightFilters>({ period: "this_month" });
  const [showSQL, setShowSQL] = useState(false);
  const { isQuerying, lastResult, executeQuery, executeFallbackReport, fallbackReports, savedReports, clearCache } = useInsights();

  const handleSendMessage = async (message: string) => {
    await executeQuery(message, filters);
  };

  const handleSelectSuggestion = async (key: string) => {
    await executeFallbackReport(key, filters);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const renderChart = () => {
    if (!lastResult?.data?.length) return null;

    const data = lastResult.data.slice(0, 20);
    const { chartType, xAxis, yAxis } = lastResult;

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={xAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend />
            {yAxis.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "pie") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} dataKey={yAxis[0]} nameKey={xAxis} cx="50%" cy="50%" outerRadius={100} label>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={xAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} angle={-45} textAnchor="end" height={80} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
          <Legend />
          {yAxis.map((key, i) => (
            <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">IA de Insights</h1>
            <p className="text-muted-foreground">Pergunte sobre seus dados em linguagem natural</p>
          </div>
          <Button variant="outline" size="sm" onClick={clearCache}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpar Cache
          </Button>
        </div>

        <InsightsFilters filters={filters} onFiltersChange={setFilters} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat */}
          <Card className="lg:col-span-1 h-[600px]">
            <InsightsChat
              onSendMessage={handleSendMessage}
              onSelectSuggestion={handleSelectSuggestion}
              isLoading={isQuerying}
              suggestions={fallbackReports}
              nextSteps={lastResult?.nextSteps}
            />
          </Card>

          {/* Resultados */}
          <div className="lg:col-span-2 space-y-4">
            {isQuerying ? (
              <Card className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/3" />
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                  <Skeleton className="h-[300px]" />
                </div>
              </Card>
            ) : lastResult ? (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {lastResult.kpis.valor_total !== undefined && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(Number(lastResult.kpis.valor_total))}</p>
                      </CardContent>
                    </Card>
                  )}
                  {lastResult.kpis.margem_media !== undefined && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Margem Média</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{Number(lastResult.kpis.margem_media).toFixed(1)}%</p>
                      </CardContent>
                    </Card>
                  )}
                  {lastResult.kpis.ticket_medio !== undefined && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(Number(lastResult.kpis.ticket_medio))}</p>
                      </CardContent>
                    </Card>
                  )}
                  {lastResult.kpis.m2_total !== undefined && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">m² Total</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{Number(lastResult.kpis.m2_total).toFixed(0)}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Chart & Table */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle>Resultado</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={lastResult.confidence >= 0.7 ? "default" : "secondary"}>
                          Confiança: {(lastResult.confidence * 100).toFixed(0)}%
                        </Badge>
                        {lastResult.cached && <Badge variant="outline">Cache</Badge>}
                        {lastResult.usedFallback && <Badge variant="outline">Relatório Padrão</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowSQL(!showSQL)}>
                        <Code className="h-4 w-4 mr-1" />
                        SQL
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {lastResult.explanation && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {lastResult.explanation}
                      </p>
                    )}
                    {showSQL && (
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                        {lastResult.sql}
                      </pre>
                    )}
                    <Tabs defaultValue="chart">
                      <TabsList>
                        <TabsTrigger value="chart">Gráfico</TabsTrigger>
                        <TabsTrigger value="table">Tabela ({lastResult.rowCount})</TabsTrigger>
                      </TabsList>
                      <TabsContent value="chart" className="pt-4">
                        {renderChart()}
                      </TabsContent>
                      <TabsContent value="table">
                        <ScrollArea className="h-[300px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {lastResult.data[0] && Object.keys(lastResult.data[0]).slice(0, 6).map((key) => (
                                  <TableHead key={key}>{key}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {lastResult.data.slice(0, 50).map((row, i) => (
                                <TableRow key={i}>
                                  {Object.values(row).slice(0, 6).map((val, j) => (
                                    <TableCell key={j}>
                                      {typeof val === "number" 
                                        ? val > 1000 ? formatCurrency(val) : val.toFixed(2)
                                        : String(val ?? "-")}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                    <p className="text-xs text-muted-foreground">
                      Executado em {lastResult.executionTimeMs}ms
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="p-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Faça uma pergunta ou selecione um relatório para começar</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
