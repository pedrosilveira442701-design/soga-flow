import { MapaFilters } from "@/hooks/useMapaGeografico";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { CalendarIcon, DollarSign } from "lucide-react";
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

      {/* Filtros Secundários - Linha 1 */}
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

        {/* Cidade */}
        <div>
          <label className="text-sm font-medium mb-2 block">Cidade</label>
          <Select
            value={filters.cidade || "all"}
            onValueChange={(value) =>
              onChange({ ...filters, cidade: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas as cidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="Belo Horizonte">Belo Horizonte</SelectItem>
              <SelectItem value="Contagem">Contagem</SelectItem>
              <SelectItem value="Betim">Betim</SelectItem>
              <SelectItem value="Nova Lima">Nova Lima</SelectItem>
              <SelectItem value="Sabará">Sabará</SelectItem>
              <SelectItem value="Ribeirão das Neves">Ribeirão das Neves</SelectItem>
              <SelectItem value="Santa Luzia">Santa Luzia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bairro */}
        <div>
          <label className="text-sm font-medium mb-2 block">Bairro</label>
          <Select
            value={filters.bairro || "all"}
            onValueChange={(value) =>
              onChange({ ...filters, bairro: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Savassi">Savassi</SelectItem>
              <SelectItem value="Funcionários">Funcionários</SelectItem>
              <SelectItem value="Lourdes">Lourdes</SelectItem>
              <SelectItem value="Santo Agostinho">Santo Agostinho</SelectItem>
              <SelectItem value="Serra">Serra</SelectItem>
              <SelectItem value="São Bento">São Bento</SelectItem>
              <SelectItem value="Anchieta">Anchieta</SelectItem>
              <SelectItem value="Sion">Sion</SelectItem>
              <SelectItem value="Gutierrez">Gutierrez</SelectItem>
              <SelectItem value="Mangabeiras">Mangabeiras</SelectItem>
              <SelectItem value="Belvedere">Belvedere</SelectItem>
              <SelectItem value="Buritis">Buritis</SelectItem>
              <SelectItem value="Castelo">Castelo</SelectItem>
              <SelectItem value="Santa Efigênia">Santa Efigênia</SelectItem>
              <SelectItem value="Centro">Centro</SelectItem>
              <SelectItem value="Prado">Prado</SelectItem>
              <SelectItem value="Santa Tereza">Santa Tereza</SelectItem>
              <SelectItem value="Barreiro">Barreiro</SelectItem>
              <SelectItem value="Venda Nova">Venda Nova</SelectItem>
              <SelectItem value="Pampulha">Pampulha</SelectItem>
            </SelectContent>
          </Select>
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
      </div>

      {/* Filtros de Valor - Linha 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Valor Mínimo</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              placeholder="R$ 0"
              className="pl-9"
              value={filters.valor_min || ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  valor_min: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Valor Máximo</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              placeholder="R$ 999.999"
              className="pl-9"
              value={filters.valor_max || ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  valor_max: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Botão Limpar Filtros */}
      {(filters.status || filters.periodo_inicio || filters.periodo_fim || filters.origem || filters.bairro || filters.cidade || filters.valor_min || filters.valor_max) && (
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
              bairro: undefined,
              cidade: undefined,
              valor_min: undefined,
              valor_max: undefined,
            })
          }
        >
          Limpar Filtros
        </Button>
      )}
    </div>
  );
}
