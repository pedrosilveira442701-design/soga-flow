import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Visita } from "@/hooks/useVisitas";
import { VisitaCard } from "./VisitaCard";

export interface VisitasKanbanCardProps {
  visita: Visita;
  onEdit: (visita: Visita) => void;
  onToggleRealizada: (id: string, realizada: boolean) => void;
  onDelete: (id: string) => void;
  onViewDetails: (visita: Visita) => void;
}

export function VisitasKanbanCard({
  visita,
  onEdit,
  onToggleRealizada,
  onDelete,
  onViewDetails,
}: VisitasKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: visita.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: isDragging ? ("grabbing" as const) : ("grab" as const),
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <VisitaCard
        visita={visita}
        onEdit={onEdit}
        onToggleRealizada={onToggleRealizada}
        onDelete={onDelete}
        onViewDetails={onViewDetails}
      />
    </div>
  );
}

// Deixa também como default, para evitar qualquer problema de import
export default VisitasKanbanCard;
