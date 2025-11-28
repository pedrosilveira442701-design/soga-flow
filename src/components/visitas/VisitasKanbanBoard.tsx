import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from "@dnd-kit/core";
import { useState } from "react";
import { VisitasKanbanColumn } from "./VisitasKanbanColumn";
import { VisitaCard } from "./VisitaCard";
import { Visita, VisitaStatus } from "@/hooks/useVisitas";

// Colunas que aparecem no Kanban (concluídas ficam fora do quadro)
type KanbanColumnId = "agendar" | "marcada" | "atrasada";

interface VisitasKanbanBoardProps {
  visitas: Visita[];
  onStatusChange: (visitaId: string, newStatus: VisitaStatus) => void;
  onEdit: (visita: Visita) => void;
  onToggleRealizada: (id: string, realizada: boolean) => void;
  onDelete: (id: string) => void;
  onViewDetails: (visita: Visita) => void;
}

const COLUMNS: { id: KanbanColumnId; title: string; color: string }[] = [
  { id: "agendar", title: "Agendar", color: "gray" },
  { id: "marcada", title: "Marcadas", color: "blue" },
  { id: "atrasada", title: "Atrasadas", color: "red" },
];

export function VisitasKanbanBoard({
  visitas,
  onStatusChange,
  onEdit,
  onToggleRealizada,
  onDelete,
  onViewDetails,
}: VisitasKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const visitasByStatus: Record<KanbanColumnId, Visita[]> = {
    agendar: visitas.filter((v) => v.status === "agendar"),
    marcada: visitas.filter((v) => v.status === "marcada"),
    atrasada: visitas.filter((v) => v.status === "atrasada"),
  };

  const activeVisita = activeId ? visitas.find((v) => v.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    document.body.style.cursor = "grabbing";
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    document.body.style.cursor = "";

    if (!over) return;

    const visitaId = active.id as string;

    // Descobrir em QUAL COLUNA o card foi solto
    let targetColumnId: KanbanColumnId | null = null;

    for (const column of COLUMNS) {
      const colId = column.id;

      // 1) Soltou na área vazia da coluna (over.id === 'agendar' | 'marcada' | 'atrasada')
      if (over.id === colId) {
        targetColumnId = colId;
        break;
      }

      // 2) Soltou em cima de outro card dessa coluna (over.id === id de outra visita)
      const isOverCardInColumn = visitasByStatus[colId].some((v) => v.id === over.id);
      if (isOverCardInColumn) {
        targetColumnId = colId;
        break;
      }
    }

    if (!targetColumnId) return;

    const visitaAtual = visitas.find((v) => v.id === visitaId);
    if (!visitaAtual) return;

    // Se a coluna não mudou, não faz nada
    if (visitaAtual.status === targetColumnId) return;

    // Aqui você pode manter a lógica simples:
    onStatusChange(visitaId, targetColumnId);
  };

  return (
    <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((column) => (
          <VisitasKanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            count={visitasByStatus[column.id].length}
            visitas={visitasByStatus[column.id]}
            onEdit={onEdit}
            onToggleRealizada={onToggleRealizada}
            onDelete={onDelete}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      <DragOverlay>
        {activeVisita && (
          <div className="opacity-80 rotate-3 scale-105">
            <VisitaCard
              visita={activeVisita}
              onEdit={onEdit}
              onToggleRealizada={onToggleRealizada}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
