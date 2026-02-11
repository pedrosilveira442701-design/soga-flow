import { useState, useCallback, useMemo } from "react";
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
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge"; // Adicionado para status
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
  Cell,
} from "recharts";

// ... (Funções fmtBRL e fmtPct permanecem iguais)

export default function Forecast() {
  const [horizonte, setHorizonte] = useState<Horizonte>(6);
  const [mesFoco, setMesFoco] = useState(0);
  const [valorAdicional, setValorAdicional] = useState(0);
  const [conversaoMarg, setConversaoMarg] = useState(0.3);
  const [ticketMarg, setTicketMarg] = useState(0);

  const params: ForecastPageParams = {
    horizonte,
    valorAdicionalMensal: valorAdicional,
    conversaoMarginal: conversaoMarg,
    ticketMarginal: ticketMarg,
  };
  const { data, isLoading } = useForecastPage(params);

  const bs = data?.baseStats;
  const pipeline = data?.pipeline;
  const fm = data?.forecastMensal || [];
  const vh = data?.volumeHistorico || [];
  const insights = data?.insights || [];

  const safeMesFoco = mesFoco < fm.length ? mesFoco : 0;
  const mesFocoData = fm[safeMesFoco] || null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 p-2 md:p-6">
      {/* HEADER REESTRUTURADO */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="h-6 w-6" />
            <span className="text-sm font-bold uppercase tracking-wider">Comercial Intelligence</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Forecast de Faturamento</h1>
          <p className="text-muted-foreground">Análise preditiva baseada em pipeline real e histórico de 12 meses.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-muted/50 p-1.5 rounded-xl border">
          <span className="text-xs font-semibold px-2 text-muted-foreground uppercase">Horizonte:</span>
          <ToggleGroup
            type="single"
            value={String(horizonte)}
            onValueChange={(v) => v && setHorizonte(Number(v) as Horizonte)}
          >
            {[3, 6, 12].map((h) => (
              <ToggleGroupItem
                key={h}
                value={String(h)}
                className="text-xs h-8 px-4 data-[state=on]:bg-background data-[state=on]:shadow-sm"
              >
                {h} Meses
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </header>

      {/* ALERTAS CRÍTICOS */}
      {bs?.amostraPequena && (
        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Atenção: Dados Limitados</AlertTitle>
          <AlertDescription>
            Apenas {bs.numContratos12m} contratos nos últimos 12 meses. A precisão estatística pode ser reduzida.
          </AlertDescription>
        </Alert>
      )}

      {/* GRID PRINCIPAL: DASHBOARD & CONTROLES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUNA ESQUERDA: SIMULADOR E INSIGHTS (STICKY) */}
        <aside className="lg:col-span-4 space-y-6">
          <Card className="border-primary/20 shadow-md overflow-hidden">
            <div className="h-1.5 bg-primary" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" /> Simulador
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setValorAdicional(0)} className="h-7 text-xs">
                  Reset
                </Button>
              </div>
              <CardDescription>Ajuste variáveis para cenários futuros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <SimuladorSlider
                label="Volume Adicional (Propostas)"
                value={valorAdicional}
                max={500000}
                onChange={setValorAdicional}
                format={fmtBRL}
              />
              <SimuladorSlider
                label="Conversão Marginal"
                value={conversaoMarg * 100}
                max={100}
                onChange={(v) => setConversaoMarg(v / 100)}
                format={(v) => `${v}%`}
              />
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Impacto Mensal:</span>
                  <span className="font-bold text-primary">+{fmtBRL(valorAdicional * conversaoMarg)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  * Considerando ticket médio de {fmtBRL(ticketMarg || bs?.ticketReal)} e ciclo médio de{" "}
                  {bs?.tempoMedioFechamentoDias} dias.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* INSIGHTS REESTILIZADOS */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Lightbulb className="h-4 w-4" /> Insights da IA
            </h3>
            {insights.map((ins, i) => (
              <div
                key={i}
                className={cn(
                  "p-4 rounded-xl border flex gap-3 items-start transition-all hover:shadow-sm",
                  insightBg[ins.level],
                )}
              >
                {insightIcons[ins.level]}
                <p className="text-sm font-medium leading-tight">{ins.text}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* COLUNA DIREITA: DADOS E GRÁFICOS */}
        <main className="lg:col-span-8 space-y-8">
          {/* SELETOR DE MÊS FOCO ESTILO TIMELINE */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              Selecione o mês para detalhamento:
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {fm.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setMesFoco(i)}
                  className={cn(
                    "flex-shrink-0 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                    safeMesFoco === i
                      ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                      : "bg-card hover:border-primary/50",
                  )}
                >
                  {m.mes}
                </button>
              ))}
            </div>
          </div>

          {/* CARDS DE KPI COM MAIOR IMPACTO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              label="Receita Projetada"
              value={fmtBRL(mesFocoData?.forecastTotal)}
              icon={<TrendingUp className="h-5 w-5" />}
              trend={mesFocoData && mesFocoData.forecastTotal >= mesFocoData.meta ? "up" : "down"}
              sub={`Meta: ${fmtBRL(mesFocoData?.meta)}`}
            />
            <KPICard
              label="Ação Necessária"
              value={fmtBRL(mesFocoData?.acaoNecessariaRS)}
              icon={<Target className="h-5 w-5" />}
              variant={mesFocoData?.gap > 0 ? "destructive" : "success"}
              sub={`${mesFocoData?.propostasEquiv || 0} propostas em aberto`}
            />
            <KPICard
              label="Pipeline Ponderado"
              value={fmtBRL(pipeline?.valorPonderado)}
              icon={<PieChart className="h-5 w-5" />}
              sub={`${pipeline?.qtdPropostas || 0} negociações ativas`}
            />
          </div>

          {/* GRÁFICO PRINCIPAL EM CARD DE DESTAQUE */}
          <Card className="shadow-lg border-none bg-slate-50/50 dark:bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-xl">Composição do Forecast</CardTitle>
              <CardDescription>Baseline vs Pipeline vs Esforço Adicional</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={fm}>
                    <defs>
                      <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="mes"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `R$${v / 1000}k`}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="baseline" stackId="a" fill="url(#colorBaseline)" radius={[0, 0, 0, 0]} barSize={40} />
                    <Bar dataKey="pipelineAlloc" stackId="a" fill="hsl(var(--chart-2))" barSize={40} />
                    <Bar
                      dataKey="incrementalAlloc"
                      stackId="a"
                      fill="hsl(var(--chart-3))"
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                    <Line
                      type="monotone"
                      dataKey="meta"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(var(--destructive))" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

// ─── COMPONENTES DE APOIO ──────────────────────────────────────────

function SimuladorSlider({ label, value, max, onChange, format }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <Label className="text-xs font-bold uppercase text-muted-foreground">{label}</Label>
        <span className="text-sm font-bold text-primary">{format(value)}</span>
      </div>
      <Slider
        value={[value]}
        max={max}
        step={max / 100}
        onValueChange={([v]) => onChange(v)}
        className="cursor-pointer"
      />
    </div>
  );
}

function KPICard({ label, value, icon, sub, variant, trend }: any) {
  return (
    <Card className="relative overflow-hidden border-none shadow-sm bg-background">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-muted rounded-lg text-muted-foreground">{icon}</div>
          {trend && (
            <Badge variant={trend === "up" ? "success" : "destructive"} className="text-[10px]">
              {trend === "up" ? "Dentro da Meta" : "Abaixo da Meta"}
            </Badge>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <h3
            className={cn(
              "text-2xl font-bold tracking-tight mt-1",
              variant === "destructive"
                ? "text-destructive"
                : variant === "success"
                  ? "text-success"
                  : "text-foreground",
            )}
          >
            {value}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1 uppercase font-semibold">
            {sub}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background/95 backdrop-blur-sm border rounded-xl shadow-xl p-4 min-w-[240px]">
      <p className="font-bold text-lg mb-3 border-b pb-2">{label}</p>
      <div className="space-y-2">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
            </div>
            <span className="font-mono font-bold">{fmtBRL(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
