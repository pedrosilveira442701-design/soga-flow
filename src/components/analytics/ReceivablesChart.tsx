import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceivablesAgingData } from "@/hooks/useAnalytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { AlertTriangle, Clock } from "lucide-react";

interface ReceivablesChartProps {
  data?: ReceivablesAgingData[];
  isLoading?: boolean;
}

const BUCKET_COLORS: Record<string, string> = {
  "1-15 dias": "#10b981",
  "16-30 dias": "#f59e0b",
  "31-60 dias": "#ef4444",
  ">60 dias": "#991b1b",
};

const RISK_LEVEL: Record<string, string> = {
  "1-15 dias": "Baixo",
  "16-30 dias": "Médio",
  "31-60 dias": "Alto",
  ">60 dias": "Crítico",
};

export function ReceivablesChart({ data, isLoading }: ReceivablesChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recebíveis - Aging Report</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recebíveis - Aging Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma parcela em aberto no momento</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalValor = data.reduce((sum, d) => sum + d.valor, 0);
  const totalParcelas = data.reduce((sum, d) => sum + d.count, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{data.bucket}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Valor:</span>{" "}
            <span className="font-medium">
              R$ {data.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Parcelas:</span>{" "}
            <span className="font-medium">{data.count}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">% do Total:</span>{" "}
            <span className="font-medium">{data.percentual.toFixed(1)}%</span>
          </p>
          <p className="text-sm mt-2">
            <span className="text-muted-foreground">Risco:</span>{" "}
            <span
              className={`font-medium ${
                RISK_LEVEL[data.bucket] === "Crítico"
                  ? "text-destructive"
                  : RISK_LEVEL[data.bucket] === "Alto"
                  ? "text-orange-500"
                  : "text-yellow-500"
              }`}
            >
              {RISK_LEVEL[data.bucket]}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Calcular parcelas em risco (>30 dias)
  const emRisco = data
    .filter((d) => d.bucket === "31-60 dias" || d.bucket === ">60 dias")
    .reduce((sum, d) => sum + d.valor, 0);
  const percentualRisco = totalValor > 0 ? (emRisco / totalValor) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recebíveis - Aging Report</span>
          <div className="text-right">
            <p className="text-sm font-normal text-muted-foreground">Total em Aberto</p>
            <p className="text-lg font-bold text-primary">
              R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="bucket" className="text-xs" tick={{ fontSize: 12 }} />
            <YAxis
              className="text-xs"
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="valor" name="Valor em Aberto" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={BUCKET_COLORS[entry.bucket] || "#94a3b8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Alertas de Risco */}
        {percentualRisco > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive mb-1">
                  Atenção: Parcelas em Risco
                </p>
                <p className="text-sm text-muted-foreground">
                  R$ {emRisco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({percentualRisco.toFixed(1)}% do total)
                  estão com mais de 30 dias de atraso. Recomenda-se ação imediata de cobrança.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Distribuição Detalhada */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-semibold mb-3">📊 Distribuição por Aging:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.map((bucket) => (
              <div
                key={bucket.bucket}
                className="p-3 rounded-lg border"
                style={{ borderColor: BUCKET_COLORS[bucket.bucket] + "40" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: BUCKET_COLORS[bucket.bucket] }}
                  />
                  <p className="text-xs font-medium">{bucket.bucket}</p>
                </div>
                <p className="text-sm font-semibold">
                  R$ {bucket.valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {bucket.count} parcelas • {bucket.percentual.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Risco: {RISK_LEVEL[bucket.bucket]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* KPIs Resumo */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total de Parcelas</p>
              <p className="text-2xl font-bold">{totalParcelas}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Ticket Médio</p>
              <p className="text-lg font-semibold">
                R$ {(totalValor / totalParcelas).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <p className="text-xs text-muted-foreground">Em Risco (&gt;30d)</p>
              <p className="text-lg font-semibold text-destructive">
                {percentualRisco.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
