import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface LeadFiltersState {
  searchQuery: string;
  sortBy: "name-asc" | "name-desc" | "date-newest" | "date-oldest";
}

interface LeadFiltersProps {
  filters: LeadFiltersState;
  onFiltersChange: (filters: LeadFiltersState) => void;
  totalCount: number;
  filteredCount: number;
}

export function LeadFilters({ filters, onFiltersChange, totalCount, filteredCount }: LeadFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchQuery: value });
  };

  const handleSortChange = (value: string) => {
    onFiltersChange({ ...filters, sortBy: value as LeadFiltersState["sortBy"] });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      searchQuery: "",
      sortBy: "date-newest",
    });
  };

  const hasActiveFilters = filters.searchQuery !== "" || filters.sortBy !== "date-newest";

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Busca por Cliente */}
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente..."
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Ordenação */}
        <Select value={filters.sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full sm:w-[200px] h-10">
            <SelectValue placeholder="Ordenar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-newest">Mais recentes</SelectItem>
            <SelectItem value="date-oldest">Mais antigos</SelectItem>
            <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
            <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
          </SelectContent>
        </Select>

        {/* Botão Limpar */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="gap-2 h-10 shrink-0"
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {/* Contador de Resultados */}
      {filters.searchQuery && (
        <div className="mt-3 text-caption text-muted-foreground">
          {filteredCount === 0 ? (
            <span>Nenhum resultado encontrado</span>
          ) : filteredCount === totalCount ? (
            <span>Mostrando todos os {totalCount} leads</span>
          ) : (
            <span>
              Mostrando {filteredCount} de {totalCount} leads
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
