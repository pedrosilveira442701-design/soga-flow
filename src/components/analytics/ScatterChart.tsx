import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { TrendingUp, Filter } from "lucide-react";

interface ScatterChartProps {
  data?: ScatterDataPoint[];
  isLoading?: boolean;
}

const TIPO_COLORS: Record<string, string> = {
  // Pinturas Epóxi - Azul
  "Pintura Epóxi": "#3b82f6",
  
  // Pinturas PU - Tons de Roxo
  "Pintura PU": "#8b5cf6",
  "Pintura PU Quadra": "#a78bfa",
  
  // Pinturas Acrílicas - Tons de Verde
  "Pintura Acrílica": "#10b981",
  "Pintura Acrílica Quadra": "#34d399",
  
  // Pintura de Parede - Amarelo
  "Pintura de Parede": "#eab308",
  
  // Piso Autonivelante - Vermelho
  "Piso Autonivelante": "#ef4444",
  
  // Outros - Cinza
  "Não especificado": "#94a3b8",
};

// Cores adicionais para tipos customizados ou combinações
const EXTENDED_COLORS = [
  "#ef4444", // Vermelho
  "#ec4899", // Rosa
  "#f97316", // Laranja escuro
  "#84cc16", // Lima
  "#14b8a6", // Teal
  "#0ea5e9", // Azul claro
  "#6366f1", // Indigo
  "#d946ef", // Fuchsia
  "#f43f5e", // Rosa escuro
  "#22c55e", // Verde claro
];

// Cache de cores geradas para tipos não mapeados
const colorCache = new Map<string, string>();

const getColorForType = (tipo: string) => {
  // Se já existe cor definida, retorna
  if (TIPO_COLORS[tipo]) {
    return TIPO_COLORS[tipo];
  }
  
  // Se já gerou cor para este tipo, retorna do cache
  if (colorCache.has(tipo)) {
    return colorCache.get(tipo)!;
  }
  
  // Gera hash simples baseado no nome do tipo
  let hash = 0;
  for (let i = 0; i < tipo.length; i++) {
    hash = ((hash << 5) - hash) + tipo.charCodeAt(i);
    hash = hash & hash;
  }
  
  // Seleciona cor baseada no hash
  const colorIndex = Math.abs(hash) % EXTENDED_COLORS.length;
  const color = EXTENDED_COLORS[colorIndex];
  
  // Armazena no cache
  colorCache.set(tipo, color);
  
  return color;
};

export function ScatterChart({ data, isLoading }: ScatterChartProps) {
  const [selectedType, setSelectedType] = useState<string>("all");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preço x Margem por Tipo de Serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[600px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preço x Margem por Tipo de Serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sem dados disponíveis para o período selecionado</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Agrupar dados por tipo de serviço
  const groupedData = data.reduce((acc, point) => {
    if (!acc[point.tipo_piso]) {
      acc[point.tipo_piso] = [];
    }
    acc[point.tipo_piso].push(point);
    return acc;
  }, {} as Record<string, ScatterDataPoint[]>);

  // Tipos disponíveis
  const tipos = Object.keys(groupedData).sort();

  // Filtrar dados por tipo selecionado
  const filteredData = selectedType === "all" 
    ? data 
    : groupedData[selectedType] || [];

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

  // Calcular médias por tipo de serviço
  const estatisticasPorTipo = tipos.map(tipo => {
    const dadosTipo = groupedData[tipo];
    const precos = dadosTipo.map(d => d.valor_m2);
    const margens = dadosTipo.map(d => d.margem_pct);
    const areas = dadosTipo.map(d => d.m2);
    
    return {
      tipo,
      avgPreco: precos.reduce((sum, p) => sum + p, 0) / precos.length,
      avgMargem: margens.reduce((sum, m) => sum + m, 0) / margens.length,
      totalArea: areas.reduce((sum, a) => sum + a, 0),
      count: dadosTipo.length,
      minPreco: Math.min(...precos),
      maxPreco: Math.max(...precos),
    };
  }).sort((a, b) => b.count - a.count);

  // Médias do tipo selecionado ou geral
  const estatisticasAtual = selectedType === "all"
    ? {
        avgPreco: data.reduce((sum, d) => sum + d.valor_m2, 0) / data.length,
        avgMargem: data.reduce((sum, d) => sum + d.margem_pct, 0) / data.length,
        totalArea: data.reduce((sum, d) => sum + d.m2, 0),
        count: data.length,
      }
    : {
        avgPreco: estatisticasPorTipo.find(e => e.tipo === selectedType)?.avgPreco || 0,
        avgMargem: estatisticasPorTipo.find(e => e.tipo === selectedType)?.avgMargem || 0,
        totalArea: estatisticasPorTipo.find(e => e.tipo === selectedType)?.totalArea || 0,
        count: estatisticasPorTipo.find(e => e.tipo === selectedType)?.count || 0,
      };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Preço x Margem por Tipo de Serviço</span>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-normal text-muted-foreground">
              Tamanho = área (m²)
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtro por tipo */}
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={selectedType === "all" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedType("all")}
          >
            Todos ({data.length})
          </Badge>
          {tipos.map(tipo => (
            <Badge
              key={tipo}
              variant={selectedType === tipo ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedType(tipo)}
            >
              {tipo} ({groupedData[tipo].length})
            </Badge>
          ))}
        </div>

        {/* Gráfico */}
        <ResponsiveContainer width="100%" height={400}>
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
              range={[50, 400]} 
              name="Área (m²)"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            {selectedType === "all" ? (
              <>
                <Legend />
                {Object.entries(groupedData).map(([tipo, points]) => (
                  <Scatter
                    key={tipo}
                    name={tipo}
                    data={points}
                    fill={getColorForType(tipo)}
                    fillOpacity={0.7}
                  />
                ))}
              </>
            ) : (
              <Scatter
                name={selectedType}
                data={filteredData}
                fill={getColorForType(selectedType)}
                fillOpacity={0.8}
              />
            )}
          </RechartsScatter>
        </ResponsiveContainer>

        {/* Estatísticas do filtro atual */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              📊 {selectedType === "all" ? "Médias Gerais" : `Estatísticas: ${selectedType}`}
            </h3>
            <span className="text-xs text-muted-foreground">
              {estatisticasAtual.count} {estatisticasAtual.count === 1 ? 'serviço' : 'serviços'}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground">Preço/m² médio</p>
              <p className="text-lg font-semibold text-primary">
                R$ {estatisticasAtual.avgPreco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground">Margem média</p>
              <p className="text-lg font-semibold text-primary">
                {estatisticasAtual.avgMargem.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground">Área total</p>
              <p className="text-lg font-semibold text-primary">
                {estatisticasAtual.totalArea.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} m²
              </p>
            </div>
          </div>

          {/* Tabela comparativa por tipo */}
          {selectedType === "all" && estatisticasPorTipo.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">📋 Comparativo por Tipo de Serviço:</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Tipo</th>
                      <th className="text-right p-2 font-medium">Preço/m²</th>
                      <th className="text-right p-2 font-medium">Margem</th>
                      <th className="text-right p-2 font-medium">Área Total</th>
                      <th className="text-right p-2 font-medium">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estatisticasPorTipo.map((stat, idx) => (
                      <tr 
                        key={stat.tipo} 
                        className={`border-t hover:bg-muted/30 cursor-pointer ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                        onClick={() => setSelectedType(stat.tipo)}
                      >
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: getColorForType(stat.tipo) }}
                            />
                            <span className="font-medium">{stat.tipo}</span>
                          </div>
                        </td>
                        <td className="text-right p-2 font-mono">
                          R$ {stat.avgPreco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-right p-2 font-mono">
                          {stat.avgMargem.toFixed(1)}%
                        </td>
                        <td className="text-right p-2 font-mono">
                          {stat.totalArea.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} m²
                        </td>
                        <td className="text-right p-2">
                          <Badge variant="secondary">{stat.count}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recomendação */}
          {selectedType !== "all" && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm">
                <span className="font-semibold text-primary">💡 Dica:</span>{" "}
                <span className="text-muted-foreground">
                  Use este preço médio como referência para futuras propostas de <strong>{selectedType}</strong>.
                  Mantenha a margem acima de {estatisticasAtual.avgMargem.toFixed(1)}% para rentabilidade saudável.
                </span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
