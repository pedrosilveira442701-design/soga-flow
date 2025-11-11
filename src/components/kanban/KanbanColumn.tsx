import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
  color?: string;
  additionalContent?: React.ReactNode;
}

export function KanbanColumn({
  id,
  title,
  count,
  children,
  color = "default",
  additionalContent,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const colorClasses = {
    default: "bg-brand-surface border-border",
    novo: "bg-blue-500/5 border-blue-500/20",
    contato: "bg-purple-500/5 border-purple-500/20",
    qualificado: "bg-amber-500/5 border-amber-500/20",
    proposta: "bg-orange-500/5 border-orange-500/20",
    ganho: "bg-green-500/5 border-green-500/20",
  };

  return (
    <div className="flex flex-col h-full min-w-[320px]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-body font-medium text-foreground">{title}</h3>
        <Badge variant="secondary" className="text-caption">
          {count}
        </Badge>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-xl border-2 border-dashed p-3 transition-all",
          isOver ? "border-primary bg-primary/5 shadow-elev2" : colorClasses[color as keyof typeof colorClasses] || colorClasses.default
        )}
      >
        <div className="space-y-3">
          {additionalContent && (
            <>
              {additionalContent}
              {children && <div className="border-t border-border/50 pt-3 mt-3" />}
            </>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
