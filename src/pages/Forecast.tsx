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

// Cores do gráfico: MESMAS famílias do sumário (CSS vars), só suavizadas
const COLORS = {
  baseline: { solid: "hsl(var(--primary))" },
  pipeline: { solid: "hsl(var(--chart-2))" },
  effort: { solid: "hsl(var(--chart-3))" },
  meta: { solid: "hsl(var(--destructive))" },
  realized: { solid: "hsl(var(--chart-4))" },

  grid: "hsl(var(--border) / 0.35)",
  axis: "hsl(var(--muted-foreground) / 0.85)",
  cursor: "hsl(var(--muted) / 0.35)",
};

// y-axis “bonito”
function niceCeil(n: number) {
  if (!isFinite(n) || n <= 0) return 1000;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const base = n / pow;
  let niceBase = 10;
  if (base <= 1) niceBase = 1;
  else if (base <= 2) niceBase = 2;
  else if (base <= 5) niceBase = 5;
  else niceBase = 10;
  return niceBase * pow;
}

function buildTicks(maxValue: number, tickCount = 6) {
  const safeMax = Math.max(0, maxValue);
  const top = niceCeil(safeMax * 1.12);
  const rawStep = top / (tickCount - 1);
  const step = niceCeil(rawStep);
  const yTop = step * (tickCount - 1);
  const ticks = Array.from({ length: tickCount }, (_, i) => i * step);
  return { yTop, ticks };
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

  // seed controls a partir do histórico (evita 0 prop / ticket 0)
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

  // dataset do gráfico (linhas sempre com número)
  const fmChart = useMemo(() => {
    return fm.map((m) => ({
      ...m,
      faturadoPlot: Number(m?.receitaReal || 0),
      forecastLine: Number(m?.forecastTotal || 0),
      stackTotal: Number(m?.baseline || 0) + Number(m?.pipelineAlloc || 0) + Number(m?.incrementalAlloc || 0),
    }));
  }, [fm]);

  // escala Y correta
  const { yTop, yTicks } = useMemo(() => {
    const maxY = fmChart.reduce((acc, m) => {
      const meta = Number(m?.meta || 0);
      const total = Number(m?.stackTotal || 0);
      const realizado = Number(m?.faturadoPlot || 0);
      return Math.max(acc, meta, total, realizado);
    }, 0);

    return buildTicks(maxY, 6);
  }, [fmChart]);

  const tooltipHistorico = (value: number, name: string) => {
    if (name === "Conversão %") return [`${value.toFixed(1)}%`, name];
    return [fmtBRL(value), name];
  };

  const forecastTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    const faturado = Number(item.faturadoPlot || 0);

    return (
      <div className="bg-popover/95 backdrop-blur border border-border/70 rounded-xl shadow-lg p-3 text-sm space-y-1 min-w-[260px]">
        <p className="font-semibold text-foreground border-b border-border/60 pb-1 mb-1">{label}</p>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Base</span>
          <span className="text-foreground">{fmtBRL(item.baseline)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Pipeline</span>
          <span className="text-foreground">{fmtBRL(item.pipelineAlloc)}</span>
        </div>

        {Number(item.incrementalAlloc) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Esforço</span>
            <span className="text-foreground">{fmtBRL(item.incrementalAlloc)}</span>
          </div>
        )}

        <div className="flex justify-between border-t border-border/60 pt-1 font-semibold">
          <span className="text-foreground">Forecast</span>
          <span className="text-primary">{fmtBRL(item.forecastTotal)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Meta</span>
          <span className="text-success">{fmtBRL(item.meta)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Realizado</span>
          <span className={faturado > 0 ? "text-foreground font-medium" : "text-muted-foreground"}>
            {faturado > 0 ? fmtBRL(faturado) : "—"}
          </span>
        </div>

        {Number(item.gap) > 0 && (
          <>
            <div className="flex justify-between text-destructive">
              <span>Gap</span>
              <span>{fmtBRL(item.gap)}</span>
            </div>
            <div className="text-xs text-warning mt-1">
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
            {fm.map((m, i) => (
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

      {/* Linha extra de KPIs do mês foco */}
      {!isLoading && mesFocoData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Receita Projetada"
            value={fmtBRL(mesFocoData.forecastTotal)}
            sub={mesFocoData.mes}
          />
          <KPICard
            icon={<DollarSign className="h-4 w-4" />}
            label="Receita Real"
            value={mesFocoData.receitaReal > 0 ? fmtBRL(mesFocoData.receitaReal) : "—"}
            sub={mesFocoData.receitaReal > 0 ? `Fechado em ${mesFocoData.mes}` : "Sem fechamentos"}
          />
          <KPICard
            icon={<Percent className="h-4 w-4" />}
            label="Margem Real"
            value={mesFocoData.margemReal !== null ? `${mesFocoData.margemReal.toFixed(1)}%` : "—"}
            sub={mesFocoData.margemReal !== null ? `Custo: ${fmtBRL(mesFocoData.custoReal)}` : "Sem dados de margem"}
          />
          <KPICard
            icon={<BarChart3 className="h-4 w-4" />}
            label="Delta vs Forecast"
            value={(() => {
              if (mesFocoData.receitaReal === 0) return "—";
              const delta = mesFocoData.receitaReal - mesFocoData.forecastTotal;
              return `${delta >= 0 ? "+" : ""}${fmtBRL(delta)}`;
            })()}
            variant={(() => {
              if (mesFocoData.receitaReal === 0) return undefined;
              const delta = mesFocoData.receitaReal - mesFocoData.forecastTotal;
              if (delta > 0) return "success" as const;
              if (delta < 0) return "destructive" as const;
              return undefined;
            })()}
            sub={(() => {
              if (mesFocoData.receitaReal === 0) return "Aguardando fechamentos";
              const delta = mesFocoData.receitaReal - mesFocoData.forecastTotal;
              if (delta > 0) return "acima do projetado";
              if (delta < 0) return "abaixo do projetado";
              return "igual ao projetado";
            })()}
          />
        </div>
      )}

      {/* KPI Cards */}
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
      <Card className="border-border/60 bg-card">
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

      {/* GRÁFICO PRINCIPAL (minimalista, pastel e alinhado ao sumário) */}
      <Card className="border-border/60 bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-base text-foreground">Projeção vs Meta</CardTitle>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.baseline.solid, opacity: 0.55 }} />
                Base
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.pipeline.solid, opacity: 0.55 }} />
                Pipeline
              </div>
              {valorAdicional > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.effort.solid, opacity: 0.55 }} />
                  Esforço
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ background: COLORS.meta.solid, opacity: 0.9 }} />
                Meta
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ background: COLORS.realized.solid, opacity: 0.9 }} />
                Realizado
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {isLoading ? (
            <Skeleton className="h-[340px]" />
          ) : (
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={fmChart}
                  margin={{ top: 14, right: 18, bottom: 8, left: 6 }}
                  barCategoryGap="22%"
                  barGap={6}
                >
                  <defs>
                    <linearGradient id="gradBaseline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.baseline.solid} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={COLORS.baseline.solid} stopOpacity={0.18} />
                    </linearGradient>

                    <linearGradient id="gradPipeline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.pipeline.solid} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={COLORS.pipeline.solid} stopOpacity={0.18} />
                    </linearGradient>

                    <linearGradient id="gradEffort" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.effort.solid} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={COLORS.effort.solid} stopOpacity={0.18} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid stroke={COLORS.grid} strokeDasharray="4 6" vertical={false} />

                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12, fill: COLORS.axis }}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                  />

                  <YAxis
                    domain={[0, yTop]}
                    ticks={yTicks}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12, fill: COLORS.axis }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />

                  <Tooltip content={forecastTooltip} cursor={{ fill: COLORS.cursor }} />

                  <Bar
                    dataKey="baseline"
                    name="Base"
                    fill="url(#gradBaseline)"
                    stackId="forecast"
                    barSize={34}
                    radius={[0, 0, 0, 0]}
                    isAnimationActive={false}
                  />

                  <Bar
                    dataKey="pipelineAlloc"
                    name="Pipeline"
                    fill="url(#gradPipeline)"
                    stackId="forecast"
                    barSize={34}
                    radius={valorAdicional > 0 ? [0, 0, 0, 0] : [8, 8, 0, 0]}
                    isAnimationActive={false}
                  />

                  {valorAdicional > 0 && (
                    <Bar
                      dataKey="incrementalAlloc"
                      name="Esforço"
                      fill="url(#gradEffort)"
                      stackId="forecast"
                      barSize={34}
                      radius={[8, 8, 0, 0]}
                      isAnimationActive={false}
                    />
                  )}

                  <Line
                    dataKey="forecastLine"
                    name="Forecast"
                    type="monotone"
                    stroke={COLORS.baseline.solid}
                    strokeOpacity={0.55}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />

                  <Line
                    dataKey="meta"
                    name="Meta"
                    type="monotone"
                    stroke={COLORS.meta.solid}
                    strokeOpacity={0.85}
                    strokeWidth={2}
                    strokeDasharray="6 6"
                    dot={false}
                    isAnimationActive={false}
                  />

                  {/* Realizado sempre aparece (mesmo 0), com dots visíveis */}
                  <Line
                    dataKey="faturadoPlot"
                    name="Realizado"
                    type="monotone"
                    stroke={COLORS.realized.solid}
                    strokeOpacity={0.95}
                    strokeWidth={3}
                    dot={{
                      r: 4.5,
                      fill: "hsl(var(--background))",
                      stroke: COLORS.realized.solid,
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card className="border-border/60 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico 12m — Valor Enviado vs Fechado (R$)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[280px]" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={vh}>
                <CartesianGrid strokeDasharray="4 6" className="opacity-40" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: COLORS.axis }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: COLORS.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: COLORS.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={tooltipHistorico} cursor={{ fill: COLORS.cursor }} />

                <Bar
                  yAxisId="left"
                  dataKey="valorEnviado"
                  name="Valor Enviado (R$)"
                  fill={COLORS.baseline.solid}
                  opacity={0.35}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  yAxisId="left"
                  dataKey="valorFechado"
                  name="Valor Fechado (R$)"
                  fill={COLORS.pipeline.solid}
                  opacity={0.55}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  dataKey="conversaoFinanceira"
                  name="Conversão %"
                  type="monotone"
                  stroke={COLORS.realized.solid}
                  strokeWidth={2}
                  dot={{ r: 2.5, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Pipeline breakdown */}
      {!isLoading && pipeline && pipeline.qtdPropostas > 0 && (
        <Card className="border-border/60 bg-card">
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
                  <div key={estagio} className="p-3 rounded-xl bg-muted/40 border border-border/70">
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
    <Card className="p-3 border-border/60 bg-card">
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
