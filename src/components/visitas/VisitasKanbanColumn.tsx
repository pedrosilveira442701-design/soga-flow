import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Visita, VisitaStatus } from '@/hooks/useVisitas';
import { VisitasKanbanCard } from './VisitasKanbanCard';
import { Calendar } from 'lucide-react';

interface VisitasKanbanColumnProps {
  id: VisitaStatus;
  title: string;
  color: string;
  count: number;
  visitas: Visita[];
  onEdit: (visita: Visita) => void;
  onToggleRealizada: (id: string, realizada: boolean) => void;
  onDelete: (id: string) => void;
  onViewDetails: (visita: Visita) => void;
}

const colorClasses = {
  gray: 'border-gray-300 bg-gray-50/50',
  blue: 'border-blue-300 bg-blue-50/50',
  red: 'border-red-300 bg-red-50/50',
};

const badgeColorClasses = {
  gray: 'bg-gray-500',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
};

export function VisitasKanbanColumn({
  id,
  title,
  color,
  count,
  visitas,
  onEdit,
  onToggleRealizada,
  onDelete,
  onViewDetails,
}: VisitasKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card className="flex flex-col h-full min-h-[600px]">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <Badge 
            variant="secondary" 
            className={`${badgeColorClasses[color as keyof typeof badgeColorClasses]} text-white`}
          >
            {count}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 p-4 space-y-3 overflow-y-auto transition-all duration-300
          ${isOver ? 'bg-primary/10 ring-2 ring-primary/30 scale-[1.01]' : colorClasses[color as keyof typeof colorClasses]}
        `}
      >
        <SortableContext items={visitas.map((v) => v.id)} strategy={verticalListSortingStrategy}>
          {visitas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground">
              <Calendar className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">Nenhuma visita</p>
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
}
