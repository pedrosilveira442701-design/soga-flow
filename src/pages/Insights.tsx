import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { InsightsChat } from "@/components/insights/InsightsChat";
import { useInsights } from "@/hooks/useInsights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Code, RefreshCw, AlertCircle, MessageSquare, TableIcon, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4"];

export default function Insights() {
  const [showSQL, setShowSQL] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("text");
  const { isQuerying, lastResult, executeQuery, executeFallbackReport, fallbackReports, clearCache } = useInsights();

  const handleSendMessage = async (message: string) => {
    setActiveTab("text");
    // Sem filtros globais - a pergunta determina tudo
    await executeQuery(message, { period: "custom" });
  };

  const handleSelectSuggestion = async (key: string) => {
    setActiveTab("text");
    await executeFallbackReport(key, { period: "custom" });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatNumber = (value: number, decimals: number = 0) =>
    new Intl.NumberFormat("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);

  const renderChart = () => {
    if (!lastResult?.data?.length || !lastResult.wantsChart) return null;

    const data = lastResult.data.slice(0, 20);
    const { chartType, xAxis, yAxis } = lastResult;

    if (!xAxis || !yAxis?.length) return null;

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

  const hasTableData = lastResult?.data && lastResult.data.length > 1;
  const hasChartData = lastResult?.wantsChart && lastResult.data && lastResult.data.length > 1;

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat */}
          <Card className="lg:col-span-1 h-[600px]">
            <InsightsChat
              onSendMessage={handleSendMessage}
              onSelectSuggestion={handleSelectSuggestion}
              isLoading={isQuerying}
              suggestions={fallbackReports}
              nextSteps={lastResult?.nextSteps}
              lastResponse={lastResult?.textResponse}
            />
          </Card>

          {/* Resultados */}
          <div className="lg:col-span-2 space-y-4">
            {isQuerying ? (
              <Card className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-[200px]" />
                </div>
              </Card>
            ) : lastResult ? (
              <>
                {/* Resultado Principal */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base">Resultado</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={lastResult.confidence >= 0.7 ? "default" : "secondary"} className="text-xs">
                          {(lastResult.confidence * 100).toFixed(0)}% confiança
                        </Badge>
                        {lastResult.cached && <Badge variant="outline" className="text-xs">Cache</Badge>}
                        {lastResult.usedFallback && <Badge variant="outline" className="text-xs">Relatório Padrão</Badge>}
                        {(lastResult as any).isSnapshot && <Badge variant="secondary" className="text-xs">Snapshot</Badge>}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowSQL(!showSQL)}>
                      <Code className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Resposta em texto - SEMPRE VISÍVEL */}
                    {lastResult.textResponse && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                          <p className="text-foreground leading-relaxed whitespace-pre-line">{lastResult.textResponse}</p>
                        </div>
                      </div>
                    )}

                    {/* Explicação/correções se houver */}
                    {lastResult.explanation && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {lastResult.explanation}
                      </p>
                    )}

                    {/* SQL (oculto por padrão) */}
                    {showSQL && (
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                        {lastResult.sql}
                      </pre>
                    )}

                    {/* Tabs para Tabela e Gráfico - só mostrar se houver dados */}
                    {(hasTableData || hasChartData) && (
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="text" className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Texto
                          </TabsTrigger>
                          {hasTableData && (
                            <TabsTrigger value="table" className="flex items-center gap-1">
                              <TableIcon className="h-3 w-3" />
                              Tabela ({lastResult.rowCount})
                            </TabsTrigger>
                          )}
                          {hasChartData && (
                            <TabsTrigger value="chart" className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3" />
                              Gráfico
                            </TabsTrigger>
                          )}
                        </TabsList>
                        
                        <TabsContent value="text" className="pt-4">
                          <div className="text-center text-muted-foreground py-8">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">A resposta em texto está acima.</p>
                            {hasTableData && <p className="text-xs mt-1">Clique em "Tabela" para ver os detalhes.</p>}
                          </div>
                        </TabsContent>
                        
                        {hasTableData && (
                          <TabsContent value="table">
                            <ScrollArea className="h-[300px]">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    {lastResult.data[0] && Object.keys(lastResult.data[0]).slice(0, 6).map((key) => (
                                      <TableHead key={key} className="text-xs">{key}</TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {lastResult.data.slice(0, 50).map((row, i) => (
                                    <TableRow key={i}>
                                      {Object.values(row).slice(0, 6).map((val, j) => (
                                        <TableCell key={j} className="text-sm">
                                          {typeof val === "number" 
                                            ? val > 1000 ? formatCurrency(val) : formatNumber(val, 2)
                                            : String(val ?? "-")}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </ScrollArea>
                          </TabsContent>
                        )}
                        
                        {hasChartData && (
                          <TabsContent value="chart" className="pt-4">
                            {renderChart()}
                          </TabsContent>
                        )}
                      </Tabs>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Executado em {lastResult.executionTimeMs}ms • {lastResult.rowCount} registros
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="p-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Faça uma pergunta ou selecione um relatório para começar</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Ex: "Quantas propostas estão em aberto?" ou "Qual o total de vendas em dezembro/2025?"
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
