import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BoxplotData } from "@/hooks/useMaturacaoComercial";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

interface MaturacaoBoxplotProps {
  data: BoxplotData[] | undefined;
  isLoading: boolean;
}

const CustomBoxplot = ({ data }: { data: BoxplotData[] }) => {
  // Transformar dados para o formato do Recharts
  const chartData = data.map((item) => ({
    categoria: item.categoria,
    min: item.min,
    q1: item.q1,
    mediana: item.mediana,
    q3: item.q3,
    max: item.max,
    media: item.media,
    meta: item.meta,
    range: item.q3 - item.q1,
    start: item.q1,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" domain={[0, "auto"]} label={{ value: "Dias", position: "bottom" }} />
        <YAxis type="category" dataKey="categoria" width={140} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload || !payload.length) return null;
            const item = data.find((d) => d.categoria === payload[0].payload.categoria);
            if (!item) return null;

            return (
              <div className="bg-background border rounded-lg p-3 shadow-lg">
                <p className="font-semibold text-sm mb-2">{item.categoria}</p>
                <div className="space-y-1 text-xs">
                  <p>Mínimo: {item.min} dias</p>
                  <p>Q1: {item.q1} dias</p>
                  <p className="font-semibold">Mediana: {item.mediana} dias</p>
                  <p>Q3: {item.q3} dias</p>
                  <p>Máximo: {item.max} dias</p>
                  <p className="text-orange-500">Média: {item.media.toFixed(1)} dias</p>
                  <p className="text-green-600">Meta: {item.meta} dias</p>
                  {item.outliers.length > 0 && (
                    <p className="text-destructive">Outliers: {item.outliers.length}</p>
                  )}
                </div>
              </div>
            );
          }}
        />

        {/* Box (Q1 to Q3) */}
        <Bar dataKey="range" stackId="box" fill="hsl(var(--primary))" fillOpacity={0.6}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} />
          ))}
        </Bar>

        {/* Linhas de meta */}
        {chartData.map((item, idx) => (
          <ReferenceLine
            key={`meta-${idx}`}
            x={item.meta}
            stroke="hsl(var(--chart-2))"
            strokeDasharray="3 3"
            strokeWidth={2}
            ifOverflow="extendDomain"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export const MaturacaoBoxplot = ({ data, isLoading }: MaturacaoBoxplotProps) => {
  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.every((d) => d.max === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição do Tempo de Maturação</CardTitle>
          <CardDescription>Boxplot mostrando mínimo, quartis, mediana, máximo e outliers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
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
        <CardTitle>Distribuição do Tempo de Maturação</CardTitle>
        <CardDescription>
          Visualização dos tempos de cada etapa. Linhas tracejadas indicam as metas estabelecidas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CustomBoxplot data={data} />
        <div className="flex flex-wrap gap-4 justify-center mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/60 rounded" />
            <span>Intervalo Interquartil (Q1-Q3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-chart-2 border-dashed" />
            <span>Meta</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
