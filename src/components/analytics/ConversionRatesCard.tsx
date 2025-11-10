import { Card } from "@/components/ui/card";
import { TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ConversionRatesData {
  total_leads: number;
  total_propostas: number;
  total_contratos: number;
}

interface ConversionRatesCardProps {
  data: ConversionRatesData | null;
  isLoading: boolean;
}

export function ConversionRatesCard({ data, isLoading }: ConversionRatesCardProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Sem dados disponíveis</p>
      </Card>
    );
  }

  const { total_leads, total_propostas, total_contratos } = data;

  // Calcular taxas de conversão
  const leadsToPropostas = total_leads > 0 ? (total_propostas / total_leads) * 100 : 0;
  const propostasToContratos = total_propostas > 0 ? (total_contratos / total_propostas) * 100 : 0;
  const leadsToContratos = total_leads > 0 ? (total_contratos / total_leads) * 100 : 0;

  // Função para determinar cor e ícone baseado no valor
  const getIndicator = (value: number) => {
    if (value >= 40) {
      return {
        color: "text-success",
        bgColor: "bg-success/10",
        icon: CheckCircle2,
        label: "Excelente",
      };
    } else if (value >= 20) {
      return {
        color: "text-warning",
        bgColor: "bg-warning/10",
        icon: AlertTriangle,
        label: "Atenção",
      };
    } else {
      return {
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        icon: AlertTriangle,
        label: "Crítico",
      };
    }
  };

  // Gerar recomendações
  const getRecommendations = () => {
    const recommendations = [];
    
    if (leadsToPropostas < 40) {
      recommendations.push({
        title: "Conversão Leads → Propostas baixa",
        text: "Melhorar tempo de resposta e qualificação de leads.",
        priority: leadsToPropostas < 20 ? "high" : "medium",
      });
    }
    
    if (propostasToContratos < 40) {
      recommendations.push({
        title: "Conversão Propostas → Contratos baixa",
        text: "Revisar argumentos comerciais, proposta e follow-up.",
        priority: propostasToContratos < 20 ? "high" : "medium",
      });
    }
    
    if (leadsToContratos >= 40) {
      recommendations.push({
        title: "Desempenho excelente!",
        text: "Manter estratégia atual e replicar boas práticas.",
        priority: "success",
      });
    }
    
    return recommendations;
  };

  const leadsIndicator = getIndicator(leadsToPropostas);
  const propostasIndicator = getIndicator(propostasToContratos);
  const totalIndicator = getIndicator(leadsToContratos);
  const recommendations = getRecommendations();

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-h3">Taxas de Conversão</h3>
      </div>

      {/* Totais absolutos */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-caption text-muted-foreground mb-1">Leads</p>
          <p className="text-2xl font-bold text-foreground">{total_leads}</p>
        </div>
        <div className="text-center">
          <p className="text-caption text-muted-foreground mb-1">Propostas</p>
          <p className="text-2xl font-bold text-foreground">{total_propostas}</p>
        </div>
        <div className="text-center">
          <p className="text-caption text-muted-foreground mb-1">Contratos</p>
          <p className="text-2xl font-bold text-foreground">{total_contratos}</p>
        </div>
      </div>

      {/* Taxas de conversão */}
      <div className="space-y-4 mb-6">
        {/* Leads → Propostas */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-full", leadsIndicator.bgColor)}>
              <leadsIndicator.icon className={cn("h-4 w-4", leadsIndicator.color)} />
            </div>
            <div>
              <p className="text-body font-medium">Leads → Propostas</p>
              <p className="text-caption text-muted-foreground">{leadsIndicator.label}</p>
            </div>
          </div>
          <p className={cn("text-2xl font-bold", leadsIndicator.color)}>
            {leadsToPropostas.toFixed(1)}%
          </p>
        </div>

        {/* Propostas → Contratos */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-full", propostasIndicator.bgColor)}>
              <propostasIndicator.icon className={cn("h-4 w-4", propostasIndicator.color)} />
            </div>
            <div>
              <p className="text-body font-medium">Propostas → Contratos</p>
              <p className="text-caption text-muted-foreground">{propostasIndicator.label}</p>
            </div>
          </div>
          <p className={cn("text-2xl font-bold", propostasIndicator.color)}>
            {propostasToContratos.toFixed(1)}%
          </p>
        </div>

        {/* Total (Leads → Contratos) */}
        <div className="flex items-center justify-between p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-full", totalIndicator.bgColor)}>
              <totalIndicator.icon className={cn("h-4 w-4", totalIndicator.color)} />
            </div>
            <div>
              <p className="text-body font-semibold">Conversão Total</p>
              <p className="text-caption text-muted-foreground">{totalIndicator.label}</p>
            </div>
          </div>
          <p className={cn("text-2xl font-bold", totalIndicator.color)}>
            {leadsToContratos.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Recomendações */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-caption font-semibold text-muted-foreground uppercase tracking-wide">
            Recomendações
          </h4>
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className={cn(
                "p-3 rounded-lg border",
                rec.priority === "high" && "border-destructive/30 bg-destructive/5",
                rec.priority === "medium" && "border-warning/30 bg-warning/5",
                rec.priority === "success" && "border-success/30 bg-success/5"
              )}
            >
              <p className="text-body font-medium mb-1">{rec.title}</p>
              <p className="text-caption text-muted-foreground">{rec.text}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
