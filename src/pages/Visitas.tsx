import { useState } from 'react';
import { Calendar, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useVisitas, Visita, VisitaFilters } from '@/hooks/useVisitas';
import { VisitaForm } from '@/components/forms/VisitaForm';
import { VisitaCard } from '@/components/visitas/VisitaCard';
import { VisitaDetailsDialog } from '@/components/visitas/VisitaDetailsDialog';
import { KPICard } from '@/components/kpi/KPICard';
import { EmptyState } from '@/components/states/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isToday, isPast, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIPOS_VISITA = [
  { value: 'medicao', label: 'Medição' },
  { value: 'instalacao', label: 'Instalação' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'outro', label: 'Outro' },
];

export default function Visitas() {
  const [filters, setFilters] = useState<VisitaFilters>({
    realizada: 'todos',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedVisita, setSelectedVisita] = useState<Visita | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { visitas, kpis, isLoading, createVisita, updateVisita, marcarComoRealizada, deleteVisita } = useVisitas(filters);

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
      updateVisita.mutate(
        { id: selectedVisita.id, ...data },
        { onSuccess: handleCloseDialog }
      );
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
    if (confirm('Tem certeza que deseja excluir esta visita?')) {
      deleteVisita.mutate(id);
    }
  };

  const handleQuickFilter = (periodo: VisitaFilters['periodo']) => {
    setFilters((prev) => ({ ...prev, periodo }));
  };

  // Agrupar visitas por data
  const groupedVisitas = visitas.reduce((acc, visita) => {
    if (!visita.data) {
      const key = 'sem-data';
      if (!acc[key]) acc[key] = [];
      acc[key].push(visita);
      return acc;
    }

    const dataVisita = parseISO(visita.data);
    const isAtrasada = isPast(dataVisita) && !visita.realizada;

    if (isAtrasada) {
      const key = 'atrasadas';
      if (!acc[key]) acc[key] = [];
      acc[key].push(visita);
    } else if (isToday(dataVisita)) {
      const key = 'hoje';
      if (!acc[key]) acc[key] = [];
      acc[key].push(visita);
    } else if (isTomorrow(dataVisita)) {
      const key = 'amanha';
      if (!acc[key]) acc[key] = [];
      acc[key].push(visita);
    } else {
      const key = format(dataVisita, 'yyyy-MM-dd');
      if (!acc[key]) acc[key] = [];
      acc[key].push(visita);
    }

    return acc;
  }, {} as Record<string, Visita[]>);

  const getGroupTitle = (key: string) => {
    if (key === 'atrasadas') return 'Atrasadas';
    if (key === 'hoje') return 'Hoje';
    if (key === 'amanha') return 'Amanhã';
    if (key === 'sem-data') return 'Sem Data Definida';
    return format(parseISO(key), "dd 'de' MMMM", { locale: ptBR });
  };

  const getGroupColor = (key: string) => {
    if (key === 'atrasadas') return 'text-red-600';
    if (key === 'hoje') return 'text-blue-600';
    if (key === 'amanha') return 'text-green-600';
    return 'text-foreground';
  };

  const responsaveis = Array.from(
    new Set(visitas.map((v) => v.responsavel).filter(Boolean))
  ) as string[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-7 w-7" />
            Visitas
          </h1>
          <p className="text-muted-foreground mt-1">
            Agende e gerencie visitas aos clientes
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
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
          <KPICard
            title="Visitas Hoje"
            value={kpis.visitasHoje}
            icon={Calendar}
          />
          <KPICard
            title="Esta Semana"
            value={kpis.visitasSemana}
            icon={Calendar}
          />
          <KPICard
            title={`Pendentes${kpis.visitasAtrasadas > 0 ? ` (${kpis.visitasAtrasadas} atrasada${kpis.visitasAtrasadas > 1 ? 's' : ''})` : ''}`}
            value={kpis.visitasPendentes}
            icon={Calendar}
          />
          <KPICard
            title="Taxa de Realização"
            value={`${kpis.taxaRealizacao.toFixed(0)}%`}
            icon={Calendar}
            delta={
              kpis.taxaRealizacao >= 80
                ? { value: 'Ótimo', direction: 'up' as const }
                : kpis.taxaRealizacao >= 60
                ? undefined
                : { value: 'Baixo', direction: 'down' as const }
            }
          />
        </div>
      ) : null}

      {/* Filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por assunto, cliente, tipo..."
              className="pl-9"
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          <Select
            value={filters.realizada || 'todos'}
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
            value={filters.tipo || 'todos'}
            onValueChange={(value) =>
              setFilters({ ...filters, tipo: value === 'todos' ? undefined : value })
            }
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
              value={filters.responsavel || 'todos'}
              onValueChange={(value) =>
                setFilters({ ...filters, responsavel: value === 'todos' ? undefined : value })
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
            variant={filters.periodo === 'hoje' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => handleQuickFilter('hoje')}
          >
            Hoje
          </Badge>
          <Badge
            variant={filters.periodo === 'semana' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => handleQuickFilter('semana')}
          >
            Esta Semana
          </Badge>
          <Badge
            variant={filters.periodo === 'mes' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => handleQuickFilter('mes')}
          >
            Este Mês
          </Badge>
          <Badge
            variant={filters.periodo === 'atrasadas' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => handleQuickFilter('atrasadas')}
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
      </div>

      {/* Lista de Visitas */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : visitas.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Nenhuma visita agendada"
          description="Comece agendando visitas aos seus clientes"
          action={{
            label: 'Agendar Primeira Visita',
            onClick: () => handleOpenDialog(),
          }}
        />
      ) : (
        <div className="space-y-8">
          {Object.keys(groupedVisitas)
            .sort((a, b) => {
              const order = ['atrasadas', 'hoje', 'amanha'];
              const indexA = order.indexOf(a);
              const indexB = order.indexOf(b);
              if (indexA !== -1 && indexB !== -1) return indexA - indexB;
              if (indexA !== -1) return -1;
              if (indexB !== -1) return 1;
              if (a === 'sem-data') return 1;
              if (b === 'sem-data') return -1;
              return a.localeCompare(b);
            })
            .map((key) => (
              <div key={key}>
                <h2 className={`text-xl font-semibold mb-4 ${getGroupColor(key)}`}>
                  {getGroupTitle(key)} ({groupedVisitas[key].length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groupedVisitas[key].map((visita) => (
                    <VisitaCard
                      key={visita.id}
                      visita={visita}
                      onEdit={handleOpenDialog}
                      onToggleRealizada={handleToggleRealizada}
                      onDelete={handleDelete}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Dialog de Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Visita' : 'Nova Visita'}
            </DialogTitle>
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
