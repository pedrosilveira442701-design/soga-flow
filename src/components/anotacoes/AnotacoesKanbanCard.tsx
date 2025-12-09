import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, Tag, User, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Anotacao } from "@/hooks/useAnotacoes";
import { cn } from "@/lib/utils";

interface AnotacoesKanbanCardProps {
  anotacao: Anotacao;
  onEdit: (id: string) => void;
}

const priorityColors: Record<string, string> = {
  alta: "bg-destructive/10 text-destructive border-destructive/20",
  media: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
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

export function AnotacoesKanbanCard({ anotacao, onEdit }: AnotacoesKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: anotacao.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: isDragging ? "transform" : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 cursor-pointer transition-all duration-150",
        isDragging ? "opacity-50 shadow-lg scale-105 z-50 rotate-1" : "hover:shadow-md",
        isOver && "ring-2 ring-primary ring-offset-2",
      )}
      onClick={() => !isDragging && onEdit(anotacao.id)}
    >
      <div className="flex gap-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <h4 className="font-medium text-sm line-clamp-2">{anotacao.title}</h4>

          {/* Priority Badge */}
          <Badge className={priorityColors[anotacao.priority]} variant="outline">
            {anotacao.priority === "alta" ? "Alta" : anotacao.priority === "media" ? "Média" : "Baixa"}
          </Badge>

          {/* Type */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Tag className="h-4 w-4" />
            {typeLabels[anotacao.type]}
          </div>

          {/* Client */}
          {(anotacao.client_name || (anotacao as any).clientes?.nome) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="truncate">{anotacao.client_name || (anotacao as any).clientes?.nome}</span>
            </div>
          )}

          {/* Reminder */}
          {anotacao.reminder_datetime && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Clock className="h-4 w-4" />
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
                <span className="text-xs text-muted-foreground">+{anotacao.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
