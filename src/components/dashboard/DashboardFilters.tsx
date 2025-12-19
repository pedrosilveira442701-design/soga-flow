import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export type FilterPeriod = "week" | "month" | "year" | "custom";

interface DashboardFiltersProps {
  period: FilterPeriod;
  onPeriodChange: (period: FilterPeriod) => void;
  customDateRange?: { from: Date; to: Date };
  onCustomDateRangeChange?: (range: { from: Date; to: Date }) => void;
}

export function DashboardFilters({
  period,
  onPeriodChange,
  customDateRange,
  onCustomDateRangeChange,
}: DashboardFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(
    customDateRange ? { from: customDateRange.from, to: customDateRange.to } : undefined
  );

  const handleRangeSelect = (range: DateRange | undefined) => {
    setTempRange(range);
    
    // Quando ambas as datas são selecionadas, aplica o filtro e fecha o popover
    if (range?.from && range?.to && onCustomDateRangeChange) {
      onCustomDateRangeChange({ from: range.from, to: range.to });
      setIsOpen(false);
    }
  };

  const handlePeriodChange = (newPeriod: FilterPeriod) => {
    onPeriodChange(newPeriod);
    if (newPeriod === "custom") {
      // Reset temp range quando abre o seletor
      setTempRange(customDateRange ? { from: customDateRange.from, to: customDateRange.to } : undefined);
    }
  };

  const displayRange = customDateRange || tempRange;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-2">
        <Button
          variant={period === "week" ? "default" : "outline"}
          onClick={() => handlePeriodChange("week")}
          size="sm"
        >
          Semana
        </Button>
        <Button
          variant={period === "month" ? "default" : "outline"}
          onClick={() => handlePeriodChange("month")}
          size="sm"
        >
          Mês
        </Button>
        <Button
          variant={period === "year" ? "default" : "outline"}
          onClick={() => handlePeriodChange("year")}
          size="sm"
        >
          Ano
        </Button>
        <Button
          variant={period === "custom" ? "default" : "outline"}
          onClick={() => handlePeriodChange("custom")}
          size="sm"
        >
          Período
        </Button>
      </div>

      {period === "custom" && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal min-w-[280px]",
                !displayRange?.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {displayRange?.from ? (
                displayRange.to ? (
                  <>
                    {format(displayRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                    {format(displayRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </>
                ) : (
                  <>
                    {format(displayRange.from, "dd/MM/yyyy", { locale: ptBR })} - Selecione fim
                  </>
                )
              ) : (
                "Selecione o período"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 border-b bg-muted/50">
              <p className="text-sm text-muted-foreground">
                {!tempRange?.from 
                  ? "Clique para selecionar a data inicial" 
                  : !tempRange?.to 
                    ? "Agora selecione a data final"
                    : "Período selecionado"}
              </p>
            </div>
            <Calendar
              mode="range"
              selected={tempRange}
              onSelect={handleRangeSelect}
              locale={ptBR}
              numberOfMonths={2}
              className="p-3 pointer-events-auto"
              defaultMonth={tempRange?.from || new Date()}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
