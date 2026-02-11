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

// --- Configuração de Cores (Baseada nas imagens enviadas) ---
const CHART_COLORS = {
  text: "#475569", // Slate 600 - Legibilidade melhor que cinza claro
  grid: "#cbd5e1", // Slate 300

  // Barras
  baseline: { start: "#6366f1", end: "#818cf8" }, // Indigo vibrante
  pipeline: { start: "#a855f7", end: "#c084fc" }, // Roxo/Purple distinto
  effort: { start: "#10b981", end: "#34d399" }, // Verde Esmeralda (contraste alto com roxo)

  // Linhas
  realized: "#2563eb", // Azul Royal (fiel à imagem enviada)
  meta: "#ef4444", // Vermelho Alerta

  // Auxiliar
  bgTooltip: "rgba(255, 255, 255, 0.98)",
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
  success: <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
  destructive: <XCircle className="h-5 w-5 text-red-600 shrink-0" />,
  muted: <Info className="h-5 w-5 text-slate-500 shrink-0" />,
};

const insightStyles: Record<InsightLevel, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  destructive: "bg-red-50 border-red-200 text-red-900",
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

  // --- TOOLTIP COMPLETO (RESTAURADO CONFORME IMAGEM) ---
  const forecastTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    const faturado = Number(item.faturadoPlot || 0);
    const hasGap = item.gap > 0;

    return (
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-3 min-w-[280px] text-sm font-sans z-50">
        {/* Header do Mês */}
        <p className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-2 text-base capitalize">{label}</p>

        {/* Bloco: Composição do Forecast (Barras) */}
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between items-center text-slate-600">
            <span className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></div> Baseline:
            </span>
            <span className="font-medium tabular-nums">{fmtBRL(item.baseline)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-purple-400"></div> Pipeline:
            </span>
            <span className="font-medium tabular-nums">{fmtBRL(item.pipelineAlloc)}</span>
          </div>
          {/* Só mostra esforço se existir valor > 0 */}
          {item.incrementalAlloc > 0 && (
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></div> Esforço:
              </span>
              <span className="font-medium tabular-nums text-emerald-700">{fmtBRL(item.incrementalAlloc)}</span>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 my-2 pt-2 space-y-1.5">
          {/* Forecast Total */}
          <div className="flex justify-between items-center font-bold">
            <span className="text-slate-800">Forecast:</span>
            <span className="text-blue-600 tabular-nums">{fmtBRL(item.forecastTotal)}</span>
          </div>

          {/* Meta */}
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Meta:</span>
            <span className="text-emerald-600 font-semibold tabular-nums">{fmtBRL(item.meta)}</span>
          </div>

          {/* Faturado (Realizado) */}
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Faturado:</span>
            <span className={cn("font-bold tabular-nums", faturado > 0 ? "text-slate-900" : "text-slate-400")}>
              {faturado > 0 ? fmtBRL(faturado) : "R$ 0"}
            </span>
          </div>
        </div>

        {/* Gap e Ação (Condicional) */}
        {hasGap && (
          <div className="mt-2 pt-2 border-t border-red-100 bg-red-50/50 -mx-3 px-3 pb-1">
            <div className="flex justify-between items-center text-red-600 font-bold mb-1">
              <span>Gap:</span>
              <span className="tabular-nums">{fmtBRL(item.gap)}</span>
            </div>
            <div className="text-xs text-amber-600 leading-tight">
              Ação: +{fmtBRL(item.acaoNecessariaRS)} em propostas{" "}
              <span className="opacity-80">(~{item.propostasEquiv} prop.)</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-10 text-slate-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-2 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Forecast de Faturamento</h1>
          </div>
          <p className="text-slate-500 text-base max-w-2xl pl-[3.5rem]">
            Visão consolidada de meta, realizado e projeções.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <ToggleGroup
            type="single"
            value={String(horizonte)}
            onValueChange={handleHorizonteChange}
            className="bg-slate-100 p-1 rounded-lg border border-slate-200"
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

      {/* KPIs do mês foco */}
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

      {/* Simulador */}
      <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/30 to-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-indigo-100/50 pb-4">
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
              className="gap-2 h-8 text-xs text-slate-500 hover:text-indigo-600 hover:bg-white"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Resetar
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

      {/* GRÁFICO PRINCIPAL COM CORES VIBRANTES E DADOS COMPLETOS */}
      <Card className="shadow-lg border-slate-200 bg-white">
        <CardHeader className="pb-6 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg text-slate-800">Projeção vs Meta</CardTitle>

            {/* Legenda Personalizada */}
            <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-indigo-500" />
                Base
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-purple-400" />
                Pipeline
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-400" />
                Esforço
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-red-500" />
                Meta
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-1 bg-blue-600 rounded-full" />
                Realizado
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pl-0">
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={fmChart} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  {/* Definições de Gradientes (Mais opacos/vibrantes) */}
                  <defs>
                    <linearGradient id="gradBaseline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.baseline.start} stopOpacity={1} />
                      <stop offset="100%" stopColor={CHART_COLORS.baseline.end} stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="gradPipeline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.pipeline.start} stopOpacity={1} />
                      <stop offset="100%" stopColor={CHART_COLORS.pipeline.end} stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="gradEffort" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.effort.start} stopOpacity={1} />
                      <stop offset="100%" stopColor={CHART_COLORS.effort.end} stopOpacity={0.6} />
                    </linearGradient>
                    {/* Sombra para a linha de Realizado (Volumetria) */}
                    <filter id="shadowRealized" height="130%">
                      <feDropShadow
                        dx="0"
                        dy="2"
                        stdDeviation="2"
                        floodColor={CHART_COLORS.realized}
                        floodOpacity="0.3"
                      />
                    </filter>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />

                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12, fill: CHART_COLORS.text }}
                    axisLine={false}
                    tickLine={false}
                    dy={15}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12, fill: CHART_COLORS.text }}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />

                  <Tooltip content={forecastTooltip} cursor={{ fill: "rgba(241, 245, 249, 0.4)" }} />

                  {/* Barras Empilhadas (StackId igual) */}
                  <Bar
                    dataKey="baseline"
                    name="Contratos Base"
                    fill="url(#gradBaseline)"
                    stackId="forecast"
                    barSize={48}
                  />
                  <Bar
                    dataKey="pipelineAlloc"
                    name="Pipeline"
                    fill="url(#gradPipeline)"
                    stackId="forecast"
                    barSize={48}
                  />
                  {valorAdicional > 0 && (
                    <Bar
                      dataKey="incrementalAlloc"
                      name="Esforço Adicional"
                      fill="url(#gradEffort)"
                      stackId="forecast"
                      radius={[6, 6, 0, 0]} // Arredonda topo
                      barSize={48}
                    />
                  )}
                  {/* Arredonda o pipeline se for o último */}
                  {valorAdicional === 0 && (
                    <Bar
                      dataKey="pipelineAlloc"
                      fill="url(#gradPipeline)"
                      stackId="forecast"
                      barSize={48}
                      radius={[6, 6, 0, 0]}
                    />
                  )}

                  {/* Linha de Meta (Pontilhada e Vermelha) */}
                  <Line
                    dataKey="meta"
                    name="Meta"
                    type="step"
                    stroke={CHART_COLORS.meta}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />

                  {/* Linha de Realizado (Azul Vibrante com Sombra) */}
                  <Line
                    dataKey="faturadoPlot"
                    name="Realizado"
                    type="monotone"
                    stroke={CHART_COLORS.realized}
                    strokeWidth={4}
                    filter="url(#shadowRealized)"
                    dot={{
                      r: 6,
                      fill: "#fff",
                      stroke: CHART_COLORS.realized,
                      strokeWidth: 3,
                    }}
                    activeDot={{ r: 8, strokeWidth: 0, fill: CHART_COLORS.realized }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico e Pipeline (Secundários) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-base text-slate-700">Histórico de Fechamento</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-[250px]" />
            ) : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={vh} margin={{ top: 10, right: 0, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 10, fill: CHART_COLORS.text }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 10, fill: CHART_COLORS.text }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 10, fill: CHART_COLORS.text }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip formatter={tooltipFormatter} />

                    <Bar
                      yAxisId="left"
                      dataKey="valorEnviado"
                      name="Enviado (R$)"
                      fill="#e2e8f0"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="valorFechado"
                      name="Fechado (R$)"
                      fill={CHART_COLORS.baseline.start}
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Line
                      yAxisId="right"
                      dataKey="conversaoFinanceira"
                      name="Conv. %"
                      type="monotone"
                      stroke={CHART_COLORS.effort.start}
                      strokeWidth={2}
                      dot={{ r: 2, fill: CHART_COLORS.effort.start }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline breakdown */}
        {!isLoading && pipeline && pipeline.qtdPropostas > 0 && (
          <Card className="shadow-sm border-slate-200 flex flex-col">
            <CardHeader className="pb-4 border-b border-slate-100">
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
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-200 transition-all"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          {String(estagio).replace(/_/g, " ")}
                        </p>
                        <span className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded-full font-medium border border-slate-200 shadow-sm">
                          {info.qtd}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-slate-800 tracking-tight">{fmtBRL(info.ponderado)}</p>
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
            <h2 className="text-lg font-semibold text-slate-800">Insights Gerados</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((ins: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-4 p-5 rounded-xl border transition-all hover:shadow-md bg-white",
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
        "p-5 transition-all hover:shadow-lg border-0 bg-white shadow-sm ring-1 ring-slate-100",
        highlight ? "ring-2 ring-indigo-200 shadow-md bg-indigo-50/10" : "",
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate pr-2">{label}</span>
        <div
          className={cn("p-2 rounded-lg", highlight ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500")}
        >
          {icon}
        </div>
      </div>

      <div className="space-y-1">
        <p
          className={cn(
            "text-2xl font-bold tracking-tight tabular-nums text-slate-800",
            variant === "destructive" && "text-red-600",
            variant === "success" && "text-emerald-600",
            highlight && "text-indigo-700",
          )}
        >
          {value}
        </p>

        {sub && <div className="text-xs text-slate-500 font-medium">{sub}</div>}
      </div>
    </Card>
  );
}
