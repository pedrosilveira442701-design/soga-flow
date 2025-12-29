import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, X, Clock } from "lucide-react";
import { format, subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AnalyticsFilters as Filters } from "@/hooks/useAnalytics";
import { Badge } from "@/components/ui/badge";

interface AnalyticsFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

type PeriodPreset = "7d" | "1m" | "3m" | "6m" | "1y" | "custom";

export function AnalyticsFilters({ filters, onChange }: AnalyticsFiltersProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(filters.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(filters.endDate);
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>("custom");

  const handlePeriodPreset = (preset: PeriodPreset) => {
    setSelectedPreset(preset);
    const today = endOfDay(new Date());

    if (preset === "custom") {
      // Mantém as datas customizadas
      return;
    }

    let start: Date;
    switch (preset) {
      case "7d":
        start = startOfDay(subWeeks(today, 1));
        break;
      case "1m":
        start = startOfDay(subMonths(today, 1));
        break;
      case "3m":
        start = startOfDay(subMonths(today, 3));
        break;
      case "6m":
        start = startOfDay(subMonths(today, 6));
        break;
      case "1y":
        start = startOfDay(subYears(today, 1));
        break;
      default:
        start = startOfDay(subMonths(today, 1));
    }

    setStartDate(start);
    setEndDate(today);
    onChange({ ...filters, startDate: start, endDate: today });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    setSelectedPreset("custom");
    onChange({ ...filters, startDate: date });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    setSelectedPreset("custom");
    onChange({ ...filters, endDate: date });
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedPreset("custom");
    onChange({});
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Filtros de Análise</h3>
            </div>
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {activeFiltersCount} {activeFiltersCount === 1 ? "filtro ativo" : "filtros ativos"}
                </Badge>
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </div>
            )}
          </div>

          {/* Filtros Rápidos de Período */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Período de Análise</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedPreset === "7d" ? "default" : "outline"}
                size="sm"
                onClick={() => handlePeriodPreset("7d")}
                className="min-w-[100px]"
              >
                Última Semana
              </Button>
              <Button
                variant={selectedPreset === "1m" ? "default" : "outline"}
                size="sm"
                onClick={() => handlePeriodPreset("1m")}
                className="min-w-[100px]"
              >
                Último Mês
              </Button>
              <Button
                variant={selectedPreset === "3m" ? "default" : "outline"}
                size="sm"
                onClick={() => handlePeriodPreset("3m")}
                className="min-w-[100px]"
              >
                3 Meses
              </Button>
              <Button
                variant={selectedPreset === "6m" ? "default" : "outline"}
                size="sm"
                onClick={() => handlePeriodPreset("6m")}
                className="min-w-[100px]"
              >
                6 Meses
              </Button>
              <Button
                variant={selectedPreset === "1y" ? "default" : "outline"}
                size="sm"
                onClick={() => handlePeriodPreset("1y")}
                className="min-w-[100px]"
              >
                1 Ano
              </Button>
            </div>
          </div>

          {/* Período Customizado */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Período Personalizado</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Data Inicial */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-5 w-5" />
                      {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateChange}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Data Final */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-5 w-5" />
                      {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateChange}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Tipo de Serviço */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tipo de Serviço</Label>
                <Select
                  value={filters.tipoPiso || "all"}
                  onValueChange={(value) => onChange({ ...filters, tipoPiso: value === "all" ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os serviços" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os serviços</SelectItem>
                    <SelectItem value="Pintura Epóxi">Pintura Epóxi</SelectItem>
                    <SelectItem value="Pintura PU">Pintura PU</SelectItem>
                    <SelectItem value="Pintura PU Quadra">Pintura PU Quadra</SelectItem>
                    <SelectItem value="Pintura Acrílica">Pintura Acrílica</SelectItem>
                    <SelectItem value="Pintura Acrílica Quadra">Pintura Acrílica Quadra</SelectItem>
                    <SelectItem value="Pintura de Parede">Pintura de Parede</SelectItem>
                    <SelectItem value="Piso Autonivelante">Piso Autonivelante</SelectItem>
                    <SelectItem value="Piso Uretano">Piso Uretano</SelectItem>
                    <SelectItem value="Uretano Vertical">Uretano Vertical</SelectItem>
                    <SelectItem value="Rodapé Abaulado">Rodapé Abaulado</SelectItem>
                    <SelectItem value="Concretagem">Concretagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Resumo do Período Selecionado */}
          {(startDate || endDate) && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Período selecionado:</span>{" "}
                {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Início"} até{" "}
                {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Hoje"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
