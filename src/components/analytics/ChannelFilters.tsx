import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChannelFilters as Filters } from "@/hooks/useChannelAnalytics";

interface ChannelFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  availableCanais: string[];
  availableBairros: string[];
}

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "week", label: "Esta Semana" },
  { value: "month", label: "Este Mês" },
  { value: "30d", label: "30 dias" },
  { value: "year", label: "Este Ano" },
  { value: "custom", label: "Personalizado" },
] as const;

export function ChannelFilters({ filters, onChange, availableCanais, availableBairros }: ChannelFiltersProps) {
  const handlePeriodChange = (period: Filters["period"]) => {
    onChange({ ...filters, period, startDate: undefined, endDate: undefined });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    onChange({ ...filters, period: "custom", startDate: date });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    onChange({ ...filters, period: "custom", endDate: date });
  };

  const toggleCanal = (canal: string) => {
    const current = filters.canais || [];
    const updated = current.includes(canal)
      ? current.filter((c) => c !== canal)
      : [...current, canal];
    onChange({ ...filters, canais: updated.length > 0 ? updated : undefined });
  };

  const toggleBairro = (bairro: string) => {
    const current = filters.bairros || [];
    const updated = current.includes(bairro)
      ? current.filter((b) => b !== bairro)
      : [...current, bairro];
    onChange({ ...filters, bairros: updated.length > 0 ? updated : undefined });
  };

  const clearFilters = () => {
    onChange({ period: "30d" });
  };

  const activeFiltersCount = 
    (filters.canais?.length || 0) + 
    (filters.bairros?.length || 0) + 
    (filters.period === "custom" ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Period Buttons */}
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={filters.period === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePeriodChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Custom Date Range */}
      {filters.period === "custom" && (
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">De</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("w-[140px] justify-start", !filters.startDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate ? format(filters.startDate, "dd/MM/yyyy", { locale: ptBR }) : "Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.startDate}
                  onSelect={handleStartDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Até</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("w-[140px] justify-start", !filters.endDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate ? format(filters.endDate, "dd/MM/yyyy", { locale: ptBR }) : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.endDate}
                  onSelect={handleEndDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Canais Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Canais
              {filters.canais && filters.canais.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {filters.canais.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0">
            <ScrollArea className="h-[200px] p-3">
              <div className="space-y-2">
                {availableCanais.map((canal) => (
                  <div key={canal} className="flex items-center gap-2">
                    <Checkbox
                      id={`canal-${canal}`}
                      checked={filters.canais?.includes(canal)}
                      onCheckedChange={() => toggleCanal(canal)}
                    />
                    <label htmlFor={`canal-${canal}`} className="text-sm cursor-pointer">
                      {canal}
                    </label>
                  </div>
                ))}
                {availableCanais.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum canal encontrado</p>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Bairros Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Bairros
              {filters.bairros && filters.bairros.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {filters.bairros.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0">
            <ScrollArea className="h-[200px] p-3">
              <div className="space-y-2">
                {availableBairros.map((bairro) => (
                  <div key={bairro} className="flex items-center gap-2">
                    <Checkbox
                      id={`bairro-${bairro}`}
                      checked={filters.bairros?.includes(bairro)}
                      onCheckedChange={() => toggleBairro(bairro)}
                    />
                    <label htmlFor={`bairro-${bairro}`} className="text-sm cursor-pointer">
                      {bairro}
                    </label>
                  </div>
                ))}
                {availableBairros.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum bairro encontrado</p>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
