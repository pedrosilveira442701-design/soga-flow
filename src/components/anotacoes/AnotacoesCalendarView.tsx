import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { type Anotacao } from "@/hooks/useAnotacoes";
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface AnotacoesCalendarViewProps {
  anotacoes: Anotacao[];
  isLoading: boolean;
  onEdit: (id: string) => void;
}

const priorityColors: Record<string, string> = {
  alta: "bg-destructive/10 border-l-destructive",
  media: "bg-warning/10 border-l-warning",
  baixa: "bg-muted border-l-muted-foreground",
};

export function AnotacoesCalendarView({ anotacoes, isLoading, onEdit }: AnotacoesCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const anotacoesByDate = useMemo(() => {
    const map = new Map<string, Anotacao[]>();
    
    anotacoes.forEach((anotacao) => {
      if (anotacao.reminder_datetime) {
        const dateKey = format(new Date(anotacao.reminder_datetime), "yyyy-MM-dd");
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(anotacao);
      }
    });

    return map;
  }, [anotacoes]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  if (anotacoes.filter(a => a.reminder_datetime).length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Nenhuma anotação com lembrete"
        description="Adicione lembretes às suas anotações para visualizá-las no calendário"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayAnotacoes = anotacoesByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={day.toISOString()}
              className={`min-h-[120px] p-2 ${
                !isCurrentMonth ? "opacity-40" : ""
              } ${isToday ? "ring-2 ring-primary" : ""}`}
            >
              <div className="space-y-1">
                {/* Day Number */}
                <div className="text-sm font-medium text-right">
                  {format(day, "d")}
                </div>

                {/* Anotacoes */}
                <div className="space-y-1">
                  {dayAnotacoes.slice(0, 3).map((anotacao) => (
                    <button
                      key={anotacao.id}
                      onClick={() => onEdit(anotacao.id)}
                      className={`w-full text-left text-xs p-1 rounded border-l-2 ${
                        priorityColors[anotacao.priority]
                      } hover:shadow-sm transition-shadow`}
                    >
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {format(new Date(anotacao.reminder_datetime!), "HH:mm")} {anotacao.title}
                        </span>
                      </div>
                    </button>
                  ))}
                  {dayAnotacoes.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayAnotacoes.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
