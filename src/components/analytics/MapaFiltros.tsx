import { MapaFilters } from "@/hooks/useMapaGeografico";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface MapaFiltrosProps {
  filters: MapaFilters;
  onChange: (filters: MapaFilters) => void;
}

export function MapaFiltros({ filters, onChange }: MapaFiltrosProps) {
  const getStatusOptions = () => {
    switch (filters.modo) {
      case "propostas":
        return [
          { value: "all", label: "Todos" },
          { value: "aberta", label: "Aberta" },
          { value: "fechada", label: "Ganha" },
          { value: "perdida", label: "Perdida" },
        ];
      case "contratos":
        return [
          { value: "all", label: "Todos" },
          { value: "ativo", label: "Ativo" },
          { value: "concluido", label: "Concluído" },
          { value: "cancelado", label: "Cancelado" },
        ];
      case "obras":
        return [
          { value: "all", label: "Todos" },
          { value: "mobilizacao", label: "Mobilização" },
          { value: "execucao", label: "Execução" },
          { value: "testes", label: "Testes" },
          { value: "entrega", label: "Entrega" },
          { value: "concluida", label: "Concluída" },
        ];
    }
  };

  return (
    <div className="space-y-4">
      {/* Modo Pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filters.modo === "propostas" ? "default" : "outline"}
          onClick={() => onChange({ ...filters, modo: "propostas", status: undefined })}
        >
          Propostas
        </Button>
        <Button
          variant={filters.modo === "contratos" ? "default" : "outline"}
          onClick={() => onChange({ ...filters, modo: "contratos", status: undefined })}
        >
          Contratos Fechados
        </Button>
        <Button
          variant={filters.modo === "obras" ? "default" : "outline"}
          onClick={() => onChange({ ...filters, modo: "obras", status: undefined })}
        >
          Em Execução
        </Button>
      </div>

      {/* Filtros Secundários */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status */}
        <div>
          <label className="text-sm font-medium mb-2 block">Status</label>
          <Select
            value={filters.status || "all"}
            onValueChange={(value) =>
              onChange({ ...filters, status: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getStatusOptions().map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Data Início */}
        <div>
          <label className="text-sm font-medium mb-2 block">Data Início</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.periodo_inicio && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.periodo_inicio ? (
                  format(filters.periodo_inicio, "dd/MM/yyyy")
                ) : (
                  <span>Selecione</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.periodo_inicio}
                onSelect={(date) => onChange({ ...filters, periodo_inicio: date })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Data Fim */}
        <div>
          <label className="text-sm font-medium mb-2 block">Data Fim</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.periodo_fim && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.periodo_fim ? (
                  format(filters.periodo_fim, "dd/MM/yyyy")
                ) : (
                  <span>Selecione</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.periodo_fim}
                onSelect={(date) => onChange({ ...filters, periodo_fim: date })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Origem - apenas para propostas */}
        {filters.modo === "propostas" && (
          <div>
            <label className="text-sm font-medium mb-2 block">Origem</label>
            <Select
              value={filters.origem || "all"}
              onValueChange={(value) =>
                onChange({ ...filters, origem: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Orgânico">Orgânico</SelectItem>
                <SelectItem value="Indicação">Indicação</SelectItem>
                <SelectItem value="Sindico Profissional">Síndico Profissional</SelectItem>
                <SelectItem value="Google">Google</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Botão Limpar Filtros */}
      {(filters.status || filters.periodo_inicio || filters.periodo_fim || filters.origem) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({
              modo: filters.modo,
              status: undefined,
              periodo_inicio: undefined,
              periodo_fim: undefined,
              origem: undefined,
            })
          }
        >
          Limpar Filtros
        </Button>
      )}
    </div>
  );
}
