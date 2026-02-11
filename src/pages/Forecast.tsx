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
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from "recharts";

// --- Configuração de Cores Pastel e Design ---
const PASTEL_COLORS = {
  text: "#64748b", // Slate 500 (substituto do preto)
  grid: "#e2e8f0", // Slate 200
  baseline: { start: "#818cf8", end: "#c7d2fe" }, // Indigo Soft
  pipeline: { start: "#a78bfa", end: "#ddd6fe" }, // Violet Soft
  effort: { start: "#34d399", end: "#6ee7b7" }, // Emerald Soft
  realized: "#3b82f6", // Blue 500 (Line)
  meta: "#f43f5e", // Rose 500 (Line)
};

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
  success: <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
  destructive: <XCircle className="h-5 w-5 text-rose-500 shrink-0" />,
  muted: <Info className="h-5 w-5 text-slate-400 shrink-0" />,
};

const insightStyles: Record<InsightLevel, string> = {
  success: "bg-emerald-50/50 border-emerald-100 text-emerald-900",
  warning: "bg-amber-50/50 border-amber-100 text-amber-900",
  destructive: "bg-rose-50/50 border-rose-100 text-rose-900",
  muted: "bg-slate-50/50 border-slate-100 text-slate-700",
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

  // Tooltip customizado com design mais limpo
  const forecastTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;
    const faturado = Number(item.faturadoPlot || 0);

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-100 rounded-xl shadow-2xl p-4 text-sm min-w-[240px] text-slate-600">
        <p className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 text-base">{label}</p>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-slate-400">
              <div className="w-2 h-2 rounded-full" style={{ background: PASTEL_COLORS.baseline.start }} />
              Baseline
            </span>
            <span className="font-medium text-slate-700">{fmtBRL(item.baseline)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-slate-400">
              <div className="w-2 h-2 rounded-full" style={{ background: PASTEL_COLORS.pipeline.start }} />
              Pipeline
            </span>
            <span className="font-medium text-slate-700">{fmtBRL(item.pipelineAlloc)}</span>
          </div>
          {item.incrementalAlloc > 0 && (
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-slate-400">
                <div className="w-2 h-2 rounded-full" style={{ background: PASTEL_COLORS.effort.start }} />
                Esforço
              </span>
              <span className="font-medium text-emerald-600">{fmtBRL(item.incrementalAlloc)}</span>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 my-3 pt-2">
          <div className="flex justify-between items-center font-bold text-base text-slate-800">
            <span>Forecast</span>
            <span>{fmtBRL(item.forecastTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-xs mt-1 text-slate-400">
            <span>Meta Estipulada</span>
            <span className="font-mono">{fmtBRL(item.meta)}</span>
          </div>
        </div>

        <div className="bg-slate-50 -mx-4 -mb-4 p-3 rounded-b-xl border-t border-slate-100">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Realizado</span>
            <span className={cn("font-bold", faturado > 0 ? "text-blue-600" : "text-slate-400")}>
              {faturado > 0 ? fmtBRL(faturado) : "—"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-10 text-slate-600">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Forecast de Faturamento</h1>
          </div>
          <p className="text-slate-500 text-base max-w-2xl pl-[3.5rem]">
            Visão estratégica de receita baseada em inteligência de dados.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <ToggleGroup
            type="single"
            value={String(horizonte)}
            onValueChange={handleHorizonteChange}
            className="bg-slate-100 p-1 rounded-lg"
          >
            {[3, 6, 12].map((h) => (
              <ToggleGroupItem
                key={h}
                value={String(h)}
                className="text-sm px-4 data-[state=on]:bg-white data-[state=on]:text-indigo-600 data-[state=on]:shadow-sm rounded-md transition-all font-medium text-slate-500"
              >
                {h} meses
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {/* Aviso amostra pequena */}
      {bs?.amostraPequena && (
        <Alert variant="destructive" className="border-rose-100 bg-rose-50 text-rose-800">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <AlertTitle>Atenção aos dados</AlertTitle>
          <AlertDescription>
            Amostra pequena: apenas <strong>{bs.numContratos12m} contratos</strong> em 12 meses.
          </AlertDescription>
        </Alert>
      )}

      {/* Seleção mês foco */}
      {!isLoading && fm.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 py-2">
          <span className="text-sm font-medium text-slate-400 pl-1">Detalhar Mês:</span>
          <ToggleGroup
            type="single"
            value={String(safeMesFoco)}
            onValueChange={(v) => v !== undefined && v !== "" && setMesFoco(Number(v))}
            className="flex-wrap justify-start gap-2"
          >
            {fm.map((m: any, i: number) => (
              <ToggleGroupItem
                key={i}
                value={String(i)}
                className="text-xs px-3 py-1 h-8 rounded-full border border-slate-200 data-[state=on]:border-indigo-500 data-[state=on]:bg-indigo-50 data-[state=on]:text-indigo-700 hover:bg-slate-50 transition-all text-slate-500"
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
            sub={<span className="font-medium text-indigo-600">{mesFocoData.mes}</span>}
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
          />
        </div>
      )}

      {/* KPI Cards Gerais */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
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

      {/* Simulador */}
      <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-indigo-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                <Crosshair className="w-5 h-5 text-indigo-500" />
                Simulador de Esforço
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetControles}
              className="gap-2 h-8 text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Resetar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 px-2">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium text-slate-500">Volume de Propostas (+R$)</Label>
                  <span className="text-sm font-bold text-slate-700">
                    {fmtBRL(valorAdicional)}
                    <span className="text-xs font-normal text-slate-400">/mês</span>
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
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium text-slate-500">Taxa de Conversão</Label>
                  <span className="text-sm font-bold text-slate-700">{(conversaoMarg * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  min={5}
                  max={80}
                  step={1}
                  value={[Math.round(conversaoMarg * 100)]}
                  onValueChange={([v]) => setConversaoMarg(v / 100)}
                  className="py-2"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium text-slate-500">Ticket Médio</Label>
                  <span className="text-sm font-bold text-slate-700">{fmtBRL(ticketMarg)}</span>
                </div>
                <Slider
                  min={0}
                  max={Math.max(200000, Math.round((bs?.ticketReal || 50000) * 3))}
                  step={1000}
                  value={[ticketMarg]}
                  onValueChange={([v]) => setTicketMarg(v)}
                  className="py-2"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico principal com Volumetria e Cores Pastel */}
      <Card className="shadow-lg border-slate-100 bg-white">
        <CardHeader className="pb-6 border-b border-slate-50">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-slate-800">Projeção vs Meta</CardTitle>
            <div className="flex gap-4 text-xs font-medium text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                Base
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-violet-400" />
                Pipeline
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-rose-400" />
                Meta
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pl-0">
          {isLoading ? (
            <Skeleton className="h-[380px] w-full" />
          ) : (
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={fmChart} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  {/* Definições de Gradientes e Filtros para Volumetria */}
                  <defs>
                    <linearGradient id="gradBaseline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PASTEL_COLORS.baseline.start} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={PASTEL_COLORS.baseline.end} stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="gradPipeline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PASTEL_COLORS.pipeline.start} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={PASTEL_COLORS.pipeline.end} stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="gradEffort" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PASTEL_COLORS.effort.start} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={PASTEL_COLORS.effort.end} stopOpacity={0.4} />
                    </linearGradient>
                    {/* Sombra suave para a linha de Realizado */}
                    <filter id="shadowRealized" height="130%">
                      <feDropShadow
                        dx="0"
                        dy="4"
                        stdDeviation="4"
                        floodColor={PASTEL_COLORS.realized}
                        floodOpacity="0.3"
                      />
                    </filter>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PASTEL_COLORS.grid} />

                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12, fill: PASTEL_COLORS.text }}
                    axisLine={false}
                    tickLine={false}
                    dy={15}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12, fill: PASTEL_COLORS.text }}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />

                  <Tooltip content={forecastTooltip} cursor={{ fill: "rgba(226, 232, 240, 0.3)" }} />

                  {/* Barras com Gradiente (Volumetria) e Bordas arredondadas no topo */}
                  <Bar
                    dataKey="baseline"
                    name="Contratos Base"
                    fill="url(#gradBaseline)"
                    stackId="forecast"
                    barSize={40}
                  />
                  <Bar
                    dataKey="pipelineAlloc"
                    name="Pipeline Ponderado"
                    fill="url(#gradPipeline)"
                    stackId="forecast"
                    barSize={40}
                  />
                  {valorAdicional > 0 && (
                    <Bar
                      dataKey="incrementalAlloc"
                      name="Esforço Adicional"
                      fill="url(#gradEffort)"
                      stackId="forecast"
                      radius={[6, 6, 0, 0]} // Arredondar apenas o topo da pilha
                      barSize={40}
                    />
                  )}
                  {/* Se não houver esforço adicional, arredondar o topo do pipeline */}
                  {valorAdicional === 0 && (
                    <Bar
                      dataKey="pipelineAlloc"
                      fill="url(#gradPipeline)"
                      stackId="forecast"
                      barSize={40}
                      radius={[6, 6, 0, 0]}
                    />
                  )}

                  {/* Linha de Meta (Pontilhada e Suave) */}
                  <Line
                    dataKey="meta"
                    name="Meta"
                    type="step"
                    stroke={PASTEL_COLORS.meta}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    opacity={0.7}
                  />

                  {/* Linha de Realizado (Com Sombra e Destaque) */}
                  <Line
                    dataKey="faturadoPlot"
                    name="Realizado"
                    type="monotone"
                    stroke={PASTEL_COLORS.realized}
                    strokeWidth={3}
                    filter="url(#shadowRealized)" // Aplica a sombra
                    dot={{
                      r: 5,
                      fill: "#fff",
                      stroke: PASTEL_COLORS.realized,
                      strokeWidth: 3,
                    }}
                    activeDot={{ r: 7, strokeWidth: 0, fill: PASTEL_COLORS.realized }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histórico Simplificado */}
        <Card className="shadow-sm border-slate-100">
          <CardHeader className="pb-4 border-b border-slate-50">
            <CardTitle className="text-base text-slate-700">Histórico de Fechamento</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-[250px]" />
            ) : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={vh} margin={{ top: 10, right: 0, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PASTEL_COLORS.grid} />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 10, fill: PASTEL_COLORS.text }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 10, fill: PASTEL_COLORS.text }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 10, fill: PASTEL_COLORS.text }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={tooltipFormatter}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                    />

                    <Bar
                      yAxisId="left"
                      dataKey="valorEnviado"
                      name="Enviado (R$)"
                      fill="#e2e8f0"
                      radius={[4, 4, 0, 0]}
                      barSize={16}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="valorFechado"
                      name="Fechado (R$)"
                      fill={PASTEL_COLORS.baseline.start}
                      radius={[4, 4, 0, 0]}
                      barSize={16}
                    />
                    <Line
                      yAxisId="right"
                      dataKey="conversaoFinanceira"
                      name="Conv. %"
                      type="monotone"
                      stroke={PASTEL_COLORS.effort.start}
                      strokeWidth={2}
                      dot={{ r: 2, fill: PASTEL_COLORS.effort.start }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline breakdown */}
        {!isLoading && pipeline && pipeline.qtdPropostas > 0 && (
          <Card className="shadow-sm border-slate-100 flex flex-col">
            <CardHeader className="pb-4 border-b border-slate-50">
              <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                <PieChart className="h-4 w-4" />
                Composição do Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(pipeline.porEstagio)
                  .sort(([, a]: any, [, b]: any) => b.ponderado - a.ponderado)
                  .map(([estagio, info]: any) => (
                    <div
                      key={estagio}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-all hover:shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {String(estagio).replace(/_/g, " ")}
                        </p>
                        <span className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded-full font-medium border border-slate-100">
                          {info.qtd}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-slate-700 tracking-tight">{fmtBRL(info.ponderado)}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="pt-4">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-slate-700">Insights Gerados</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((ins: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-4 p-5 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-md bg-white",
                  insightStyles[ins.level],
                )}
              >
                <div className="mt-0.5">{insightIcons[ins.level]}</div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-relaxed opacity-90">{ins.text}</p>
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
        "p-5 transition-all hover:shadow-lg border-0 bg-white",
        highlight ? "ring-2 ring-indigo-100 shadow-md" : "shadow-sm",
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate pr-2">{label}</span>
        <div
          className={cn("p-2 rounded-lg", highlight ? "bg-indigo-50 text-indigo-500" : "bg-slate-50 text-slate-400")}
        >
          {icon}
        </div>
      </div>

      <div className="space-y-1">
        <p
          className={cn(
            "text-2xl font-bold tracking-tight tabular-nums text-slate-700",
            variant === "destructive" && "text-rose-500",
            variant === "success" && "text-emerald-500",
            highlight && "text-indigo-600",
          )}
        >
          {value}
        </p>

        {sub && <div className="text-xs text-slate-400 font-medium">{sub}</div>}
      </div>
    </Card>
  );
}
