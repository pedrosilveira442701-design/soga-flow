import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScatterDataPoint } from "@/hooks/useAnalytics";
import { 
  ScatterChart as RechartsScatter, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ZAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface ScatterChartProps {
  data?: ScatterDataPoint[];
  isLoading?: boolean;
}

const TIPO_PISO_COLORS: Record<string, string> = {
  "Porcelanato": "#3b82f6",
  "Cerâmica": "#8b5cf6",
  "Vinílico": "#ec4899",
  "Laminado": "#f59e0b",
  "Madeira": "#10b981",
  "Não especificado": "#94a3b8",
};

export function ScatterChart({ data, isLoading }: ScatterChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preço x Margem por Tipo de Piso</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preço x Margem por Tipo de Piso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sem dados disponíveis para o período selecionado</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Agrupar dados por tipo de piso
  const groupedData = data.reduce((acc, point) => {
    if (!acc[point.tipo_piso]) {
      acc[point.tipo_piso] = [];
    }
    acc[point.tipo_piso].push(point);
    return acc;
  }, {} as Record<string, ScatterDataPoint[]>);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{data.cliente_nome}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Tipo:</span>{" "}
            <span className="font-medium">{data.tipo_piso}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Preço/m²:</span>{" "}
            <span className="font-medium">
              R$ {data.valor_m2.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Margem:</span>{" "}
            <span className="font-medium">{data.margem_pct.toFixed(1)}%</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Área:</span>{" "}
            <span className="font-medium">{data.m2.toFixed(0)} m²</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Calcular bandas de preço saudáveis (média ± desvio padrão)
  const precos = data.map((d) => d.valor_m2);
  const margens = data.map((d) => d.margem_pct);
  const avgPreco = precos.reduce((sum, p) => sum + p, 0) / precos.length;
  const avgMargem = margens.reduce((sum, m) => sum + m, 0) / margens.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Preço x Margem por Tipo de Piso</span>
          <span className="text-sm font-normal text-muted-foreground">
            Tamanho = área (m²)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <RechartsScatter>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number" 
              dataKey="valor_m2" 
              name="Preço/m²"
              label={{ value: "Preço/m² (R$)", position: "insideBottom", offset: -5 }}
              className="text-xs"
              tickFormatter={(value) => `R$ ${value}`}
            />
            <YAxis 
              type="number" 
              dataKey="margem_pct" 
              name="Margem %"
              label={{ value: "Margem (%)", angle: -90, position: "insideLeft" }}
              className="text-xs"
              tickFormatter={(value) => `${value}%`}
            />
            <ZAxis 
              type="number" 
              dataKey="m2" 
              range={[50, 500]} 
              name="Área (m²)"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Legend />
            {Object.entries(groupedData).map(([tipo, points]) => (
              <Scatter
                key={tipo}
                name={tipo}
                data={points}
                fill={TIPO_PISO_COLORS[tipo] || "#94a3b8"}
                fillOpacity={0.6}
              />
            ))}
          </RechartsScatter>
        </ResponsiveContainer>

        {/* Insights */}
        <div className="mt-4 pt-4 border-t space-y-3">
          <div>
            <p className="text-sm font-semibold mb-2">📊 Médias Gerais:</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground">Preço/m² médio</p>
                <p className="text-lg font-semibold">
                  R$ {avgPreco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground">Margem média</p>
                <p className="text-lg font-semibold">{avgMargem.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">🎯 Bandas de Preço Saudáveis:</p>
            <p className="text-sm text-muted-foreground">
              Concentre ofertas em preços próximos a <span className="font-medium">
                R$ {avgPreco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/m²
              </span> com margem acima de <span className="font-medium">{avgMargem.toFixed(1)}%</span> para maximizar rentabilidade.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
