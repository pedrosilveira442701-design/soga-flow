import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Anotacao, AnotacaoStatus } from "@/hooks/useAnotacoes";
import { AnotacoesKanbanCard } from "./AnotacoesKanbanCard";

interface AnotacoesKanbanColumnProps {
  id: AnotacaoStatus;
  label: string;
  color: string;
  anotacoes: Anotacao[];
  onEdit: (id: string) => void;
}

export function AnotacoesKanbanColumn({
  id,
  label,
  color,
  anotacoes,
  onEdit,
}: AnotacoesKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const itemIds = anotacoes.map((a) => a.id);

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-semibold text-sm">{label}</h3>
        <Badge variant="secondary" className="min-w-[24px] justify-center">
          {anotacoes.length}
        </Badge>
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[200px] rounded-lg border-2 border-dashed transition-all duration-200 overflow-y-auto",
          color,
          isOver 
            ? "border-primary bg-primary/5 scale-[1.01]" 
            : "border-transparent"
        )}
        style={{ maxHeight: "calc(100vh - 350px)" }}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="p-2 space-y-2">
            {anotacoes.length === 0 ? (
              <div className={cn(
                "p-4 rounded-md text-center text-sm text-muted-foreground transition-colors",
                isOver ? "bg-primary/10" : "bg-muted/30"
              )}>
                {isOver ? "Solte aqui" : "Nenhuma anotação"}
              </div>
            ) : (
              anotacoes.map((anotacao) => (
                <AnotacoesKanbanCard
                  key={anotacao.id}
                  anotacao={anotacao}
                  onEdit={onEdit}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
