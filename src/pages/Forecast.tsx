import { useState, useCallback, useMemo } from "react";
import {
  TrendingUp, RotateCcw, Target, DollarSign, BarChart3, Percent,
  Lightbulb, AlertTriangle, CheckCircle, XCircle, Info, FileText,
  Clock, PieChart, Crosshair,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useForecastPage, type ForecastPageParams, type InsightLevel } from "@/hooks/useForecastPage";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";

type Horizonte = 3 | 6 | 12;

function fmtBRL(v: number | undefined | null) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtPct(v: number | undefined | null) {
  return `${((v ?? 0) * 100).toFixed(1)}%`;
}
function fmtPctRaw(v: number | undefined | null) {
  return `${(v ?? 0).toFixed(1)}%`;
}

const insightIcons: Record<InsightLevel, React.ReactNode> = {
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
  const [valorAdicional, setValorAdicional] = useState(0);
  const [conversaoMarg, setConversaoMarg] = useState(0.30); // 30% default
  const [ticketMarg, setTicketMarg] = useState(0);

  const params: ForecastPageParams = {
    horizonte,
    valorAdicionalMensal: valorAdicional,
    conversaoMarginal: conversaoMarg,
    ticketMarginal: ticketMarg,
  };
  const { data, isLoading } = useForecastPage(params);

  // When data loads, seed ticket marginal from history if not set
  const bs = data?.baseStats;
  const pipeline = data?.pipeline;
  const fm = data?.forecastMensal || [];
  const vh = data?.volumeHistorico || [];
  const insights = data?.insights || [];
  const metasAtivas = data?.metasAtivas || [];
  const mesAtual = fm[0];

  // Auto-seed conversão marginal from history
  const seededConversao = useMemo(() => {
    if (bs && conversaoMarg === 0.30 && bs.conversaoFinanceira > 0) {
      return bs.conversaoFinanceira;
    }
    return conversaoMarg;
  }, [bs?.conversaoFinanceira]);

  const resetControles = useCallback(() => {
    setValorAdicional(0);
    setConversaoMarg(bs?.conversaoFinanceira || 0.30);
    setTicketMarg(bs?.ticketReal || 0);
  }, [bs]);

  const tooltipFormatter = (value: number, name: string) => {
    if (name === "Conversão %") return [`${value.toFixed(1)}%`, name];
    return [fmtBRL(value), name];
  };

  const forecastTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm space-y-1">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-primary">Forecast Base: {fmtBRL(item.forecastBase)}</p>
        {item.forecastIncremental > 0 && (
          <p className="text-accent-foreground">+ Esforço: {fmtBRL(item.forecastIncremental)}</p>
        )}
        <p className="text-primary font-semibold">Total: {fmtBRL(item.forecastTotal)}</p>
        <p className="text-success">Meta: {fmtBRL(item.meta)}</p>
        {item.gap > 0 && (
          <>
            <p className="text-destructive">Gap: {fmtBRL(item.gap)}</p>
            <p className="text-warning text-xs">Ação: +{fmtBRL(item.acaoNecessariaRS)} em propostas</p>
          </>
        )}
        {item.pctPipelineNoForecast > 0 && (
          <p className="text-muted-foreground text-xs">{fmtPctRaw(item.pctPipelineNoForecast)} vem do pipeline</p>
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
        <ToggleGroup type="single" value={String(horizonte)} onValueChange={(v) => v && setHorizonte(Number(v) as Horizonte)} className="bg-muted rounded-lg p-0.5">
          {[3, 6, 12].map((h) => (
            <ToggleGroupItem key={h} value={String(h)} className="text-xs px-3 data-[state=on]:bg-card data-[state=on]:shadow-sm rounded-md">
              {h}m
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Sample warning */}
      {bs?.amostraPequena && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Amostra pequena: apenas {bs.numContratos12m} contratos em 12 meses. Previsões podem estar distorcidas.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards — "Onde eu estou hoje?" */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard
            icon={<DollarSign className="h-4 w-4" />}
            label="Receita s/ Esforço"
            value={fmtBRL(mesAtual?.forecastBase)}
            sub="Pipeline + média histórica"
          />
          <KPICard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Receita Projetada"
            value={fmtBRL(mesAtual?.forecastTotal)}
            sub={valorAdicional > 0 ? "Com esforço adicional" : "Cenário atual"}
            variant={mesAtual && mesAtual.forecastTotal >= mesAtual.meta ? "success" : undefined}
          />
          <KPICard
            icon={<Target className="h-4 w-4" />}
            label="Gap vs Meta"
            value={fmtBRL(mesAtual?.gap)}
            variant={(mesAtual?.gap || 0) > 0 ? "destructive" : "success"}
            sub={mesAtual?.meta ? `Meta: ${fmtBRL(mesAtual.meta)}` : "Sem meta definida"}
          />
          <KPICard
            icon={<FileText className="h-4 w-4" />}
            label="Ação Necessária"
            value={fmtBRL(mesAtual?.acaoNecessariaRS)}
            sub={`≈ ${bs && bs.ticketReal > 0 ? Math.ceil((mesAtual?.acaoNecessariaRS || 0) / bs.ticketReal) : 0} propostas`}
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
            value={fmtPct(bs?.conversaoFinanceira)}
            sub={`Ticket: ${fmtBRL(bs?.ticketReal)}`}
          />
        </div>
      )}

      {/* Meta do mês (if no meta, show CTA) */}
      {!isLoading && metasAtivas.length === 0 && (
        <Alert>
          <Target className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            Nenhuma meta de vendas ativa encontrada.
            <Link to="/metas" className="text-primary font-medium hover:underline">Criar meta →</Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Alavancas de controle — "O que posso mudar?" */}
      <Card>
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
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1: Valor adicional em propostas (R$/mês) */}
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
                {valorAdicional > 0 && (
                  <p className="text-xs text-primary">
                    Impacto: +{fmtBRL(valorAdicional * conversaoMarg)} de receita/mês (após {bs?.tempoMedioFechamentoDias || 45}d)
                  </p>
                )}
              </div>

              {/* 2: Conversão financeira marginal */}
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
                  <span>Hist: {fmtPct(bs?.conversaoFinanceira)}</span>
                </div>
              </div>

              {/* 3: Ticket médio esperado */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ticket médio esperado (R$)</Label>
                <Slider
                  min={0}
                  max={Math.max(200000, Math.round((bs?.ticketReal || 50000) * 3))}
                  step={1000}
                  value={[ticketMarg || (bs?.ticketReal || 0)]}
                  onValueChange={([v]) => setTicketMarg(v)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{fmtBRL(ticketMarg || bs?.ticketReal)}</span>
                  <span>Hist: {fmtBRL(bs?.ticketReal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Impacto resumo */}
          {!isLoading && valorAdicional > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 text-sm">
                <Crosshair className="h-4 w-4 text-primary" />
                <span className="text-foreground">
                  Gerando <strong>{fmtBRL(valorAdicional)}</strong>/mês em propostas com{" "}
                  <strong>{(conversaoMarg * 100).toFixed(0)}%</strong> de conversão = {" "}
                  <strong className="text-primary">{fmtBRL(valorAdicional * conversaoMarg)}</strong> de receita adicional/mês
                  {bs && bs.tempoMedioFechamentoDias > 0 && (
                    <span className="text-muted-foreground"> (a partir do {Math.ceil(bs.tempoMedioFechamentoDias / 30)}º mês)</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forecast vs Meta Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Forecast vs Meta — Mês a Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[320px]" /> : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={fm}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip content={forecastTooltip} />
                <Legend />
                <Bar dataKey="forecastBase" name="Forecast Base (R$)" fill="hsl(210, 92%, 57%)" radius={[4, 4, 0, 0]} stackId="forecast" />
                {valorAdicional > 0 && (
                  <Bar dataKey="forecastIncremental" name="Esforço Adicional (R$)" fill="hsl(210, 70%, 75%)" radius={[4, 4, 0, 0]} stackId="forecast" />
                )}
                <Line dataKey="meta" name="Meta" type="monotone" stroke="hsl(145, 63%, 39%)" strokeWidth={2} strokeDasharray="6 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Histórico 12m */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico 12m — Valor Enviado vs Fechado (R$)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[280px]" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={vh}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Bar yAxisId="left" dataKey="valorEnviado" name="Valor Enviado (R$)" fill="hsl(210, 92%, 57%)" radius={[3, 3, 0, 0]} opacity={0.7} />
                <Bar yAxisId="left" dataKey="valorFechado" name="Valor Fechado (R$)" fill="hsl(145, 63%, 39%)" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" dataKey="conversaoFinanceira" name="Conversão %" type="monotone" stroke="hsl(36, 96%, 57%)" strokeWidth={2} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Pipeline breakdown */}
      {!isLoading && pipeline && pipeline.qtdPropostas > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Pipeline Atual — Receita Esperada por Estágio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(pipeline.porEstagio)
                .sort(([, a], [, b]) => b.ponderado - a.ponderado)
                .map(([estagio, info]) => (
                  <div key={estagio} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground capitalize truncate">{estagio.replace(/_/g, " ")}</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{fmtBRL(info.ponderado)}</p>
                    <p className="text-xs text-muted-foreground">{info.qtd} prop. · {fmtBRL(info.valor)} bruto</p>
                  </div>
                ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Total pipeline bruto: <strong className="text-foreground">{fmtBRL(pipeline.valorBruto)}</strong></span>
              <span className="text-muted-foreground">Valor ponderado: <strong className="text-primary">{fmtBRL(pipeline.valorPonderado)}</strong></span>
              <span className="text-muted-foreground">
                <Clock className="h-3.5 w-3.5 inline mr-1" />
                Tempo médio fechamento: <strong className="text-foreground">{bs?.tempoMedioFechamentoDias || "—"}d</strong>
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
            {insights.map((ins, i) => (
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

// ─── Sub-components ──────────────────────────────────────────

function KPICard({
  icon, label, value, sub, variant,
}: {
  icon: React.ReactNode; label: string; value: string;
  sub?: React.ReactNode; variant?: "destructive" | "success";
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      <p className={cn("text-lg font-semibold tabular-nums", variant === "destructive" && "text-destructive", variant === "success" && "text-success")}>
        {value}
      </p>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}
