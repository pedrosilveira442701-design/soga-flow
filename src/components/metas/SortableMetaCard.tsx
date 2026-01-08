import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MetaCard } from "./MetaCard";
import { MetaComInsights } from "@/hooks/useMetas";
import { GripVertical } from "lucide-react";

interface SortableMetaCardProps {
  meta: MetaComInsights;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
  onRecalcular: () => void;
}

export function SortableMetaCard({
  meta,
  onEdit,
  onDelete,
  onViewDetails,
  onRecalcular,
}: SortableMetaCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: meta.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 left-3 z-10 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/80 transition-colors"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="pl-6">
        <MetaCard
          meta={meta}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDetails={onViewDetails}
          onRecalcular={onRecalcular}
        />
      </div>
    </div>
  );
}
