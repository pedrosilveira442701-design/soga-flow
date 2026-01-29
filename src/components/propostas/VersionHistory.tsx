import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  ChevronRight,
  GitBranch,
  Calendar,
  DollarSign,
  Percent,
} from "lucide-react";
import { Proposta } from "@/hooks/usePropostas";
import { PROPOSAL_CHANGE_REASONS } from "@/lib/proposalVersioning";

interface VersionHistoryProps {
  currentProposta: Proposta;
  fetchVersionHistory: (groupId: string) => Promise<Proposta[]>;
  onSelectVersion: (proposta: Proposta) => void;
}

export default function VersionHistory({
  currentProposta,
  fetchVersionHistory,
  onSelectVersion,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Proposta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const loadVersions = async () => {
      if (!currentProposta.proposal_group_id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const history = await fetchVersionHistory(currentProposta.proposal_group_id);
        setVersions(history);
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVersions();
  }, [currentProposta.proposal_group_id, fetchVersionHistory]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string, isCurrent: boolean) => {
    if (isCurrent) {
      return <Badge variant="default">Atual</Badge>;
    }

    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      substituida: { label: "Substituída", variant: "secondary" },
      aberta: { label: "Aberta", variant: "default" },
      fechada: { label: "Fechada", variant: "secondary" },
      perdida: { label: "Perdida", variant: "destructive" },
      repouso: { label: "Repouso", variant: "outline" },
    };

    const config = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Se só tem uma versão (V1), não mostrar histórico
  if (versions.length <= 1 && !isLoading) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <span className="font-semibold">Histórico de Versões</span>
          <Badge variant="outline" className="ml-2">
            {versions.length} versão(ões)
          </Badge>
        </div>
        <ChevronRight
          className={`h-5 w-5 text-muted-foreground transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="border-t">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="p-4 space-y-2">
                {versions.map((version) => {
                  const isCurrent = version.id === currentProposta.id;
                  const changeReason = version.changed_reason
                    ? PROPOSAL_CHANGE_REASONS[version.changed_reason as keyof typeof PROPOSAL_CHANGE_REASONS]
                    : null;

                  return (
                    <button
                      key={version.id}
                      onClick={() => !isCurrent && onSelectVersion(version)}
                      disabled={isCurrent}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isCurrent
                          ? "bg-primary/5 border-primary/20 cursor-default"
                          : "bg-background hover:bg-muted/50 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-primary" />
                          <span className="font-semibold">V{version.version_number}</span>
                          {getStatusBadge(version.status, isCurrent)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(version.data), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span>{formatCurrency(version.valor_total || 0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Percent className="h-3 w-3 text-muted-foreground" />
                          <span>{(version.margem_pct || 0).toFixed(1)}%</span>
                        </div>
                      </div>

                      {changeReason && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span className="font-medium">Motivo:</span> {changeReason}
                          {version.changed_reason_detail && (
                            <span className="ml-1">— {version.changed_reason_detail}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
