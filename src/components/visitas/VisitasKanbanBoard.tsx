// src/components/visitas/VisitasKanbanBoard.tsx
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from "@dnd-kit/core";
import { useState } from "react";
import VisitasKanbanColumn from "./VisitasKanbanColumn"; // <-- IMPORT DEFAULT
import { VisitaCard } from "./VisitaCard";
import type { Visita, VisitaStatus } from "@/hooks/useVisitas";

interface VisitasKanbanBoardProps {
  visitas: Visita[];
  onStatusChange: (visitaId: string, newStatus: VisitaStatus) => void;
  onEdit: (visita: Visita) => void;
  onToggleRealizada: (id: string, realizada: boolean) => void;
  onDelete: (id: string) => void;
  onViewDetails: (visita: Visita) => void;
}

const COLUMNS: { id: VisitaStatus; title: string; color: "gray" | "blue" | "red" }[] = [
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

  const visitasByStatus: Record<VisitaStatus, Visita[]> = {
    agendar: visitas.filter((v) => v.status === "agendar"),
    marcada: visitas.filter((v) => v.status === "marcada"),
    atrasada: visitas.filter((v) => v.status === "atrasada"),
    concluida: visitas.filter((v) => v.status === "concluida"),
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
    const targetColumnId = over.id as VisitaStatus;

    // Só dispara mudança se soltou em cima de uma coluna válida
    if (COLUMNS.some((col) => col.id === targetColumnId)) {
      onStatusChange(visitaId, targetColumnId);
    }
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
