import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Visita, VisitaStatus } from "@/hooks/useVisitas";
import { VisitasKanbanCard } from "./VisitasKanbanCard";

type ColumnColor = "gray" | "blue" | "red";

interface VisitasKanbanColumnProps {
  id: VisitaStatus;
  title: string;
  color: ColumnColor;
  count: number;
  visitas: Visita[];
  onEdit: (visita: Visita) => void;
  onToggleRealizada: (id: string, realizada: boolean) => void;
  onDelete: (id: string) => void;
  onViewDetails: (visita: Visita) => void;
}

const colorClasses: Record<ColumnColor, string> = {
  gray: "border-gray-200 bg-muted/40",
  blue: "border-blue-200 bg-blue-50/60",
  red: "border-red-200 bg-red-50/60",
};

const badgeColorClasses: Record<ColumnColor, string> = {
  gray: "bg-gray-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
};

const VisitasKanbanColumn = ({
  id,
  title,
  color,
  count,
  visitas,
  onEdit,
  onToggleRealizada,
  onDelete,
  onViewDetails,
}: VisitasKanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card className="flex flex-col h-full min-h-[480px] border-0 bg-transparent shadow-none">
      {/* Cabeçalho da coluna */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm tracking-tight">{title}</h3>
          <Badge
            variant="secondary"
            className={`${badgeColorClasses[color]} text-white text-xs px-2 py-0.5 rounded-full`}
          >
            {count}
          </Badge>
        </div>
      </div>

      {/* Área drop / cards */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 px-2 pb-3 space-y-3 overflow-y-auto rounded-2xl border
          transition-all duration-200 ease-out
          ${colorClasses[color]}
          ${isOver ? "ring-2 ring-primary/40 bg-primary/5 scale-[1.01]" : ""}
        `}
      >
        <SortableContext items={visitas.map((v) => v.id)} strategy={verticalListSortingStrategy}>
          {visitas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-xs">
              <Calendar className="h-6 w-6 mb-2 opacity-30" />
              <p>Nenhuma visita</p>
            </div>
          ) : (
            visitas.map((visita) => (
              <VisitasKanbanCard
                key={visita.id}
                visita={visita}
                onEdit={onEdit}
                onToggleRealizada={onToggleRealizada}
                onDelete={onDelete}
                onViewDetails={onViewDetails}
              />
            ))
          )}
        </SortableContext>
      </div>
    </Card>
  );
};

export default VisitasKanbanColumn;
