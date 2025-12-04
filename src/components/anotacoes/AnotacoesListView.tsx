import { Clock, Tag, User, CheckCircle2, Trash2, Edit, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { useAnotacoes, type Anotacao } from "@/hooks/useAnotacoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AnotacoesListViewProps {
  anotacoes: Anotacao[];
  isLoading: boolean;
  onEdit: (id: string) => void;
}

const statusLabels: Record<string, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  arquivada: "Arquivada",
};

const priorityColors: Record<string, string> = {
  alta: "bg-destructive text-destructive-foreground",
  media: "bg-warning text-warning-foreground",
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

export function AnotacoesListView({ anotacoes, isLoading, onEdit }: AnotacoesListViewProps) {
  const { completeAnotacao, deleteAnotacao } = useAnotacoes();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-4">
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (anotacoes.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Nenhuma anotação encontrada"
        description="Crie sua primeira anotação usando o campo acima ou clique em 'Nova Anotação'"
      />
    );
  }

  return (
    <div className="space-y-3">
      {anotacoes.map((anotacao) => (
        <Card key={anotacao.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              {/* Title and Status */}
              <div className="flex items-start gap-3">
                <h3 className="font-semibold text-base flex-1">{anotacao.title}</h3>
                <Badge variant="outline">{statusLabels[anotacao.status]}</Badge>
              </div>

              {/* Note Preview */}
              {anotacao.note && <p className="text-sm text-muted-foreground line-clamp-2">{anotacao.note}</p>}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {/* Priority */}
                <Badge className={priorityColors[anotacao.priority]}>
                  {anotacao.priority === "alta" ? "Alta" : anotacao.priority === "media" ? "Média" : "Baixa"}
                </Badge>

                {/* Type */}
                <span className="flex items-center gap-1">
                  <Tag className="h-5 w-5" />
                  {typeLabels[anotacao.type]}
                </span>

                {/* Client */}
                {(anotacao.client_name || (anotacao as any).clientes?.nome) && (
                  <span className="flex items-center gap-1">
                    <User className="h-5 w-5" />
                    {anotacao.client_name || (anotacao as any).clientes?.nome}
                  </span>
                )}

                {/* Reminder */}
                {anotacao.reminder_datetime && (
                  <span className="flex items-center gap-1 text-primary">
                    <Clock3 className="h-5 w-5" />
                    {format(new Date(anotacao.reminder_datetime), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                )}

                {/* Tags */}
                {anotacao.tags && anotacao.tags.length > 0 && (
                  <div className="flex gap-1">
                    {anotacao.tags.map((tag) => (
                      <span key={tag} className="text-primary">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {anotacao.status !== "concluida" && (
                <Button variant="ghost" size="icon" onClick={() => completeAnotacao(anotacao.id)} title="Concluir">
                  <CheckCircle2 className="h-5 w-5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => onEdit(anotacao.id)} title="Editar">
                <Edit className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm("Deseja realmente excluir esta anotação?")) {
                    deleteAnotacao(anotacao.id);
                  }
                }}
                title="Excluir"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
