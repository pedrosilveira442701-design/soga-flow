import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFunilComercial } from "@/hooks/useFunilComercial";
import type { FilterPeriod } from "@/hooks/useDashboard";
import { UserPlus, FileText, HandCoins, ArrowRight, Clock, TrendingUp } from "lucide-react";

interface Props {
  period: FilterPeriod;
  customDateRange?: { from: Date; to: Date };
}

type Modo = "coorte" | "atividade";
type Periodo = "all" | "year" | "month";

const PERIODO_LABEL: Record<Periodo, string> = { all: "Tudo", year: "Este ano", month: "Este mês" };

function Etapa({ icon: Icon, label, valor, sub, cor }: {
  icon: any; label: string; valor: number | string; sub?: string; cor: string;
}) {
  return (
    <div className="flex-1 min-w-0 text-center px-1">
      <div className={`mx-auto mb-2 h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center ${cor}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="text-xl sm:text-2xl font-semibold tabular-nums">{valor}</div>
      <div className="text-xs sm:text-sm font-medium leading-tight">{label}</div>
      {sub && <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">{sub}</div>}
    </div>
  );
}

function Seta({ taxa }: { taxa?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-1 shrink-0 self-start mt-2">
      <ArrowRight className="h-5 w-5 text-muted-foreground" />
      {taxa && <span className="text-xs font-medium text-muted-foreground mt-1">{taxa}</span>}
    </div>
  );
}

export function FunilComercialCard(_props: Props) {
  const [modo, setModo] = useState<Modo>("coorte");
  const [periodo, setPeriodo] = useState<Periodo>("all");
  const { coorte, atividade, isLoading } = useFunilComercial({ period: periodo });

  return (
    <Card className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:flex-wrap">
        <div className="min-w-0">
          <h3 className="text-h3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Funil Comercial
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {modo === "coorte"
              ? "Dos leads que chegaram no período — o que virou proposta e fechou (mesmo depois)"
              : "Eventos que aconteceram dentro do período"}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end shrink-0">
          <div className="flex rounded-lg border p-0.5">
            {(["all", "year", "month"] as Periodo[]).map((p) => (
              <Button key={p} size="sm" variant={periodo === p ? "default" : "ghost"}
                className="h-7 text-xs" onClick={() => setPeriodo(p)}>
                {PERIODO_LABEL[p]}
              </Button>
            ))}
          </div>
          <div className="flex rounded-lg border p-0.5">
            <Button size="sm" variant={modo === "coorte" ? "default" : "ghost"}
              className="h-7 text-xs" onClick={() => setModo("coorte")}>
              Por chegada
            </Button>
            <Button size="sm" variant={modo === "atividade" ? "default" : "ghost"}
              className="h-7 text-xs" onClick={() => setModo("atividade")}>
              Por atividade
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : modo === "coorte" ? (
        <>
          <div className="flex items-start justify-between gap-1">
            <Etapa icon={UserPlus} label="Chegaram" valor={coorte.chegaram}
              cor="bg-blue-500/15 text-blue-600" />
            <Seta taxa={`${coorte.taxaProposta}%`} />
            <Etapa icon={FileText} label="Geraram proposta" valor={coorte.proposta}
              sub={coorte.tempoMedioProposta != null ? `~${coorte.tempoMedioProposta}d até proposta` : undefined}
              cor="bg-amber-500/15 text-amber-600" />
            <Seta taxa={`${coorte.taxaFechouProposta}%`} />
            <Etapa icon={HandCoins} label="Fecharam" valor={coorte.fechou}
              sub={coorte.tempoMedioFechar != null ? `~${coorte.tempoMedioFechar}d até fechar` : undefined}
              cor="bg-green-500/15 text-green-600" />
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground border-t pt-3">
            <TrendingUp className="h-4 w-4" />
            Conversão total (chegou → fechou): <span className="font-semibold text-foreground">{coorte.taxaFechouTotal}%</span>
          </div>
        </>
      ) : (
        <div className="flex items-start justify-between gap-1">
          <Etapa icon={UserPlus} label="Leads novos" valor={atividade.leadsNovos}
            cor="bg-blue-500/15 text-blue-600" />
          <Seta />
          <Etapa icon={FileText} label="Propostas feitas" valor={atividade.propostasFeitas}
            cor="bg-amber-500/15 text-amber-600" />
          <Seta />
          <Etapa icon={HandCoins} label="Contratos fechados" valor={atividade.contratosFechados}
            cor="bg-green-500/15 text-green-600" />
        </div>
      )}

      {modo === "coorte" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Considera o tempo entre o lead chegar e fechar — um lead deste período pode ter fechado, ou ainda fechar, meses depois.
        </p>
      )}
    </Card>
  );
}
