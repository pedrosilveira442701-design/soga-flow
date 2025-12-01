import { useMemo } from "react";
import { Clock, Tag, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { useAnotacoes, type Anotacao, type AnotacaoStatus } from "@/hooks/useAnotacoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AnotacoesKanbanViewProps {
  anotacoes: Anotacao[];
  isLoading: boolean;
  onEdit: (id: string) => void;
}

const columns: { status: AnotacaoStatus; label: string; color: string }[] = [
  { status: "aberta", label: "Abertas", color: "bg-blue-500/10 border-blue-500/20" },
  { status: "em_andamento", label: "Em Andamento", color: "bg-yellow-500/10 border-yellow-500/20" },
  { status: "concluida", label: "Concluídas", color: "bg-green-500/10 border-green-500/20" },
  { status: "arquivada", label: "Arquivadas", color: "bg-muted border-border" },
];

const priorityColors: Record<string, string> = {
  alta: "bg-destructive/10 text-destructive border-destructive/20",
  media: "bg-warning/10 text-warning border-warning/20",
  baixa: "bg-muted text-muted-foreground",
};

const typeLabels: Record<string, string> = {
  ligacao: "Ligação",
  orcamento: "Orçamento",
  follow_up: "Follow-up",
  visita: "Visita",
  reuniao: "Reunião",
  outro: "Outro",
};

export function AnotacoesKanbanView({ anotacoes, isLoading, onEdit }: AnotacoesKanbanViewProps) {
  const { updateAnotacao } = useAnotacoes();

  const groupedAnotacoes = useMemo(() => {
    const groups: Record<AnotacaoStatus, Anotacao[]> = {
      aberta: [],
      em_andamento: [],
      concluida: [],
      arquivada: [],
    };

    anotacoes.forEach((anotacao) => {
      groups[anotacao.status].push(anotacao);
    });

    return groups;
  }, [anotacoes]);

  const handleStatusChange = (anotacaoId: string, newStatus: AnotacaoStatus) => {
    updateAnotacao({
      id: anotacaoId,
      status: newStatus,
      ...(newStatus === "concluida" ? { completed_at: new Date().toISOString() } : {}),
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => (
          <div key={col.status} className="space-y-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (anotacoes.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Nenhuma anotação encontrada"
        description="Crie sua primeira anotação para ver no Kanban"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => (
        <div key={column.status} className="space-y-3">
          {/* Column Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{column.label}</h3>
            <Badge variant="secondary">{groupedAnotacoes[column.status].length}</Badge>
          </div>

          {/* Cards */}
          <div className="space-y-2">
            {groupedAnotacoes[column.status].length === 0 ? (
              <Card className={`p-4 ${column.color}`}>
                <p className="text-sm text-muted-foreground text-center">
                  Nenhuma anotação
                </p>
              </Card>
            ) : (
              groupedAnotacoes[column.status].map((anotacao) => (
                <Card
                  key={anotacao.id}
                  className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onEdit(anotacao.id)}
                >
                  <div className="space-y-2">
                    {/* Title */}
                    <h4 className="font-medium text-sm line-clamp-2">
                      {anotacao.title}
                    </h4>

                    {/* Priority Badge */}
                    <Badge className={priorityColors[anotacao.priority]} variant="outline">
                      {anotacao.priority === "alta" ? "Alta" : anotacao.priority === "media" ? "Média" : "Baixa"}
                    </Badge>

                    {/* Type */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Tag className="h-3 w-3" />
                      {typeLabels[anotacao.type]}
                    </div>

                    {/* Client */}
                    {(anotacao.client_name || (anotacao as any).clientes?.nome) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {anotacao.client_name || (anotacao as any).clientes?.nome}
                      </div>
                    )}

                    {/* Reminder */}
                    {anotacao.reminder_datetime && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <Clock className="h-3 w-3" />
                        {format(new Date(anotacao.reminder_datetime), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                    )}

                    {/* Tags */}
                    {anotacao.tags && anotacao.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {anotacao.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs text-primary">
                            #{tag}
                          </span>
                        ))}
                        {anotacao.tags.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{anotacao.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
