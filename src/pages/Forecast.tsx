import { useState, useCallback } from "react";
import { TrendingUp, RotateCcw, Target, DollarSign, BarChart3, Users, Percent, Lightbulb, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useForecastPage, type ForecastPageParams, type InsightLevel } from "@/hooks/useForecastPage";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area,
} from "recharts";

type Horizonte = 3 | 6 | 12;
type CenarioPreset = "conservador" | "base" | "agressivo";

const PRESETS: Record<CenarioPreset, { vol: number; conv: number; tick: number }> = {
  conservador: { vol: 0.8, conv: 0.85, tick: 0.9 },
  base: { vol: 1, conv: 1, tick: 1 },
  agressivo: { vol: 1.2, conv: 1.1, tick: 1.1 },
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
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
  const [preset, setPreset] = useState<CenarioPreset>("base");
  const [volAdj, setVolAdj] = useState(1);
  const [convAdj, setConvAdj] = useState(1);
  const [tickAdj, setTickAdj] = useState(1);

  const params: ForecastPageParams = { horizonte, volumeAjuste: volAdj, conversaoAjuste: convAdj, ticketAjuste: tickAdj };
  const { data, isLoading } = useForecastPage(params);

  const applyPreset = useCallback((p: CenarioPreset) => {
    setPreset(p);
    setVolAdj(PRESETS[p].vol);
    setConvAdj(PRESETS[p].conv);
    setTickAdj(PRESETS[p].tick);
  }, []);

  const resetToHistorico = useCallback(() => applyPreset("base"), [applyPreset]);

  const bs = data?.baseStats;
  const cen = data?.cenario;
  const fm = data?.forecastMensal || [];
  const vh = data?.volumeHistorico || [];
  const insights = data?.insights || [];
  const metasAtivas = data?.metasAtivas || [];
  const mesAtual = fm[0];

  // Tooltip formatter
  const tooltipFormatter = (value: number, name: string) => {
    if (name === "Conversão %") return [`${value.toFixed(1)}%`, name];
    return [fmtBRL(value), name];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-primary" />
            <h1 className="text-h2 text-foreground">Forecast</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Planejamento do faturamento com base nos últimos 12 meses
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup type="single" value={String(horizonte)} onValueChange={(v) => v && setHorizonte(Number(v) as Horizonte)} className="bg-muted rounded-lg p-0.5">
            {[3, 6, 12].map((h) => (
              <ToggleGroupItem key={h} value={String(h)} className="text-xs px-3 data-[state=on]:bg-card data-[state=on]:shadow-sm rounded-md">
                {h}m
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup type="single" value={preset} onValueChange={(v) => v && applyPreset(v as CenarioPreset)} className="bg-muted rounded-lg p-0.5">
            <ToggleGroupItem value="conservador" className="text-xs px-3 data-[state=on]:bg-card data-[state=on]:shadow-sm rounded-md">Conservador</ToggleGroupItem>
            <ToggleGroupItem value="base" className="text-xs px-3 data-[state=on]:bg-card data-[state=on]:shadow-sm rounded-md">Base</ToggleGroupItem>
            <ToggleGroupItem value="agressivo" className="text-xs px-3 data-[state=on]:bg-card data-[state=on]:shadow-sm rounded-md">Agressivo</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Sample warning */}
      {bs?.amostraPequena && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Amostra pequena: apenas {bs.totalFechadas12m} fechamentos em 12 meses. A previsibilidade pode ficar distorcida.
          </AlertDescription>
        </Alert>
      )}

      {/* Controls Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Controles do Cenário</CardTitle>
            <Button variant="ghost" size="sm" onClick={resetToHistorico} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" /> Reset histórico
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SliderControl
                label="Volume mensal"
                value={volAdj}
                onChange={(v) => { setVolAdj(v); setPreset("base"); }}
                absValue={`${Math.round(cen?.volumeMensal || 0)} propostas`}
                baseValue={bs?.mediaEnviadasMes || 0}
              />
              <SliderControl
                label="Conversão"
                value={convAdj}
                onChange={(v) => { setConvAdj(v); setPreset("base"); }}
                absValue={fmtPct(cen?.conversao || 0)}
                baseValue={bs?.conversaoReal || 0}
                formatBase={(v) => fmtPct(v)}
              />
              <SliderControl
                label="Ticket médio"
                value={tickAdj}
                onChange={(v) => { setTickAdj(v); setPreset("base"); }}
                absValue={fmtBRL(cen?.ticket || 0)}
                baseValue={bs?.ticketReal || 0}
                formatBase={(v) => fmtBRL(v)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard
            icon={<Target className="h-4 w-4" />}
            label="Meta do mês"
            value={mesAtual?.meta ? fmtBRL(mesAtual.meta) : "—"}
            sub={metasAtivas.length === 0 ? <Link to="/metas" className="text-primary text-xs hover:underline">Criar meta →</Link> : undefined}
          />
          <KPICard icon={<DollarSign className="h-4 w-4" />} label="Forecast do mês" value={fmtBRL(mesAtual?.forecast || 0)} />
          <KPICard
            icon={<BarChart3 className="h-4 w-4" />}
            label="Gap"
            value={fmtBRL(mesAtual?.gap || 0)}
            variant={(mesAtual?.gap || 0) > 0 ? "destructive" : "success"}
            sub={mesAtual?.meta ? `${(((mesAtual.gap) / mesAtual.meta) * 100).toFixed(0)}% da meta` : undefined}
          />
          <KPICard icon={<Users className="h-4 w-4" />} label="Propostas necessárias" value={String(mesAtual?.propostasNecessarias || 0)} sub="para zerar gap" />
          <KPICard
            icon={<Percent className="h-4 w-4" />}
            label="Conversão"
            value={fmtPct(cen?.conversao || 0)}
            sub={`Real 12m: ${fmtPct(bs?.conversaoReal || 0)}`}
          />
          <KPICard
            icon={<DollarSign className="h-4 w-4" />}
            label="Ticket médio"
            value={fmtBRL(cen?.ticket || 0)}
            sub={`Real 12m: ${fmtBRL(bs?.ticketReal || 0)}`}
          />
        </div>
      )}

      {/* Forecast Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Forecast Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[300px]" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={fm}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Bar dataKey="forecast" name="Forecast" fill="hsl(210, 92%, 57%)" radius={[4, 4, 0, 0]} />
                <Line dataKey="meta" name="Meta" type="monotone" stroke="hsl(145, 63%, 39%)" strokeWidth={2} strokeDasharray="6 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Two-column: Histórico + Projeção vs Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Histórico 12m — Enviadas vs Fechadas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[260px]" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={vh}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="enviadas" name="Enviadas" fill="hsl(210, 92%, 57%)" radius={[3, 3, 0, 0]} opacity={0.7} />
                  <Bar yAxisId="left" dataKey="fechadas" name="Fechadas" fill="hsl(145, 63%, 39%)" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" dataKey="taxaConversao" name="Conversão %" type="monotone" stroke="hsl(36, 96%, 57%)" strokeWidth={2} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Projeção vs Meta</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[260px]" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={fm}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend />
                  <Bar dataKey="meta" name="Meta" fill="hsl(145, 63%, 39%)" opacity={0.4} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="forecast" name="Projetado" fill="hsl(210, 92%, 57%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="gap" name="Gap" fill="hsl(4, 90%, 58%)" opacity={0.6} radius={[3, 3, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

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

function SliderControl({
  label, value, onChange, absValue, baseValue, formatBase,
}: {
  label: string; value: number; onChange: (v: number) => void;
  absValue: string; baseValue: number; formatBase?: (v: number) => string;
}) {
  const pct = Math.round((value - 1) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Badge variant={pct === 0 ? "secondary" : pct > 0 ? "default" : "destructive"} className="text-xs">
          {pct > 0 ? "+" : ""}{pct}%
        </Badge>
      </div>
      <Slider
        min={50} max={200} step={5}
        value={[value * 100]}
        onValueChange={([v]) => onChange(v / 100)}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{absValue}</span>
        <span>Base: {formatBase ? formatBase(baseValue) : Math.round(baseValue)}</span>
      </div>
    </div>
  );
}

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
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{typeof sub === "string" ? sub : sub}</div>}
    </Card>
  );
}
