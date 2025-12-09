import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import React from "react";

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
  color?: string;
  additionalContent?: React.ReactNode;
  viewMode?: "compact" | "normal" | "detailed";
  columnRef?: (el: HTMLDivElement | null) => void;
  itemIds?: string[];
  isOver?: boolean;
}

export function KanbanColumn({
  id,
  title,
  count,
  children,
  color = "default",
  additionalContent,
  viewMode = "normal",
  columnRef,
  itemIds = [],
  isOver: externalIsOver,
}: KanbanColumnProps) {
  const { setNodeRef, isOver: dropIsOver } = useDroppable({
    id,
  });

  const isOver = externalIsOver ?? dropIsOver;

  const colorClasses = {
    default: "bg-brand-surface border-border",
    contato: "bg-purple-500/5 border-purple-500/20",
    qualificado: "bg-amber-500/5 border-amber-500/20",
    proposta: "bg-orange-500/5 border-orange-500/20",
    ganho: "bg-green-500/5 border-green-500/20",
    perdido: "bg-red-500/5 border-red-500/20",
    repouso: "bg-gray-500/5 border-gray-500/20",
  };

  const columnWidth =
    viewMode === "compact" ? "min-w-[240px]" : viewMode === "detailed" ? "min-w-[400px]" : "min-w-[320px]";
  const spacing = viewMode === "compact" ? "space-y-2" : "space-y-3";
  const padding = viewMode === "compact" ? "p-2" : "p-3";

  const mergeRefs = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    if (columnRef) {
      columnRef(el);
    }
  };

  // Extract item IDs from children if not provided
  const sortableItems = itemIds.length > 0 
    ? itemIds 
    : React.Children.toArray(children)
        .filter((child): child is React.ReactElement => React.isValidElement(child))
        .map((child) => child.key as string)
        .filter(Boolean);

  return (
    <div ref={columnRef} className={`flex flex-col h-full ${columnWidth} scroll-mt-4`}>
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-body font-medium text-foreground">{title}</h3>
        <Badge variant="secondary" className="text-caption">
          {count}
        </Badge>
      </div>

      {/* Column Content */}
      <div
        ref={mergeRefs}
        className={cn(
          `flex-1 rounded-xl border-2 border-dashed ${padding} transition-all duration-200 min-h-[200px]`,
          isOver
            ? "border-primary bg-primary/10 ring-2 ring-primary/30 scale-[1.01] shadow-elev2"
            : colorClasses[color as keyof typeof colorClasses] || colorClasses.default,
        )}
      >
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          <div className={cn(spacing, "min-h-[60px]")}>
            {additionalContent && (
              <>
                {additionalContent}
                {children && <div className="border-t border-border/50 pt-3 mt-3" />}
              </>
            )}
            {children}
            
            {/* Drop placeholder when column is empty or being hovered */}
            {count === 0 && !additionalContent && (
              <div 
                className={cn(
                  "flex items-center justify-center h-24 rounded-lg border-2 border-dashed transition-colors",
                  isOver 
                    ? "border-primary/50 bg-primary/5" 
                    : "border-transparent"
                )}
              >
                <span className="text-xs text-muted-foreground">
                  {isOver ? "Solte aqui" : "Arraste cards para esta coluna"}
                </span>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}