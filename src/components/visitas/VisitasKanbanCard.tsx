import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Visita } from "@/hooks/useVisitas";
import { VisitaCard } from "./VisitaCard";
import { GripVertical } from "lucide-react";

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
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative group">
      {/* Drag handle - only this area triggers drag */}
      <div
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

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
