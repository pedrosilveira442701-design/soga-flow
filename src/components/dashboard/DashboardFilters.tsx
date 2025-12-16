import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-2">
        <Button
          variant={period === "week" ? "default" : "outline"}
          onClick={() => onPeriodChange("week")}
          size="sm"
        >
          Semana
        </Button>
        <Button
          variant={period === "month" ? "default" : "outline"}
          onClick={() => onPeriodChange("month")}
          size="sm"
        >
          Mês
        </Button>
        <Button
          variant={period === "year" ? "default" : "outline"}
          onClick={() => onPeriodChange("year")}
          size="sm"
        >
          Ano
        </Button>
        <Button
          variant={period === "custom" ? "default" : "outline"}
          onClick={() => onPeriodChange("custom")}
          size="sm"
        >
          Período
        </Button>
      </div>

      {period === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !customDateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-5 w-5" />
              {customDateRange?.from ? (
                customDateRange.to ? (
                  <>
                    {format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                    {format(customDateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </>
                ) : (
                  format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })
                )
              ) : (
                "Selecione o período"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={customDateRange}
              onSelect={(range) => {
                if (range?.from && range?.to && onCustomDateRangeChange) {
                  onCustomDateRangeChange({ from: range.from, to: range.to });
                }
              }}
              locale={ptBR}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
