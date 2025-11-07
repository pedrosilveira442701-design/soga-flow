import { KPICard } from "@/components/kpi/KPICard";
import { MapaKPIs } from "@/hooks/useMapaGeografico";
import { MapPin, DollarSign, Target, TrendingUp } from "lucide-react";

interface MapaKPICardsProps {
  kpis: MapaKPIs;
  modo: "propostas" | "contratos" | "obras";
}

export function MapaKPICards({ kpis, modo }: MapaKPICardsProps) {
  const getTitulos = () => {
    switch (modo) {
      case "propostas":
        return {
          total: "Total de Propostas",
          valor: "Valor Total Proposto",
          win: "Win Rate",
          ticket: "Ticket Médio",
        };
      case "contratos":
        return {
          total: "Total de Contratos",
          valor: "Receita Contratada",
          ticket: "Ticket Médio",
        };
      case "obras":
        return {
          total: "Obras em Execução",
          valor: "Valor em Obras",
          ticket: "Ticket Médio por Obra",
        };
    }
  };

  const titulos = getTitulos();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title={titulos.total}
        value={kpis.total_registros}
        icon={MapPin}
      />
      
      <KPICard
        title={titulos.valor}
        value={`R$ ${kpis.valor_total.toLocaleString("pt-BR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}`}
        icon={DollarSign}
        variant="liquid"
      />

      {modo === "propostas" && kpis.win_rate !== undefined && (
        <KPICard
          title={titulos.win}
          value={`${kpis.win_rate.toFixed(1)}%`}
          icon={Target}
        />
      )}

      <KPICard
        title={titulos.ticket}
        value={`R$ ${kpis.ticket_medio.toLocaleString("pt-BR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}`}
        icon={TrendingUp}
      />
    </div>
  );
}
