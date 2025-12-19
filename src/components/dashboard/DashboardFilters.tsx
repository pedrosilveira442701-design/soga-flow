import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterPeriod = "week" | "month" | "year" | "custom";

interface DashboardFiltersProps {
  period: FilterPeriod;
  onPeriodChange: (period: FilterPeriod) => void;
  customDateRange?: { from: Date; to: Date };
  onCustomDateRangeChange?: (range: { from: Date; to: Date }) => void;
}

const presets = [
  { label: "Últimos 7 dias", getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Últimos 30 dias", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Esta semana", getValue: () => ({ from: startOfWeek(new Date(), { locale: ptBR }), to: endOfWeek(new Date(), { locale: ptBR }) }) },
  { label: "Este mês", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Este ano", getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

export function DashboardFilters({
  period,
  onPeriodChange,
  customDateRange,
  onCustomDateRangeChange,
}: DashboardFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>(customDateRange?.from);
  const [toDate, setToDate] = useState<Date | undefined>(customDateRange?.to);
  const [activeField, setActiveField] = useState<"from" | "to">("from");

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getValue();
    setFromDate(range.from);
    setToDate(range.to);
    onCustomDateRangeChange?.(range);
    onPeriodChange("custom");
    setIsOpen(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (activeField === "from") {
      setFromDate(date);
      // Se a data inicial é maior que a final, ajusta
      if (toDate && date > toDate) {
        setToDate(undefined);
      }
      setActiveField("to");
    } else {
      // Se a data final é menor que a inicial, troca
      if (fromDate && date < fromDate) {
        setToDate(fromDate);
        setFromDate(date);
      } else {
        setToDate(date);
      }
    }
  };

  const handleApply = () => {
    if (fromDate && toDate && onCustomDateRangeChange) {
      onCustomDateRangeChange({ from: fromDate, to: toDate });
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setActiveField("from");
  };

  const getDisplayText = () => {
    if (period === "week") return "Esta semana";
    if (period === "month") return "Este mês";
    if (period === "year") return "Este ano";
    if (customDateRange?.from && customDateRange?.to) {
      return `${format(customDateRange.from, "dd/MM/yy", { locale: ptBR })} - ${format(customDateRange.to, "dd/MM/yy", { locale: ptBR })}`;
    }
    return "Selecionar período";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-between min-w-[200px] font-normal"
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            {getDisplayText()}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets Sidebar */}
          <div className="border-r p-3 space-y-1 min-w-[140px] bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Atalhos</p>
            <Button
              variant={period === "week" ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start text-sm"
              onClick={() => { onPeriodChange("week"); setIsOpen(false); }}
            >
              Esta semana
            </Button>
            <Button
              variant={period === "month" ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start text-sm"
              onClick={() => { onPeriodChange("month"); setIsOpen(false); }}
            >
              Este mês
            </Button>
            <Button
              variant={period === "year" ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start text-sm"
              onClick={() => { onPeriodChange("year"); setIsOpen(false); }}
            >
              Este ano
            </Button>
            <div className="border-t my-2" />
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Calendar Section */}
          <div className="p-3">
            {/* Date Input Fields */}
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Data Inicial
                </label>
                <button
                  onClick={() => setActiveField("from")}
                  className={cn(
                    "w-full px-3 py-2 text-sm text-left rounded-md border transition-colors",
                    activeField === "from"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-input hover:bg-accent"
                  )}
                >
                  {fromDate ? format(fromDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                </button>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Data Final
                </label>
                <button
                  onClick={() => setActiveField("to")}
                  className={cn(
                    "w-full px-3 py-2 text-sm text-left rounded-md border transition-colors",
                    activeField === "to"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-input hover:bg-accent"
                  )}
                >
                  {toDate ? format(toDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                </button>
              </div>
            </div>

            {/* Calendar */}
            <Calendar
              mode="single"
              selected={activeField === "from" ? fromDate : toDate}
              onSelect={handleDateSelect}
              locale={ptBR}
              className="pointer-events-auto"
              defaultMonth={activeField === "from" ? fromDate : toDate}
              modifiers={{
                range_start: fromDate ? [fromDate] : [],
                range_end: toDate ? [toDate] : [],
                range_middle: fromDate && toDate ? { after: fromDate, before: toDate } : undefined,
              }}
              modifiersStyles={{
                range_start: { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderRadius: "50%" },
                range_end: { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderRadius: "50%" },
                range_middle: { backgroundColor: "hsl(var(--accent))", borderRadius: 0 },
              }}
            />

            {/* Actions */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t">
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Limpar
              </Button>
              <Button 
                size="sm" 
                onClick={handleApply}
                disabled={!fromDate || !toDate}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
