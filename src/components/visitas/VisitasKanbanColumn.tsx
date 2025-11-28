import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Visita } from "@/hooks/useVisitas";
import { VisitaCard } from "./VisitaCard";

interface VisitasKanbanCardProps {
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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
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

// opcional: deixa disponível também como default, caso algum lugar use import default
export default VisitasKanbanCard;
