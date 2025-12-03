import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { useAnotacoes, type Anotacao, type AnotacaoStatus } from "@/hooks/useAnotacoes";
import { AnotacoesKanbanColumn } from "./AnotacoesKanbanColumn";
import { AnotacoesKanbanCard } from "./AnotacoesKanbanCard";
import { toast } from "sonner";

interface AnotacoesKanbanViewProps {
  anotacoes: Anotacao[];
  isLoading: boolean;
  onEdit: (id: string) => void;
}

const columns: { status: AnotacaoStatus; label: string; color: string }[] = [
  { status: "aberta", label: "Abertas", color: "bg-blue-500/10" },
  { status: "em_andamento", label: "Em Andamento", color: "bg-yellow-500/10" },
  { status: "concluida", label: "Concluídas", color: "bg-green-500/10" },
  { status: "arquivada", label: "Arquivadas", color: "bg-muted/50" },
];

const statusLabels: Record<AnotacaoStatus, string> = {
  aberta: "Abertas",
  em_andamento: "Em Andamento",
  concluida: "Concluídas",
  arquivada: "Arquivadas",
};

export function AnotacoesKanbanView({ anotacoes, isLoading, onEdit }: AnotacoesKanbanViewProps) {
  const { updateAnotacao, reorderAnotacao } = useAnotacoes();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const lastOverId = useRef<string | null>(null);

  // Optimistic local state for smooth DnD
  const [localAnotacoes, setLocalAnotacoes] = useState<Anotacao[]>(anotacoes);

  // Sync with server data
  useEffect(() => {
    setLocalAnotacoes(anotacoes);
  }, [anotacoes]);

  const groupedAnotacoes = useMemo(() => {
    const groups: Record<AnotacaoStatus, Anotacao[]> = {
      aberta: [],
      em_andamento: [],
      concluida: [],
      arquivada: [],
    };

    localAnotacoes.forEach((anotacao) => {
      groups[anotacao.status].push(anotacao);
    });

    // Sort by order_index within each column
    Object.keys(groups).forEach((status) => {
      groups[status as AnotacaoStatus].sort((a, b) => 
        ((a as any).order_index || 0) - ((b as any).order_index || 0)
      );
    });

    return groups;
  }, [localAnotacoes]);

  const activeAnotacao = useMemo(() => 
    activeId ? localAnotacoes.find((a) => a.id === activeId) : null,
    [activeId, localAnotacoes]
  );

  // Sensors with touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findColumnByItemId = useCallback((itemId: string): AnotacaoStatus | null => {
    for (const [status, items] of Object.entries(groupedAnotacoes)) {
      if (items.some((a) => a.id === itemId)) {
        return status as AnotacaoStatus;
      }
    }
    return null;
  }, [groupedAnotacoes]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    document.body.style.cursor = "grabbing";
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setOverId(null);
      return;
    }

    const activeItemId = active.id as string;
    const overId = over.id as string;
    setOverId(overId);

    // Check if dropping on a column
    const isOverColumn = columns.some((col) => col.status === overId);
    const activeColumn = findColumnByItemId(activeItemId);

    if (isOverColumn && activeColumn !== overId) {
      // Moving to a different column
      const overColumn = overId as AnotacaoStatus;
      
      setLocalAnotacoes((prev) => {
        const activeItem = prev.find((a) => a.id === activeItemId);
        if (!activeItem) return prev;

        return prev.map((a) => 
          a.id === activeItemId 
            ? { ...a, status: overColumn }
            : a
        );
      });
    } else if (!isOverColumn) {
      // Hovering over another card
      const overColumn = findColumnByItemId(overId);
      
      if (activeColumn && overColumn && activeColumn !== overColumn) {
        // Moving to different column via card hover
        setLocalAnotacoes((prev) => {
          const activeItem = prev.find((a) => a.id === activeItemId);
          if (!activeItem) return prev;

          return prev.map((a) => 
            a.id === activeItemId 
              ? { ...a, status: overColumn }
              : a
          );
        });
      }
    }
  }, [findColumnByItemId]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverId(null);
    document.body.style.cursor = "";

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeItem = localAnotacoes.find((a) => a.id === activeId);
    if (!activeItem) return;

    // Check if dropping on a column directly
    const isOverColumn = columns.some((col) => col.status === overId);
    let targetColumn: AnotacaoStatus;
    let newOrderIndex: number;

    if (isOverColumn) {
      targetColumn = overId as AnotacaoStatus;
      const columnItems = groupedAnotacoes[targetColumn];
      newOrderIndex = columnItems.length > 0 
        ? ((columnItems[columnItems.length - 1] as any).order_index || 0) + 100 
        : 100;
    } else {
      // Dropping on a card
      targetColumn = findColumnByItemId(overId) || activeItem.status;
      const columnItems = groupedAnotacoes[targetColumn];
      const overIndex = columnItems.findIndex((a) => a.id === overId);
      const activeIndex = columnItems.findIndex((a) => a.id === activeId);

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        // Reordering within same column
        const newItems = arrayMove(columnItems, activeIndex, overIndex);
        
        // Calculate new order_index
        const targetIndex = newItems.findIndex((a) => a.id === activeId);
        const prevItem = newItems[targetIndex - 1];
        const nextItem = newItems[targetIndex + 1];

        if (!prevItem) {
          newOrderIndex = ((nextItem as any)?.order_index || 100) / 2;
        } else if (!nextItem) {
          newOrderIndex = ((prevItem as any)?.order_index || 0) + 100;
        } else {
          newOrderIndex = (
            ((prevItem as any)?.order_index || 0) + 
            ((nextItem as any)?.order_index || 0)
          ) / 2;
        }
      } else if (activeIndex === -1) {
        // Moving from different column
        const prevItem = columnItems[overIndex - 1];
        const nextItem = columnItems[overIndex];

        if (!prevItem && nextItem) {
          newOrderIndex = ((nextItem as any)?.order_index || 100) / 2;
        } else if (prevItem && !nextItem) {
          newOrderIndex = ((prevItem as any)?.order_index || 0) + 100;
        } else if (prevItem && nextItem) {
          newOrderIndex = (
            ((prevItem as any)?.order_index || 0) + 
            ((nextItem as any)?.order_index || 0)
          ) / 2;
        } else {
          newOrderIndex = 100;
        }
      } else {
        return; // No change
      }
    }

    // Optimistic update
    setLocalAnotacoes((prev) => 
      prev.map((a) => 
        a.id === activeId 
          ? { ...a, status: targetColumn, order_index: newOrderIndex } as Anotacao
          : a
      )
    );

    // Persist to database
    const updateData: any = {
      id: activeId,
      status: targetColumn,
      order_index: newOrderIndex,
    };

    if (targetColumn === "concluida" && activeItem.status !== "concluida") {
      updateData.completed_at = new Date().toISOString();
    }

    reorderAnotacao(updateData, {
      onError: () => {
        // Rollback on error
        setLocalAnotacoes(anotacoes);
        toast.error("Erro ao salvar posição");
      },
      onSuccess: () => {
        toast.success(`Movido para ${statusLabels[targetColumn]}`);
      },
    });
  }, [localAnotacoes, groupedAnotacoes, findColumnByItemId, reorderAnotacao, anotacoes]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    document.body.style.cursor = "";
    setLocalAnotacoes(anotacoes);
  }, [anotacoes]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => (
          <div key={col.status} className="space-y-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (anotacoes.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Nenhuma anotação encontrada"
        description="Crie sua primeira anotação para ver no Kanban"
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={{
        droppable: { strategy: MeasuringStrategy.Always },
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <AnotacoesKanbanColumn
            key={column.status}
            id={column.status}
            label={column.label}
            color={column.color}
            anotacoes={groupedAnotacoes[column.status]}
            onEdit={onEdit}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{
        duration: 200,
        easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
      }}>
        {activeAnotacao && (
          <div className="opacity-90 rotate-2 scale-105 shadow-xl">
            <AnotacoesKanbanCard
              anotacao={activeAnotacao}
              onEdit={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
