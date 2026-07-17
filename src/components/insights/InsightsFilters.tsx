import { Calendar, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InsightFilters } from "@/hooks/useInsights";

interface InsightsFiltersProps {
  filters: InsightFilters;
  onFiltersChange: (filters: InsightFilters) => void;
  canais?: string[];
  servicos?: string[];
  clientes?: { id: string; nome: string }[];
}

export function InsightsFilters({
  filters,
  onFiltersChange,
  canais = ["WhatsApp", "Instagram", "Facebook", "Indicação", "Site", "Google"],
  servicos = ["Porcelanato Líquido", "Epóxi", "Poliuretano", "Granilite", "Concreto Polido"],
}: InsightsFiltersProps) {
  const activeFiltersCount = [
    filters.canal,
    filters.servico,
    filters.cliente,
    filters.cidade,
    filters.bairro,
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    onFiltersChange({
      period: "this_month",
    });
  };

  return (
    <div className="flex flex-col gap-2 p-3 sm:p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 bg-card border border-border rounded-lg">
      {/* Período */}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Label className="text-sm text-muted-foreground shrink-0">Período:</Label>
        <Select
          value={filters.period}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, period: value as InsightFilters["period"] })
          }
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="this_month">Este mês</SelectItem>
            <SelectItem value="last_90">Últimos 90 dias</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Datas customizadas */}
      {filters.period === "custom" && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-10 w-full justify-start sm:h-9 sm:w-auto sm:justify-center">
                <Calendar className="h-[18px] w-[18px]" />
                {filters.startDate
                  ? format(new Date(filters.startDate), "dd/MM/yyyy", { locale: ptBR })
                  : "Data inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.startDate ? new Date(filters.startDate) : undefined}
                onSelect={(date) =>
                  onFiltersChange({
                    ...filters,
                    startDate: date?.toISOString().split("T")[0],
                  })
                }
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-center sm:text-left">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-10 w-full justify-start sm:h-9 sm:w-auto sm:justify-center">
                <Calendar className="h-[18px] w-[18px]" />
                {filters.endDate
                  ? format(new Date(filters.endDate), "dd/MM/yyyy", { locale: ptBR })
                  : "Data final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.endDate ? new Date(filters.endDate) : undefined}
                onSelect={(date) =>
                  onFiltersChange({
                    ...filters,
                    endDate: date?.toISOString().split("T")[0],
                  })
                }
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Filtros adicionais */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-10 w-full sm:h-9 sm:w-auto">
            <Filter className="h-[18px] w-[18px]" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] max-w-80" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select
                value={filters.canal || "all"}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    canal: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os canais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os canais</SelectItem>
                  {canais.map((canal) => (
                    <SelectItem key={canal} value={canal}>
                      {canal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Serviço</Label>
              <Select
                value={filters.servico || "all"}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    servico: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os serviços" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os serviços</SelectItem>
                  {servicos.map((servico) => (
                    <SelectItem key={servico} value={servico}>
                      {servico}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                placeholder="Digite a cidade"
                value={filters.cidade || ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    cidade: e.target.value || undefined,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input
                placeholder="Digite o bairro"
                value={filters.bairro || ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    bairro: e.target.value || undefined,
                  })
                }
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Limpar filtros */}
      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-1 h-10 w-full sm:h-9 sm:w-auto">
          <X className="h-[18px] w-[18px]" />
          Limpar
        </Button>
      )}
    </div>
  );
}
