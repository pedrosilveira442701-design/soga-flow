import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  type AnotacaoFilters,
  type AnotacaoStatus,
  type AnotacaoPriority,
  type AnotacaoType,
} from "@/hooks/useAnotacoes";

interface AnotacoesFiltersProps {
  filters: AnotacaoFilters;
  onFiltersChange: (filters: AnotacaoFilters) => void;
  onClose: () => void;
}

const statusOptions: { value: AnotacaoStatus; label: string }[] = [
  { value: "aberta", label: "Aberta" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "arquivada", label: "Arquivada" },
];

const priorityOptions: { value: AnotacaoPriority; label: string }[] = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

const typeOptions: { value: AnotacaoType; label: string }[] = [
  { value: "ligacao", label: "Ligação" },
  { value: "orcamento", label: "Orçamento" },
  { value: "follow_up", label: "Follow-up" },
  { value: "visita", label: "Visita" },
  { value: "reuniao", label: "Reunião" },
  { value: "outro", label: "Outro" },
];

export function AnotacoesFilters({ filters, onFiltersChange, onClose }: AnotacoesFiltersProps) {
  const handleStatusToggle = (status: AnotacaoStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    onFiltersChange({ ...filters, status: newStatuses.length > 0 ? newStatuses : undefined });
  };

  const handlePriorityToggle = (priority: AnotacaoPriority) => {
    const currentPriorities = filters.priority || [];
    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter((p) => p !== priority)
      : [...currentPriorities, priority];
    onFiltersChange({ ...filters, priority: newPriorities.length > 0 ? newPriorities : undefined });
  };

  const handleTypeToggle = (type: AnotacaoType) => {
    const currentTypes = filters.type || [];
    const newTypes = currentTypes.includes(type) ? currentTypes.filter((t) => t !== type) : [...currentTypes, type];
    onFiltersChange({ ...filters, type: newTypes.length > 0 ? newTypes : undefined });
  };

  const handleClearAll = () => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    (filters.status && filters.status.length > 0) ||
    (filters.priority && filters.priority.length > 0) ||
    (filters.type && filters.type.length > 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Filtros</h3>
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              Limpar Tudo
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Filter */}
        <div className="space-y-3">
          <Label className="font-medium">Status</Label>
          {statusOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${option.value}`}
                checked={filters.status?.includes(option.value) || false}
                onCheckedChange={() => handleStatusToggle(option.value)}
              />
              <Label htmlFor={`status-${option.value}`} className="text-sm font-normal cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="space-y-3">
          <Label className="font-medium">Prioridade</Label>
          {priorityOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`priority-${option.value}`}
                checked={filters.priority?.includes(option.value) || false}
                onCheckedChange={() => handlePriorityToggle(option.value)}
              />
              <Label htmlFor={`priority-${option.value}`} className="text-sm font-normal cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </div>

        {/* Type Filter */}
        <div className="space-y-3">
          <Label className="font-medium">Tipo</Label>
          {typeOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${option.value}`}
                checked={filters.type?.includes(option.value) || false}
                onCheckedChange={() => handleTypeToggle(option.value)}
              />
              <Label htmlFor={`type-${option.value}`} className="text-sm font-normal cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
