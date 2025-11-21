import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Clock, Target } from "lucide-react";
import { MaturacaoKPIs } from "@/hooks/useMaturacaoComercial";

interface MaturacaoCardKpisProps {
  data: MaturacaoKPIs | undefined;
  isLoading: boolean;
}

const getStatusBadge = (valor: number, tipo: "cliente_proposta" | "proposta_contrato" | "total" | "percentual") => {
  if (tipo === "percentual") {
    if (valor >= 70) return { variant: "default" as const, label: "Excelente" };
    if (valor >= 50) return { variant: "secondary" as const, label: "Bom" };
    return { variant: "destructive" as const, label: "Atenção" };
  }

  let meta = 21;
  if (tipo === "cliente_proposta") meta = 7;
  else if (tipo === "proposta_contrato") meta = 14;

  const razao = valor / meta;
  if (razao <= 1) return { variant: "default" as const, label: "Dentro da Meta" };
  if (razao <= 2) return { variant: "secondary" as const, label: "Acima da Meta" };
  return { variant: "destructive" as const, label: "Crítico" };
};

export const MaturacaoCardKpis = ({ data, isLoading }: MaturacaoCardKpisProps) => {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: "Tempo Médio Cliente → Proposta",
      value: data.media_cliente_proposta,
      tipo: "cliente_proposta" as const,
      icon: Clock,
      format: (v: number) => `${Math.round(v)} dias`,
    },
    {
      label: "Tempo Médio Proposta → Contrato",
      value: data.media_proposta_contrato,
      tipo: "proposta_contrato" as const,
      icon: Clock,
      format: (v: number) => `${Math.round(v)} dias`,
    },
    {
      label: "Tempo Médio Total",
      value: data.media_cliente_contrato,
      tipo: "total" as const,
      icon: Clock,
      format: (v: number) => `${Math.round(v)} dias`,
    },
    {
      label: "Taxa de Sucesso (≤14 dias)",
      value: data.percentual_meta_14_dias,
      tipo: "percentual" as const,
      icon: Target,
      format: (v: number) => `${v.toFixed(1)}%`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const badge = getStatusBadge(kpi.value, kpi.tipo);
        const Icon = kpi.icon;

        return (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.format(kpi.value)}</p>
                  <Badge variant={badge.variant} className="text-xs">
                    {badge.label}
                  </Badge>
                </div>
                <Icon className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
