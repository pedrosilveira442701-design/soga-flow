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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

import { useForecastPage, type ForecastPageParams, type InsightLevel } from "@/hooks/useForecastPage";

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Horizonte = 3 | 6 | 12;

function fmtBRL(v: number | undefined | null) {
  return (v ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function fmtPctRatio(v: number | undefined | null) {
  return `${((v ?? 0) * 100).toFixed(1)}%`;
}

const insightIcons: Record<InsightLevel, ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-success shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning shrink-0" />,
  destructive: <XCircle className="h-5 w-5 text-destructive shrink-0" />,
  muted: <Info className="h-5 w-5 text-muted-foreground shrink-0" />,
};

const insightBg: Record<InsightLevel, string> = {
  success: "bg-success/10 border-success/20",
  warning: "bg-warning/10 border-warning/20",
  destructive: "bg-destructive/10 border-destructive/20",
  muted: "bg-muted border-border",
};

// Paleta pastel/translúcida baseada nas cores do tema (consistente com o “sumário”)
const CHART = {
  baseline: { hex: "hsl(var(--primary))" },
  pipeline: { hex: "hsl(var(--chart-2))" },
  effort: { hex: "hsl(var(--chart-3))" },
  meta: { hex: "hsl(var(--success))" },
  realized: { hex: "hsl(var(--chart-4))" },
  grid: "hsl(var(--border))",
  text: "hsl(var(--muted-foreground))",
  axis: "hsl(var(--foreground))",
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

  const { data, isLoading, isFetching, refetch } = useForecastPage(params);

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

  // seed conversão/ticket com histórico (evita “≈ 0 propostas” por ticket 0)
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

  // Tooltip do histórico
  const tooltipFormatter = (value: number, name: string) => {
    if (name === "Conversão %") return [`${value.toFixed(1)}%`, name];
    return [fmtBRL(value), name];
  };

  // Dados do gráfico principal com chaves explícitas
  const fmChart = useMemo(() => {
    return (fm || []).map((m: any) => ({
      ...m,
      faturadoPlot: Number(m?.receitaReal || 0),
      forecastLine: Number(m?.forecastTotal || 0),
    }));
  }, [fm]);

  const yDomainMax = useMemo(() => {
    const vals = fmChart.flatMap((m: any) => [
      Number(m.baseline || 0),
      Number(m.pipelineAlloc || 0),
      Number(m.incrementalAlloc || 0),
      Number(m.forecastTotal || 0),
      Number(m.meta || 0),
      Number(m.faturadoPlot || 0),
    ]);
    const max = Math.max(0, ...vals);
    // margem visual + arredonda para “degraus” limpos
    const padded = max * 1.15;
    const step = 10000;
    return Math.max(step, Math.ceil(padded / step) * step);
  }, [fmChart]);

  const forecastTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    const faturado = Number(item.faturadoPlot || 0);

    return (
      <div className="bg-popover/95 backdrop-blur border border-border rounded-xl shadow-lg p-3 text-sm space-y-1 min-w-[260px]">
        <p className="font-semibold text-foreground border-b border-border/60 pb-1 mb-1">{label}</p>

        <Row label="Base" value={fmtBRL(item.baseline)} />
        <Row label="Pipeline" value={fmtBRL(item.pipelineAlloc)} />
        {Number(item.incrementalAlloc || 0) > 0 && <Row label="Esforço" value={fmtBRL(item.incrementalAlloc)} />}

        <div className="flex justify-between border-t border-border/60 pt-1 font-semibold">
          <span>Forecast</span>
          <span className="text-primary">{fmtBRL(item.forecastTotal)}</span>
        </div>

        <Row label="Meta" value={fmtBRL(item.meta)} valueClass="text-success" />
        <Row
          label="Realizado"
          value={faturado > 0 ? fmtBRL(faturado) : "—"}
          valueClass={faturado > 0 ? "text-foreground font-medium" : "text-muted-foreground"}
        />

        {Number(item.gap || 0) > 0 && (
          <>
            <div className="flex justify-between text-destructive">
              <span>Gap</span>
              <span>{fmtBRL(item.gap)}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Ação: +{fmtBRL(item.acaoNecessariaRS)} em propostas (~{item.propostasEquiv} prop.)
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-primary" />
            <h1 className="text-h2 text-foreground">Forecast de Faturamento</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Motor de decisão comercial baseado no pipeline real e histórico de 12 meses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs"
            disabled={isLoading || isFetching}
          >
            <RotateCcw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Atualizar
          </Button>

          <ToggleGroup
            type="single"
            value={String(horizonte)}
            onValueChange={handleHorizonteChange}
            className="bg-muted rounded-lg p-0.5"
          >
            {[3, 6, 12].map((h) => (
              <ToggleGroupItem
                key={h}
                value={String(h)}
                className="text-xs px-3 data-[state=on]:bg-card data-[state=on]:shadow-sm rounded-md"
              >
                {h}m
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {/* Aviso amostra pequena */}
      {bs?.amostraPequena && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Amostra pequena: apenas {bs.numContratos12m} contratos em 12 meses. Previsões podem estar distorcidas.
          </AlertDescription>
        </Alert>
      )}

      {/* Seleção mês foco */}
      {!isLoading && fm.length > 0 && (
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Mês foco:</span>

          <ToggleGroup
            type="single"
            value={String(safeMesFoco)}
            onValueChange={(v) => v !== undefined && v !== "" && setMesFoco(Number(v))}
            className="bg-muted rounded-lg p-0.5 flex-wrap"
          >
            {fm.map((m: any, i: number) => (
              <ToggleGroupItem
                key={i}
                value={String(i)}
                className="text-xs px-2.5 py-1 data-[state=on]:bg-card data-[state=on]:shadow-sm rounded-md"
              >
                {m.mes}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      {/* KPIs principais */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard
            icon={<DollarSign className="h-4 w-4" />}
            label="Receita s/ Esforço"
            value={fmtBRL((mesFocoData?.baseline || 0) + (mesFocoData?.pipelineAlloc || 0))}
            sub={`Base + pipeline · ${mesFocoData?.mes || ""}`}
          />
          <KPICard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Receita Projetada"
            value={fmtBRL(mesFocoData?.forecastTotal)}
            sub={valorAdicional > 0 ? "Com esforço adicional" : "Cenário atual"}
            variant={mesFocoData && mesFocoData.forecastTotal >= mesFocoData.meta ? "success" : undefined}
          />
          <KPICard
            icon={<Target className="h-4 w-4" />}
            label="Gap vs Meta"
            value={fmtBRL(mesFocoData?.gap)}
            variant={(mesFocoData?.gap || 0) > 0 ? "destructive" : "success"}
            sub={mesFocoData?.meta ? `Meta: ${fmtBRL(mesFocoData.meta)}` : "Sem meta definida"}
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
            sub={`${pipeline?.qtdPropostas || 0} propostas abertas`}
          />
          <KPICard
            icon={<Percent className="h-4 w-4" />}
            label="Conversão (12m)"
            value={fmtPctRatio(bs?.conversaoFinanceira)}
            sub={`Ticket: ${fmtBRL(bs?.ticketReal)}`}
          />
        </div>
      )}

      {/* CTA metas */}
      {!isLoading && metasAtivas.length === 0 && (
        <Alert>
          <Target className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            Nenhuma meta de vendas ativa encontrada.
            <Link to="/metas" className="text-primary font-medium hover:underline">
              Criar meta →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Simulador */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Simulador de Esforço Comercial</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Ajuste quanto pretende investir em novas propostas e veja o impacto no faturamento
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={resetControles} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" /> Resetar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Valor adicional em propostas (R$/mês)</Label>
                <Slider
                  min={0}
                  max={Math.max(500000, Math.round((bs?.volumeEnviadoMensal || 100000) * 3))}
                  step={5000}
                  value={[valorAdicional]}
                  onValueChange={([v]) => setValorAdicional(v)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{fmtBRL(valorAdicional)}/mês</span>
                  <span>Hist: {fmtBRL(bs?.volumeEnviadoMensal)}/mês</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Conversão financeira marginal (%)</Label>
                <Slider
                  min={5}
                  max={80}
                  step={1}
                  value={[Math.round(conversaoMarg * 100)]}
                  onValueChange={([v]) => setConversaoMarg(v / 100)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{(conversaoMarg * 100).toFixed(0)}%</span>
                  <span>Hist: {fmtPctRatio(bs?.conversaoFinanceira)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Ticket médio esperado (R$)</Label>
                <Slider
                  min={0}
                  max={Math.max(200000, Math.round((bs?.ticketReal || 50000) * 3))}
                  step={1000}
                  value={[ticketMarg]}
                  onValueChange={([v]) => setTicketMarg(v)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{fmtBRL(ticketMarg)}</span>
                  <span>Hist: {fmtBRL(bs?.ticketReal)}</span>
                </div>
              </div>
            </div>
          )}

          {!isLoading && valorAdicional > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 text-sm">
                <Crosshair className="h-4 w-4 text-primary" />
                <span className="text-foreground">
                  Gerando <strong>{fmtBRL(valorAdicional)}</strong>/mês com{" "}
                  <strong>{(conversaoMarg * 100).toFixed(0)}%</strong> de conversão ={" "}
                  <strong className="text-primary">{fmtBRL(valorAdicional * conversaoMarg)}</strong> de receita/mês.
                  {bs && bs.tempoMedioFechamentoDias > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      Impacto começa em ~{bs.tempoMedioFechamentoDias} dias.
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico principal (pastel, minimalista, coerente com sumário) */}
      <Card className="shadow-lg border-border/60 bg-card">
        <CardHeader className="pb-6 border-b border-border/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-base text-foreground">Forecast vs Meta — Mês a Mês</CardTitle>

            {/* legenda minimalista */}
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <LegendDot label="Base" color={CHART.baseline.hex} />
              <LegendDot label="Pipeline" color={CHART.pipeline.hex} />
              <LegendDot label="Esforço" color={CHART.effort.hex} />
              <LegendLine label="Meta" color={CHART.meta.hex} dashed />
              <LegendLine label="Realizado" color={CHART.realized.hex} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8 pl-0">
          {isLoading ? (
            <Skeleton className="h-[380px] w-full" />
          ) : (
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={fmChart} margin={{ top: 16, right: 24, bottom: 18, left: 0 }}>
                  <defs>
                    <linearGradient id="gradBaseline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.baseline.hex} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={CHART.baseline.hex} stopOpacity={0.12} />
                    </linearGradient>

                    <linearGradient id="gradPipeline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.pipeline.hex} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={CHART.pipeline.hex} stopOpacity={0.12} />
                    </linearGradient>

                    <linearGradient id="gradEffort" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.effort.hex} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={CHART.effort.hex} stopOpacity={0.12} />
                    </linearGradient>

                    <filter id="shadowRealized" height="140%">
                      <feDropShadow
                        dx="0"
                        dy="2"
                        stdDeviation="2"
                        floodColor={CHART.realized.hex}
                        floodOpacity="0.22"
                      />
                    </filter>
                  </defs>

                  <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={CHART.grid} opacity={0.45} />

                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12, fill: CHART.text }}
                    axisLine={false}
                    tickLine={false}
                    dy={12}
                  />

                  <YAxis
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12, fill: CHART.text }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
                    tickCount={6}
                    domain={[0, yDomainMax]}
                  />

                  <Tooltip content={forecastTooltip} cursor={{ fill: "rgba(241, 245, 249, 0.35)" }} />

                  <Bar dataKey="baseline" fill="url(#gradBaseline)" stackId="forecast" barSize={44} />
                  <Bar dataKey="pipelineAlloc" fill="url(#gradPipeline)" stackId="forecast" barSize={44} />

                  {valorAdicional > 0 ? (
                    <Bar
                      dataKey="incrementalAlloc"
                      fill="url(#gradEffort)"
                      stackId="forecast"
                      radius={[10, 10, 0, 0]}
                      barSize={44}
                    />
                  ) : (
                    <Bar
                      dataKey="pipelineAlloc"
                      fill="url(#gradPipeline)"
                      stackId="forecast"
                      radius={[10, 10, 0, 0]}
                      barSize={44}
                    />
                  )}

                  <Line
                    dataKey="meta"
                    type="step"
                    stroke={CHART.meta.hex}
                    strokeWidth={2}
                    strokeDasharray="4 6"
                    dot={false}
                  />

                  <Line
                    dataKey="faturadoPlot"
                    type="monotone"
                    stroke={CHART.realized.hex}
                    strokeWidth={3.5}
                    filter="url(#shadowRealized)"
                    dot={{
                      r: 5,
                      fill: "hsl(var(--background))",
                      stroke: CHART.realized.hex,
                      strokeWidth: 2.5,
                    }}
                    activeDot={{ r: 7, strokeWidth: 0, fill: CHART.realized.hex }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico 12m — Valor Enviado vs Fechado (R$)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[280px]" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={vh}>
                <CartesianGrid strokeDasharray="3 6" className="opacity-40" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={46} />
                <Tooltip formatter={tooltipFormatter} />

                <Bar
                  dataKey="valorEnviado"
                  name="Valor Enviado (R$)"
                  fill={CHART.baseline.hex}
                  opacity={0.25}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="valorFechado"
                  name="Valor Fechado (R$)"
                  fill={CHART.pipeline.hex}
                  opacity={0.35}
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  dataKey="conversaoFinanceira"
                  name="Conversão %"
                  type="monotone"
                  stroke={CHART.realized.hex}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Pipeline breakdown */}
      {!isLoading && pipeline && pipeline.qtdPropostas > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Pipeline Atual — Receita Esperada por Estágio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(pipeline.porEstagio)
                .sort(([, a]: any, [, b]: any) => b.ponderado - a.ponderado)
                .map(([estagio, info]: any) => (
                  <div key={estagio} className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-xs text-muted-foreground capitalize truncate">
                      {String(estagio).replace(/_/g, " ")}
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-1">{fmtBRL(info.ponderado)}</p>
                    <p className="text-xs text-muted-foreground">
                      {info.qtd} prop. · {fmtBRL(info.valor)} bruto
                    </p>
                  </div>
                ))}
            </div>

            <div className="mt-3 flex items-center gap-4 text-sm flex-wrap">
              <span className="text-muted-foreground">
                Total bruto: <strong className="text-foreground">{fmtBRL(pipeline.valorBruto)}</strong>
              </span>
              <span className="text-muted-foreground">
                Ponderado: <strong className="text-primary">{fmtBRL(pipeline.valorPonderado)}</strong>
              </span>
              <span className="text-muted-foreground">
                <Clock className="h-3.5 w-3.5 inline mr-1" />
                Fechamento (P50): <strong className="text-foreground">{bs?.tempoMedioFechamentoDias || "—"}d</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-warning" />
            <h2 className="text-base font-semibold text-foreground">Insights</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.map((ins: any, i: number) => (
              <div key={i} className={cn("flex items-start gap-3 p-4 rounded-xl border", insightBg[ins.level])}>
                {insightIcons[ins.level]}
                <p className="text-sm text-foreground">{ins.text}</p>
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
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: ReactNode;
  variant?: "destructive" | "success";
}) {
  return (
    <Card className="p-3 border-border/60">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium truncate">{label}</span>
      </div>

      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          variant === "destructive" && "text-destructive",
          variant === "success" && "text-success",
        )}
      >
        {value}
      </p>

      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

function Row({ label, value, valueClass }: { label: string; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color, opacity: 0.35 }} />
      <span>{label}</span>
    </div>
  );
}

function LegendLine({ label, color, dashed }: { label: string; color: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block w-5 h-[2px] rounded-full"
        style={{
          backgroundColor: color,
          opacity: 0.85,
          backgroundImage: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 6px, transparent 6px 12px)`
            : undefined,
        }}
      />
      <span>{label}</span>
    </div>
  );
}
