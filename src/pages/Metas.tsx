import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMetas, MetaFilters } from "@/hooks/useMetas";
import { MetaForm } from "@/components/forms/MetaForm";
import { MetaCard } from "@/components/metas/MetaCard";
import { MetaDetailsDialog } from "@/components/metas/MetaDetailsDialog";
import { EmptyState } from "@/components/states/EmptyState";
import { KPICard } from "@/components/kpi/KPICard";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Plus, Search, RefreshCw, TrendingUp, CheckCircle2, AlertTriangle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Metas() {
  const [filters, setFilters] = useState<MetaFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMeta, setEditingMeta] = useState<any>(null);
  const [selectedMeta, setSelectedMeta] = useState<any>(null);

  const {
    metasComInsights,
    kpis,
    isLoading,
    createMeta,
    updateMeta,
    deleteMeta,
    recalcularProgresso,
    recalcularTodas,
  } = useMetas(filters);

  // Filtro de busca textual
  const metasFiltradas = metasComInsights.filter((meta) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      meta.tipo.toLowerCase().includes(search) ||
      meta.responsavel?.toLowerCase().includes(search) ||
      meta.status.toLowerCase().includes(search)
    );
  });

  // Pills de filtros rápidos
  const quickFilters = [
    { label: "No Alvo", key: "noAlvo", count: kpis.metasNoAlvo },
    { label: "Em Alerta", key: "emAlerta", count: kpis.metasEmAlerta },
    { label: "Atrasadas", key: "atrasadas", count: kpis.metasAtrasadas },
  ];

  const handleSubmit = async (data: any) => {
    if (editingMeta) {
      await updateMeta.mutateAsync({ id: editingMeta.id, ...data });
      setEditingMeta(null);
    } else {
      await createMeta.mutateAsync(data);
    }
    setShowCreateDialog(false);
  };

  const handleQuickFilter = (key: string) => {
    switch (key) {
      case "noAlvo":
        // Filtrar metas com progresso >= 100%
        setFilters({ ...filters, search: undefined });
        break;
      case "emAlerta":
        // Mostrar todas para que os alertas sejam visíveis nos cards
        setFilters({ ...filters, status: "ativa" });
        break;
      case "atrasadas":
        // Filtrar metas ativas
        setFilters({ ...filters, status: "ativa" });
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-[1600px] mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 flex items-center gap-3">
              <Target className="h-8 w-8" />
              Metas
            </h1>
            <p className="text-muted-foreground mt-1">Defina objetivos e acompanhe a performance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => recalcularTodas.mutate()} disabled={recalcularTodas.isPending}>
              <RefreshCw className={`h-4 w-4 ${recalcularTodas.isPending ? "animate-spin" : ""}`} />
              Recalcular Todas
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" />
              Nova Meta
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            title="Metas Ativas"
            value={kpis.metasAtivas.toString()}
            icon={Activity}
            delta={
              kpis.metasAtivas > 0
                ? {
                    value: `${((kpis.metasAtivas / kpis.totalMetas) * 100).toFixed(0)}% do total`,
                    direction: "up" as const,
                  }
                : undefined
            }
          />

          <KPICard
            title="Performance Geral"
            value={`${kpis.performanceGeral.toFixed(1)}%`}
            icon={TrendingUp}
            delta={{
              value: kpis.performanceGeral >= 80 ? "Excelente" : kpis.performanceGeral >= 60 ? "Bom" : "Atenção",
              direction: kpis.performanceGeral >= 60 ? ("up" as const) : ("down" as const),
            }}
          />

          <KPICard
            title="No Alvo"
            value={kpis.metasNoAlvo.toString()}
            icon={CheckCircle2}
            delta={
              kpis.metasAtivas > 0
                ? {
                    value: `${((kpis.metasNoAlvo / kpis.metasAtivas) * 100).toFixed(0)}% concluídas`,
                    direction: "up" as const,
                  }
                : undefined
            }
          />

          <KPICard
            title="Em Alerta"
            value={kpis.metasEmAlerta.toString()}
            icon={AlertTriangle}
            delta={{
              value: kpis.metasEmAlerta > 0 ? "Precisam atenção" : "Tudo OK",
              direction: kpis.metasEmAlerta === 0 ? ("up" as const) : ("down" as const),
            }}
          />
        </div>

        {/* Filtros */}
        <div className="bg-card border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por tipo, responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={filters.status || "todos"}
              onValueChange={(value) => setFilters({ ...filters, status: value === "todos" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="ativa">Ativas</SelectItem>
                <SelectItem value="concluida">Concluídas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.periodo || "todos"}
              onValueChange={(value) =>
                setFilters({ ...filters, periodo: value === "todos" ? undefined : (value as any) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Períodos</SelectItem>
                <SelectItem value="mes">Este Mês</SelectItem>
                <SelectItem value="trimestre">Este Trimestre</SelectItem>
                <SelectItem value="ano">Este Ano</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setFilters({});
                setSearchTerm("");
              }}
            >
              Limpar Filtros
            </Button>
          </div>

          {/* Pills de Filtros Rápidos */}
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter) => (
              <Badge
                key={filter.key}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleQuickFilter(filter.key)}
              >
                {filter.label} ({filter.count})
              </Badge>
            ))}
          </div>
        </div>

        {/* Grid de Metas */}
        {metasFiltradas.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Nenhuma meta cadastrada"
            description="Defina metas para acompanhar a performance da equipe"
            action={{
              label: "Criar Primeira Meta",
              onClick: () => setShowCreateDialog(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metasFiltradas.map((meta) => (
              <MetaCard
                key={meta.id}
                meta={meta}
                onEdit={() => {
                  setEditingMeta(meta);
                  setShowCreateDialog(true);
                }}
                onDelete={() => deleteMeta.mutate(meta.id)}
                onViewDetails={() => setSelectedMeta(meta)}
                onRecalcular={() => recalcularProgresso.mutate(meta.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog de Criar/Editar */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) setEditingMeta(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMeta ? "Editar Meta" : "Nova Meta"}</DialogTitle>
            <DialogDescription>
              {editingMeta ? "Atualize as informações da meta" : "Defina uma nova meta para acompanhar"}
            </DialogDescription>
          </DialogHeader>
          <MetaForm
            meta={editingMeta}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowCreateDialog(false);
              setEditingMeta(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes */}
      <MetaDetailsDialog
        meta={selectedMeta}
        open={!!selectedMeta}
        onOpenChange={(open) => !open && setSelectedMeta(null)}
        onEdit={() => {
          setEditingMeta(selectedMeta);
          setSelectedMeta(null);
          setShowCreateDialog(true);
        }}
      />
    </>
  );
}
