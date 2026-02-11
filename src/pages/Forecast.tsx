import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  TrendingUp,
  RotateCcw,
  Target,
  DollarSign,
  BarChart3,
  Percent,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  FileText,
  Clock,
  PieChart,
  Crosshair,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useForecastPage, type ForecastPageParams, type InsightLevel } from "@/hooks/useForecastPage";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Horizonte = 3 | 6 | 12;

function fmtBRL(v: number | undefined | null) {
  return (v ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function fmtPctRatio(v: number | undefined | null) {
  // v no formato 0..1
  return `${((v ?? 0) * 100).toFixed(1)}%`;
}

const insightIcons: Record<InsightLevel, ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
  destructive: <XCircle className="h-5 w-5 text-rose-600 shrink-0" />,
  muted: <Info className="h-5 w-5 text-slate-500 shrink-0" />,
};

// Cores mais suaves e modernas para os insights
const insightStyles: Record<InsightLevel, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  destructive: "bg-rose-50 border-rose-200 text-rose-900",
  muted: "bg-slate-50 border-slate-200 text-slate-700",
};

export default function Forecast() {
  const [horizonte, setHorizonte] = useState<Horizonte>(6);
  const [mesFoco, setMesFoco] = useState(0);

  const [valorAdicional, setValorAdicional] = useState(0);
  const [conversaoMarg, setConversaoMarg] = useState(0.3);
  const [ticketMarg, setTicketMarg] = useState(0);

  const params: ForecastPageParams = useMemo(
    () => ({
      horizonte,
      valorAdicionalMensal: valorAdicional,
      conversaoMarginal: conversaoMarg,
      ticketMarginal: ticketMarg,
    }),
    [horizonte, valorAdicional, conversaoMarg, ticketMarg],
  );

  const { data, isLoading } = useForecastPage(params);

  const bs = data?.baseStats;
  const pipeline = data?.pipeline;
  const fm = data?.forecastMensal || [];
  const vh = data?.volumeHistorico || [];
  const insights = data?.insights || [];
  const metasAtivas = data?.metasAtivas || [];

  const safeMesFoco = mesFoco < fm.length ? mesFoco : 0;
  const mesFocoData = fm[safeMesFoco] || null;

  const handleHorizonteChange = useCallback((v: string) => {
    if (!v) return;
    setHorizonte(Number(v) as Horizonte);
    setMesFoco(0);
  }, []);

  useEffect(() => {
    if (!bs) return;
    if (conversaoMarg === 0.3 && bs.conversaoFinanceira > 0) {
      setConversaoMarg(bs.conversaoFinanceira);
    }
    if (ticketMarg === 0 && bs.ticketReal > 0) {
      setTicketMarg(bs.ticketReal);
    }
  }, [bs, conversaoMarg, ticketMarg]);

  const resetControles = useCallback(() => {
    setValorAdicional(0);
    setConversaoMarg(bs?.conversaoFinanceira || 0.3);
    setTicketMarg(bs?.ticketReal || 0);
  }, [bs]);

  const tooltipFormatter = (value: number, name: string) => {
    if (name === "Conversão %") return [`${value.toFixed(1)}%`, name];
    return [fmtBRL(value), name];
  };

  const fmChart = useMemo(() => {
    return (fm || []).map((m: any) => ({
      ...m,
      faturadoPlot: Number(m?.receitaReal || 0),
      forecastLine: Number(m?.forecastTotal || 0),
    }));
  }, [fm]);

  const forecastTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;
    const faturado = Number(item.faturadoPlot || 0);

    return (
      <div className="bg-popover border border-border/50 rounded-lg shadow-xl p-4 text-sm space-y-2 min-w-[260px] animate-in fade-in-50">
        <p className="font-semibold text-foreground border-b border-border pb-2 mb-2 text-base">{label}</p>

        <div className="space-y-1">
          <div className="flex justify-between text-muted-foreground text-xs uppercase tracking-wider font-medium">
            <span>Composição</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" /> Baseline
            </span>
            <span className="font-mono">{fmtBRL(item.baseline)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-chart-2" /> Pipeline
            </span>
            <span className="font-mono">{fmtBRL(item.pipelineAlloc)}</span>
          </div>
          {item.incrementalAlloc > 0 && (
            <div className="flex justify-between items-center text-chart-3">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-chart-3" /> Esforço
              </span>
              <span className="font-mono font-medium">{fmtBRL(item.incrementalAlloc)}</span>
            </div>
          )}
        </div>

        <div className="border-t border-border/50 my-2 pt-2">
          <div className="flex justify-between items-center font-bold text-base">
            <span>Forecast</span>
            <span className="text-primary">{fmtBRL(item.forecastTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-muted-foreground">Meta</span>
            <span className="text-muted-foreground font-mono">{fmtBRL(item.meta)}</span>
          </div>
        </div>

        <div className="bg-muted/30 -mx-4 -mb-4 p-3 border-t border-border/50 rounded-b-lg">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Faturado Real</span>
            <span className={cn("font-bold font-mono", faturado > 0 ? "text-foreground" : "text-muted-foreground")}>
              {faturado > 0 ? fmtBRL(faturado) : "—"}
            </span>
          </div>

          {item.gap > 0 && (
            <div className="mt-2 pt-2 border-t border-border/10">
              <div className="flex justify-between text-destructive font-medium text-xs">
                <span>Gap p/ Meta</span>
                <span>{fmtBRL(item.gap)}</span>
              </div>
              <div className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Necessário: +{fmtBRL(item.acaoNecessariaRS)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Forecast de Faturamento</h1>
          </div>
          <p className="text-muted-foreground text-base max-w-2xl pl-[3.25rem]">
            Motor de decisão comercial baseado no pipeline real e histórico de 12 meses.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Horizonte</span>
          <ToggleGroup
            type="single"
            value={String(horizonte)}
            onValueChange={handleHorizonteChange}
            className="bg-muted p-1 rounded-lg border"
          >
            {[3, 6, 12].map((h) => (
              <ToggleGroupItem
                key={h}
                value={String(h)}
                className="text-sm px-4 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm rounded-md transition-all font-medium"
              >
                {h} meses
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {/* Aviso amostra pequena */}
      {bs?.amostraPequena && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção aos dados</AlertTitle>
          <AlertDescription>
            Amostra pequena: apenas <strong>{bs.numContratos12m} contratos</strong> em 12 meses. As previsões
            automáticas podem apresentar distorções.
          </AlertDescription>
        </Alert>
      )}

      {/* Seleção mês foco */}
      {!isLoading && fm.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 bg-muted/20 p-4 rounded-xl border border-dashed">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Análise Detalhada:</span>
          </div>

          <ToggleGroup
            type="single"
            value={String(safeMesFoco)}
            onValueChange={(v) => v !== undefined && v !== "" && setMesFoco(Number(v))}
            className="flex-wrap justify-start gap-1"
          >
            {fm.map((m: any, i: number) => (
              <ToggleGroupItem
                key={i}
                value={String(i)}
                className="text-xs px-3 py-1.5 h-auto data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-muted-foreground/10 rounded-full border border-transparent data-[state=on]:border-primary transition-all"
              >
                {m.mes}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      {/* KPIs do mês foco (Destaque) */}
      {!isLoading && mesFocoData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Receita Projetada"
            value={fmtBRL(mesFocoData.forecastTotal)}
            sub={<span className="font-medium text-primary">{mesFocoData.mes}</span>}
            highlight
          />
          <KPICard
            icon={<DollarSign className="h-5 w-5" />}
            label="Receita Real"
            value={mesFocoData.receitaReal > 0 ? fmtBRL(mesFocoData.receitaReal) : "—"}
            sub={mesFocoData.receitaReal > 0 ? "Fechado" : "Em aberto"}
          />
          <KPICard
            icon={<Percent className="h-5 w-5" />}
            label="Margem Real"
            value={mesFocoData.margemReal !== null ? `${mesFocoData.margemReal.toFixed(1)}%` : "—"}
            sub={mesFocoData.margemReal !== null ? `Custo: ${fmtBRL(mesFocoData.custoReal)}` : "—"}
          />
          <KPICard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Delta vs Forecast"
            value={(() => {
              if (mesFocoData.receitaReal === 0) return "—";
              const delta = mesFocoData.receitaReal - mesFocoData.forecastTotal;
              return `${delta >= 0 ? "+" : ""}${fmtBRL(delta)}`;
            })()}
            variant={(() => {
              if (mesFocoData.receitaReal === 0) return undefined;
              const delta = mesFocoData.receitaReal - mesFocoData.forecastTotal;
              return delta > 0 ? "success" : delta < 0 ? "destructive" : undefined;
            })()}
            sub={(() => {
              if (mesFocoData.receitaReal === 0) return "Aguardando";
              const delta = mesFocoData.receitaReal - mesFocoData.forecastTotal;
              return delta > 0 ? "Acima do previsto" : "Abaixo do previsto";
            })()}
          />
        </div>
      )}

      {/* KPI Cards Gerais */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Indicadores Gerais
        </h3>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KPICard
              icon={<DollarSign className="h-4 w-4" />}
              label="Base + Pipeline"
              value={fmtBRL((mesFocoData?.baseline || 0) + (mesFocoData?.pipelineAlloc || 0))}
              sub="Sem esforço extra"
            />
            <KPICard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Total Projetado"
              value={fmtBRL(mesFocoData?.forecastTotal)}
              sub={valorAdicional > 0 ? "+ Esforço Adic." : "Cenário base"}
              variant={mesFocoData && mesFocoData.forecastTotal >= mesFocoData.meta ? "success" : undefined}
            />
            <KPICard
              icon={<Target className="h-4 w-4" />}
              label="Gap vs Meta"
              value={fmtBRL(mesFocoData?.gap)}
              variant={(mesFocoData?.gap || 0) > 0 ? "destructive" : "success"}
              sub={mesFocoData?.meta ? `Meta: ${fmtBRL(mesFocoData.meta)}` : "—"}
            />
            <KPICard
              icon={<FileText className="h-4 w-4" />}
              label="Ação Necessária"
              value={fmtBRL(mesFocoData?.acaoNecessariaRS)}
              sub={`≈ ${mesFocoData?.propostasEquiv || 0} propostas`}
            />
            <KPICard
              icon={<PieChart className="h-4 w-4" />}
              label="Pipeline Vivo"
              value={fmtBRL(pipeline?.valorPonderado)}
              sub={`${pipeline?.qtdPropostas || 0} abertas`}
            />
            <KPICard
              icon={<Percent className="h-4 w-4" />}
              label="Conversão Hist."
              value={fmtPctRatio(bs?.conversaoFinanceira)}
              sub={`Ticket ${fmtBRL(bs?.ticketReal)}`}
            />
          </div>
        )}
      </div>

      {/* CTA metas */}
      {!isLoading && metasAtivas.length === 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <Target className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center gap-2 text-amber-900">
            Nenhuma meta de vendas ativa encontrada para este período.
            <Link to="/metas" className="font-semibold hover:underline">
              Configurar metas →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Simulador */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-muted/20 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-primary" />
                Simulador de Esforço Comercial
              </CardTitle>
              <CardDescription>
                Ajuste os parâmetros abaixo para simular cenários de investimento em novas propostas.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetControles}
              className="gap-2 h-8 text-xs hover:bg-background"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restaurar Padrões
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-2">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium text-muted-foreground">Volume de Propostas (+R$)</Label>
                  <span className="text-sm font-bold text-foreground">
                    {fmtBRL(valorAdicional)}
                    <span className="text-xs font-normal text-muted-foreground">/mês</span>
                  </span>
                </div>
                <Slider
                  min={0}
                  max={Math.max(500000, Math.round((bs?.volumeEnviadoMensal || 100000) * 3))}
                  step={5000}
                  value={[valorAdicional]}
                  onValueChange={([v]) => setValorAdicional(v)}
                  className="py-2"
                />
                <div className="text-xs text-muted-foreground text-right">
                  Média Histórica: {fmtBRL(bs?.volumeEnviadoMensal)}/mês
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium text-muted-foreground">Taxa de Conversão</Label>
                  <span className="text-sm font-bold text-foreground">{(conversaoMarg * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  min={5}
                  max={80}
                  step={1}
                  value={[Math.round(conversaoMarg * 100)]}
                  onValueChange={([v]) => setConversaoMarg(v / 100)}
                  className="py-2"
                />
                <div className="text-xs text-muted-foreground text-right">
                  Média Histórica: {fmtPctRatio(bs?.conversaoFinanceira)}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium text-muted-foreground">Ticket Médio</Label>
                  <span className="text-sm font-bold text-foreground">{fmtBRL(ticketMarg)}</span>
                </div>
                <Slider
                  min={0}
                  max={Math.max(200000, Math.round((bs?.ticketReal || 50000) * 3))}
                  step={1000}
                  value={[ticketMarg]}
                  onValueChange={([v]) => setTicketMarg(v)}
                  className="py-2"
                />
                <div className="text-xs text-muted-foreground text-right">
                  Média Histórica: {fmtBRL(bs?.ticketReal)}
                </div>
              </div>
            </div>
          )}

          {!isLoading && valorAdicional > 0 && (
            <div className="mt-8 p-4 rounded-lg bg-primary/10 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="bg-background p-2 rounded-full border border-primary/20 shadow-sm">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm text-foreground">
                  Ao investir <strong>{fmtBRL(valorAdicional)}</strong> extras em propostas, com conversão de{" "}
                  <strong>{(conversaoMarg * 100).toFixed(0)}%</strong>, você projeta gerar:
                </div>
              </div>
              <div className="flex items-baseline gap-2 bg-background px-4 py-2 rounded-md shadow-sm border border-primary/10">
                <span className="text-xs text-muted-foreground font-medium uppercase">Receita Adicional</span>
                <strong className="text-lg text-primary">
                  {fmtBRL(valorAdicional * conversaoMarg)}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </strong>
              </div>
            </div>
          )}

          {bs && bs.tempoMedioFechamentoDias > 0 && valorAdicional > 0 && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              <Clock className="w-3 h-3 inline mr-1" />
              Ciclo de vendas: O impacto financeiro deve iniciar em aproximadamente {bs.tempoMedioFechamentoDias} dias.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Gráfico principal */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-lg">Projeção vs Meta</CardTitle>
          <CardDescription>Acompanhamento mensal do realizado e previsto</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={fmChart} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />
                  <Tooltip content={forecastTooltip} cursor={{ fill: "hsl(var(--muted)/0.4)" }} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />

                  <Bar
                    dataKey="baseline"
                    name="Contratos Base"
                    fill="hsl(var(--primary))"
                    stackId="forecast"
                    radius={[0, 0, 0, 0]}
                    barSize={32}
                    fillOpacity={0.9}
                  />
                  <Bar
                    dataKey="pipelineAlloc"
                    name="Pipeline Ponderado"
                    fill="hsl(var(--chart-2))"
                    stackId="forecast"
                    radius={[0, 0, 0, 0]}
                    barSize={32}
                  />
                  {valorAdicional > 0 && (
                    <Bar
                      dataKey="incrementalAlloc"
                      name="Esforço Adicional"
                      fill="hsl(var(--chart-3))"
                      stackId="forecast"
                      radius={[4, 4, 0, 0]}
                      barSize={32}
                    />
                  )}

                  <Line
                    dataKey="forecastLine"
                    name="Total Previsto"
                    type="monotone"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={false}
                  />

                  <Line
                    dataKey="meta"
                    name="Meta"
                    type="step"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />

                  <Line
                    dataKey="faturadoPlot"
                    name="Realizado"
                    type="monotone"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "hsl(var(--background))",
                      stroke: "hsl(var(--chart-4))",
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Histórico */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-base">Histórico (12 meses)</CardTitle>
            <CardDescription>Correlação entre valor enviado em propostas e fechamento real</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={vh} margin={{ top: 10, right: 0, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={tooltipFormatter}
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />

                    <Bar
                      yAxisId="left"
                      dataKey="valorEnviado"
                      name="Enviado (R$)"
                      fill="hsl(var(--primary))"
                      radius={[2, 2, 0, 0]}
                      opacity={0.3}
                      barSize={20}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="valorFechado"
                      name="Fechado (R$)"
                      fill="hsl(var(--primary))"
                      radius={[2, 2, 0, 0]}
                      barSize={20}
                    />
                    <Line
                      yAxisId="right"
                      dataKey="conversaoFinanceira"
                      name="Conv. %"
                      type="monotone"
                      stroke="hsl(var(--chart-5))"
                      strokeWidth={2}
                      dot={{ r: 2, fill: "hsl(var(--chart-5))" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline breakdown */}
        {!isLoading && pipeline && pipeline.qtdPropostas > 0 && (
          <Card className="shadow-sm flex flex-col">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Pipeline por Estágio
              </CardTitle>
              <CardDescription>Valor ponderado pela probabilidade de fechamento</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(pipeline.porEstagio)
                  .sort(([, a]: any, [, b]: any) => b.ponderado - a.ponderado)
                  .map(([estagio, info]: any) => (
                    <div key={estagio} className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          {String(estagio).replace(/_/g, " ")}
                        </p>
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                          {info.qtd}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-foreground tracking-tight">{fmtBRL(info.ponderado)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 border-t pt-1 border-dashed border-border/60">
                        {fmtBRL(info.valor)} bruto
                      </p>
                    </div>
                  ))}
              </div>

              <div className="mt-6 pt-4 border-t flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Bruto</span>
                  <span className="font-medium">{fmtBRL(pipeline.valorBruto)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Ponderado</span>
                  <span className="font-bold text-primary text-base">{fmtBRL(pipeline.valorPonderado)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="pt-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-yellow-100 rounded-md">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Insights Automáticos</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((ins: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border shadow-sm transition-all hover:shadow-md",
                  insightStyles[ins.level],
                )}
              >
                <div className="mt-0.5 bg-white/50 p-1.5 rounded-full shadow-sm border border-black/5">
                  {insightIcons[ins.level]}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-relaxed">{ins.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
  sub,
  variant,
  highlight = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: ReactNode;
  variant?: "destructive" | "success";
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        "p-4 transition-all hover:shadow-md border-l-4 border-l-transparent",
        highlight ? "ring-2 ring-primary/10 border-l-primary bg-primary/5" : "hover:border-l-primary/30",
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate pr-2">
          {label}
        </span>
        <div
          className={cn(
            "p-1.5 rounded-full",
            highlight ? "bg-background text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </div>
      </div>

      <div className="space-y-1">
        <p
          className={cn(
            "text-2xl font-bold tracking-tight tabular-nums",
            variant === "destructive" && "text-destructive",
            variant === "success" && "text-success",
          )}
        >
          {value}
        </p>

        {sub && <div className="text-xs text-muted-foreground font-medium">{sub}</div>}
      </div>
    </Card>
  );
}
