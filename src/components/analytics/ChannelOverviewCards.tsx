import { Card, CardContent } from "@/components/ui/card";
import { Users, FileText, Handshake, DollarSign, TrendingUp, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { OverviewKPIs } from "@/hooks/useChannelAnalytics";

interface ChannelOverviewCardsProps {
  data?: OverviewKPIs;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ChannelOverviewCards({ data, isLoading }: ChannelOverviewCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      label: "Leads no Período",
      value: data.total_leads.toString(),
      icon: Users,
      color: "text-blue-500",
    },
    {
      label: "Propostas Geradas",
      value: data.total_propostas.toString(),
      icon: FileText,
      color: "text-purple-500",
    },
    {
      label: "Negócios Fechados",
      value: data.total_fechados.toString(),
      icon: Handshake,
      color: "text-green-500",
    },
    {
      label: "Valor Propostas",
      value: formatCurrency(data.valor_propostas),
      icon: DollarSign,
      color: "text-amber-500",
    },
    {
      label: "Valor Fechado",
      value: formatCurrency(data.valor_fechados),
      icon: TrendingUp,
      color: "text-emerald-500",
    },
    {
      label: `Canal Top: ${data.canal_top}`,
      value: `${data.canal_top_fechados} fechados`,
      subValue: formatCurrency(data.canal_top_valor),
      icon: Trophy,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground line-clamp-1">{card.label}</p>
                <p className="text-xl font-bold">{card.value}</p>
                {card.subValue && (
                  <p className="text-xs text-muted-foreground">{card.subValue}</p>
                )}
              </div>
              <card.icon className={cn("h-8 w-8 opacity-50", card.color)} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
