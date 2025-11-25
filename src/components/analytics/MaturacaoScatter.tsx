import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MaturacaoData } from "@/hooks/useMaturacaoComercial";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from "recharts";
import { useMemo } from "react";

interface MaturacaoScatterProps {
  data: MaturacaoData[] | undefined;
  isLoading: boolean;
}

const TIPO_PISO_COLORS: Record<string, string> = {
  "Pintura Epóxi": "#3B82F6",
  "Pintura PU": "#8B5CF6",
  "Pintura PU Quadra": "#8B5CF6",
  "Pintura Acrílica": "#F59E0B",
  "Pintura Acrílica Quadra": "#F59E0B",
  "Piso Autonivelante": "#EC4899",
  "Piso Uretano": "#0EA5E9",
  "Pintura de Parede": "#F59E0B",
  "Rodapé Abaulado": "#D946EF",
  Concretagem: "#78716C",
  "Cimento Queimado": "#10B981",
  Revestimento: "#EF4444",
  Impermeabilização: "#06B6D4",
  "Não especificado": "#94A3B8",
};

const getColor = (tipoPiso: string): string => {
  return TIPO_PISO_COLORS[tipoPiso] || "#94A3B8";
};

export const MaturacaoScatter = ({ data, isLoading }: MaturacaoScatterProps) => {
  const chartData = useMemo(() => {
    if (!data) return [];

    return data.map((d) => ({
      x: d.dias_cliente_proposta,
      y: d.dias_proposta_contrato,
      tipo_piso: d.tipo_piso,
      cliente: d.cliente_nome,
      valor: d.valor_total,
      dias_total: d.dias_cliente_contrato,
      z: Math.min(200, Math.max(80, d.valor_total / 300)), // tamanho dinâmico do ponto
      fill: getColor(d.tipo_piso),
    }));
  }, [data]);

  const maxX = useMemo(() => {
    if (!chartData.length) return 30;
    return Math.max(...chartData.map((d) => d.x)) + 5;
  }, [chartData]);

  const maxY = useMemo(() => {
    if (!chartData.length) return 30;
    return Math.max(...chartData.map((d) => d.y)) + 5;
  }, [chartData]);

  const tiposPiso = useMemo(() => {
    if (!data) return [];
    const tipos = Array.from(new Set(data.map((d) => d.tipo_piso)));
    return tipos.slice(0, 10); // Limitar a 10 tipos
  }, [data]);

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Padrões: Proposta vs Fechamento</CardTitle>
          <CardDescription>Cada ponto representa um contrato. Tamanho = valor, cor = tipo de piso</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
            <p className="text-lg font-semibold mb-2">Nenhum dado disponível</p>
            <p className="text-sm">Adicione contratos vinculados a propostas para ver esta análise</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Padrões: Proposta vs Fechamento</CardTitle>
        <CardDescription>
          Cada ponto representa um contrato. Tamanho indica o valor, cor indica o tipo de piso. Linhas tracejadas
          mostram as metas (7 dias para proposta, 14 dias para contrato).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 80, left: 70 }}>
            {/* Quadrante ideal (verde claro) */}
            <ReferenceArea x1={0} x2={7} y1={0} y2={14} fill="#D1FAE5" fillOpacity={0.3} strokeOpacity={0} />

            {/* Outros quadrantes (cinza claro) */}
            <ReferenceArea x1={7} x2={maxX} y1={0} y2={14} fill="#F8FAFC" fillOpacity={0.5} strokeOpacity={0} />
            <ReferenceArea x1={0} x2={7} y1={14} y2={maxY} fill="#F8FAFC" fillOpacity={0.5} strokeOpacity={0} />
            <ReferenceArea x1={7} x2={maxX} y1={14} y2={maxY} fill="#F8FAFC" fillOpacity={0.5} strokeOpacity={0} />

            <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" strokeWidth={1} />

            <XAxis
              type="number"
              dataKey="x"
              name="Dias até Proposta"
              label={{
                value: "Dias até Proposta",
                position: "insideBottom",
                offset: -10,
                style: { fontSize: 14, fontWeight: 600, fill: "hsl(var(--foreground))" },
              }}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              domain={[0, maxX]}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Dias até Fechamento"
              label={{
                value: "Dias até Fechamento",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 14, fontWeight: 600, fill: "hsl(var(--foreground))" },
              }}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              domain={[0, maxY]}
            />

            {/* Linhas de referência (metas) */}
            <ReferenceLine
              x={7}
              stroke="#475569"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              opacity={0.9}
              label={{
                value: "Meta: 7 dias",
                position: "top",
                fill: "#475569",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <ReferenceLine
              y={14}
              stroke="#475569"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              opacity={0.9}
              label={{
                value: "Meta: 14 dias",
                position: "right",
                fill: "#475569",
                fontSize: 11,
                fontWeight: 600,
              }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0].payload;

                return (
                  <div className="bg-background border-2 border-border rounded-lg p-4 shadow-xl">
                    <p className="font-bold text-base mb-3 text-foreground">{point.cliente}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: point.fill }} />
                        <span className="font-medium">{point.tipo_piso}</span>
                      </div>
                      <div className="border-t pt-2 space-y-1 text-muted-foreground">
                        <p>
                          <span className="font-semibold text-foreground">Dias até proposta:</span> {point.x} dias
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">Dias até fechamento:</span> {point.y} dias
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">Tempo total:</span> {point.dias_total} dias
                        </p>
                        <p className="pt-1 border-t">
                          <span className="font-semibold text-foreground">Valor:</span> R${" "}
                          {point.valor.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            <Legend
              verticalAlign="bottom"
              height={70}
              content={() => (
                <div className="flex flex-wrap gap-4 justify-center mt-6 px-4">
                  {tiposPiso.map((tipo) => (
                    <div key={tipo} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-background shadow-sm"
                        style={{ backgroundColor: getColor(tipo) }}
                      />
                      <span className="font-medium text-foreground">{tipo}</span>
                    </div>
                  ))}
                </div>
              )}
            />

            <Scatter name="Contratos" data={chartData} fill="#8884d8" fillOpacity={0.75} />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
