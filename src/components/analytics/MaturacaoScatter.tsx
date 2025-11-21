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
  Legend,
} from "recharts";
import { useMemo } from "react";

interface MaturacaoScatterProps {
  data: MaturacaoData[] | undefined;
  isLoading: boolean;
}

const TIPO_PISO_COLORS: Record<string, string> = {
  "Pintura Epóxi": "hsl(var(--chart-1))",
  "Pintura PU": "hsl(var(--chart-2))",
  "Piso Autonivelante": "hsl(var(--chart-3))",
  "Pintura de Parede": "hsl(var(--chart-4))",
  "Cimento Queimado": "hsl(var(--chart-5))",
  "Revestimento": "hsl(220, 90%, 56%)",
  "Impermeabilização": "hsl(190, 90%, 50%)",
  "Não especificado": "hsl(var(--muted))",
};

const getColor = (tipoPiso: string): string => {
  return TIPO_PISO_COLORS[tipoPiso] || "hsl(var(--muted))";
};

export const MaturacaoScatter = ({ data, isLoading }: MaturacaoScatterProps) => {
  const chartData = useMemo(() => {
    if (!data) return [];

    // Normalizar tamanhos dos pontos (min 40, max 200)
    const valores = data.map((d) => d.valor_total);
    const minValor = Math.min(...valores);
    const maxValor = Math.max(...valores);
    const range = maxValor - minValor || 1;

    return data.map((d) => ({
      x: d.dias_cliente_proposta,
      y: d.dias_proposta_contrato,
      tipo_piso: d.tipo_piso,
      cliente: d.cliente_nome,
      valor: d.valor_total,
      z: 40 + ((d.valor_total - minValor) / range) * 160, // tamanho do ponto
      fill: getColor(d.tipo_piso),
    }));
  }, [data]);

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
          <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              dataKey="x"
              name="Dias até Proposta"
              label={{ value: "Dias até Proposta", position: "bottom", offset: 0 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Dias até Fechamento"
              label={{ value: "Dias até Fechamento", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0].payload;

                return (
                  <div className="bg-background border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold text-sm mb-2">{point.cliente}</p>
                    <div className="space-y-1 text-xs">
                      <p>Tipo: {point.tipo_piso}</p>
                      <p>Dias até proposta: {point.x} dias</p>
                      <p>Dias até fechamento: {point.y} dias</p>
                      <p>
                        Valor: R${" "}
                        {point.valor.toLocaleString("pt-BR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={60}
              content={() => (
                <div className="flex flex-wrap gap-3 justify-center mt-4">
                  {tiposPiso.map((tipo) => (
                    <div key={tipo} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(tipo) }} />
                      <span>{tipo}</span>
                    </div>
                  ))}
                </div>
              )}
            />
            <ReferenceLine x={7} stroke="hsl(var(--chart-2))" strokeDasharray="3 3" strokeWidth={2} />
            <ReferenceLine y={14} stroke="hsl(var(--chart-2))" strokeDasharray="3 3" strokeWidth={2} />
            <Scatter name="Contratos" data={chartData} fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
