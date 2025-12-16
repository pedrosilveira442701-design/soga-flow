import { useState, useMemo } from "react";
import { Calendar, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVisitas, Visita, VisitaFilters, VisitaStatus } from "@/hooks/useVisitas";
import { VisitaForm } from "@/components/forms/VisitaForm";
import { VisitaDetailsDialog } from "@/components/visitas/VisitaDetailsDialog";
import { VisitasKanbanBoard } from "@/components/visitas/VisitasKanbanBoard";
import { KPICard } from "@/components/kpi/KPICard";
import { EmptyState } from "@/components/states/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { normalizeText } from "@/lib/fuzzySearch";

const TIPOS_VISITA = [
  { value: "medicao", label: "Medição" },
  { value: "instalacao", label: "Instalação" },
  { value: "followup", label: "Follow-up" },
  { value: "orcamento", label: "Orçamento" },
  { value: "manutencao", label: "Manutenção" },
  { value: "reuniao", label: "Reunião" },
  { value: "outro", label: "Outro" },
];

export default function Visitas() {
  const [filters, setFilters] = useState<VisitaFilters>({
    realizada: "todos",
    search: "",
  });
  const [sortBy, setSortBy] = useState<"date-newest" | "date-oldest">("date-newest");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedVisita, setSelectedVisita] = useState<Visita | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { visitas, kpis, isLoading, createVisita, updateVisita, marcarComoRealizada, deleteVisita } =
    useVisitas(filters);

  // Filter and sort visitas
  const filteredAndSortedVisitas = useMemo(() => {
    let filtered = [...visitas];

    // Apply search filter
    if (filters.search) {
      const normalizedQuery = normalizeText(filters.search);
      filtered = filtered.filter((visita) => {
        const assunto = normalizeText(visita.assunto);
        const clienteNome = normalizeText(visita.clientes?.nome || visita.cliente_manual_name || "");
        const endereco = normalizeText(visita.endereco || "");
        return (
          assunto.includes(normalizedQuery) ||
          clienteNome.includes(normalizedQuery) ||
          endereco.includes(normalizedQuery)
        );
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = a.data ? new Date(a.data).getTime() : 0;
      const dateB = b.data ? new Date(b.data).getTime() : 0;
      return sortBy === "date-newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [visitas, filters.search, sortBy]);

  const handleOpenDialog = (visita?: Visita) => {
    if (visita) {
      setSelectedVisita(visita);
      setIsEditing(true);
    } else {
      setSelectedVisita(null);
      setIsEditing(false);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedVisita(null);
    setIsEditing(false);
  };

  const handleSubmit = (data: any) => {
    if (isEditing && selectedVisita) {
      updateVisita.mutate({ id: selectedVisita.id, ...data }, { onSuccess: handleCloseDialog });
    } else {
      createVisita.mutate(data, { onSuccess: handleCloseDialog });
    }
  };

  const handleViewDetails = (visita: Visita) => {
    setSelectedVisita(visita);
    setDetailsDialogOpen(true);
  };

  const handleToggleRealizada = (id: string, realizada: boolean) => {
    marcarComoRealizada.mutate({ id, realizada });
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta visita?")) {
      deleteVisita.mutate(id);
    }
  };

  const handleQuickFilter = (periodo: VisitaFilters["periodo"]) => {
    setFilters((prev) => ({ ...prev, periodo }));
  };

  const handleStatusChange = (visitaId: string, newStatus: VisitaStatus) => {
    const visita = visitas.find((v) => v.id === visitaId);
    if (!visita) return;

    // Update based on new status
    const updates: Partial<Visita> = { status: newStatus };

    if (newStatus === "concluida") {
      updates.realizada = true;
    } else {
      updates.realizada = false;
    }

    updateVisita.mutate({ id: visitaId, ...updates });
  };

  const responsaveis = Array.from(new Set(visitas.map((v) => v.responsavel).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Visitas
          </h1>
          <p className="text-muted-foreground mt-1">Agende e gerencie visitas aos clientes</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="icon-md mr-2" />
          Nova Visita
        </Button>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : kpis ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Visitas Hoje" value={kpis.visitasHoje} icon={Calendar} />
          <KPICard title="Esta Semana" value={kpis.visitasSemana} icon={Calendar} />
          <KPICard
            title={`Pendentes${kpis.visitasAtrasadas > 0 ? ` (${kpis.visitasAtrasadas} atrasada${kpis.visitasAtrasadas > 1 ? "s" : ""})` : ""}`}
            value={kpis.visitasPendentes}
            icon={Calendar}
          />
          <KPICard
            title="Taxa de Realização"
            value={`${kpis.taxaRealizacao.toFixed(0)}%`}
            icon={Calendar}
            delta={
              kpis.taxaRealizacao >= 80
                ? { value: "Ótimo", direction: "up" as const }
                : kpis.taxaRealizacao >= 60
                  ? undefined
                  : { value: "Baixo", direction: "down" as const }
            }
          />
        </div>
      ) : null}

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por assunto, cliente, endereço..."
                className="pl-9"
                value={filters.search || ""}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-newest">Mais recentes</SelectItem>
                <SelectItem value="date-oldest">Mais antigas</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.realizada || "todos"}
              onValueChange={(value: any) => setFilters({ ...filters, realizada: value })}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendentes">Pendentes</SelectItem>
                <SelectItem value="realizadas">Realizadas</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.tipo || "todos"}
              onValueChange={(value) => setFilters({ ...filters, tipo: value === "todos" ? undefined : value })}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo de visita" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {TIPOS_VISITA.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {responsaveis.length > 0 && (
              <Select
                value={filters.responsavel || "todos"}
                onValueChange={(value) =>
                  setFilters({ ...filters, responsavel: value === "todos" ? undefined : value })
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {responsaveis.map((resp) => (
                    <SelectItem key={resp} value={resp}>
                      {resp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Pills de Filtro Rápido */}
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={filters.periodo === "hoje" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleQuickFilter("hoje")}
            >
              Hoje
            </Badge>
            <Badge
              variant={filters.periodo === "semana" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleQuickFilter("semana")}
            >
              Esta Semana
            </Badge>
            <Badge
              variant={filters.periodo === "mes" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleQuickFilter("mes")}
            >
              Este Mês
            </Badge>
            <Badge
              variant={filters.periodo === "atrasadas" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleQuickFilter("atrasadas")}
            >
              Atrasadas
            </Badge>
            {filters.periodo && (
              <Badge
                variant="outline"
                className="cursor-pointer"
                onClick={() => setFilters({ ...filters, periodo: undefined })}
              >
                Limpar
              </Badge>
            )}
          </div>

          {/* Resultado da busca */}
          {filters.search && (
            <div className="text-sm text-muted-foreground">
              {filteredAndSortedVisitas.length === 0 ? (
                <span>Nenhum resultado encontrado</span>
              ) : (
                <span>
                  Mostrando {filteredAndSortedVisitas.length} de {visitas.length} visitas
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[600px]" />
          ))}
        </div>
      ) : visitas.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Nenhuma visita agendada"
          description="Comece agendando visitas aos seus clientes"
          action={{
            label: "Agendar Primeira Visita",
            onClick: () => handleOpenDialog(),
          }}
        />
      ) : (
        <VisitasKanbanBoard
          visitas={filteredAndSortedVisitas}
          onStatusChange={handleStatusChange}
          onEdit={handleOpenDialog}
          onToggleRealizada={handleToggleRealizada}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* Dialog de Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Visita" : "Nova Visita"}</DialogTitle>
          </DialogHeader>
          <VisitaForm
            visita={selectedVisita || undefined}
            onSubmit={handleSubmit}
            isLoading={createVisita.isPending || updateVisita.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes */}
      <VisitaDetailsDialog
        visita={selectedVisita}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onEdit={(visita) => {
          setDetailsDialogOpen(false);
          handleOpenDialog(visita);
        }}
        onToggleRealizada={handleToggleRealizada}
      />
    </div>
  );
}
