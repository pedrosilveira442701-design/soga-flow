import { useState } from "react";
import { Plus, Search, StickyNote, Filter, Calendar, List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnotacoes, type AnotacaoFilters } from "@/hooks/useAnotacoes";
import { AnotacoesListView } from "@/components/anotacoes/AnotacoesListView";
import { AnotacoesKanbanView } from "@/components/anotacoes/AnotacoesKanbanView";
import { AnotacoesCalendarView } from "@/components/anotacoes/AnotacoesCalendarView";
import { AnotacaoDrawer } from "@/components/anotacoes/AnotacaoDrawer";
import { AnotacoesFilters } from "@/components/anotacoes/AnotacoesFilters";
import { QuickAddAnotacao } from "@/components/anotacoes/QuickAddAnotacao";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ViewMode = "list" | "kanban" | "calendar";

export default function Anotacoes() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<AnotacaoFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAnotacaoId, setSelectedAnotacaoId] = useState<string | null>(null);

  const combinedFilters: AnotacaoFilters = {
    ...filters,
    search: searchQuery || undefined,
  };

  const { anotacoes, isLoading } = useAnotacoes(combinedFilters);

  const handleCreateNew = () => {
    setSelectedAnotacaoId(null);
    setDrawerOpen(true);
  };

  const handleEditAnotacao = (id: string) => {
    setSelectedAnotacaoId(id);
    setDrawerOpen(true);
  };

  // Chamado quando o QuickAdd cria uma anotação com sucesso
  const handleQuickCreate = () => {
    // Aqui a lista é atualizada via invalidation dentro do hook useAnotacoes
    // e o QuickAdd limpa o próprio input internamente.
    setDrawerOpen(false);
  };

  return (
    <>
      <div className="space-y-6 max-w-[1800px] mx-auto">
        {/* Cabeçalho da página */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 flex items-center gap-3">
              <StickyNote className="icon-xl" />
              Anotações &amp; Lembretes
            </h1>
            <p className="text-muted-foreground mt-1">Registre tarefas e configure lembretes inteligentes</p>
          </div>

          <Button onClick={handleCreateNew}>
            <Plus className="icon-md mr-1" />
            Nova Anotação
          </Button>
        </div>

        {/* Campo de criação rápida */}
        <QuickAddAnotacao onSuccess={handleQuickCreate} />

        {/* Barra de ferramentas */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
              <Input
                placeholder="Buscar anotações, tags #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="icon"
              onClick={() => setShowFilters((prev) => !prev)}
            >
              <Filter className="icon-md" />
            </Button>
          </div>

          {/* Seletor de visualização */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <List className="icon-md" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2">
                <LayoutGrid className="icon-md" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <Calendar className="icon-md" />
                Calendário
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Painel de filtros */}
        {showFilters && (
          <AnotacoesFilters filters={filters} onFiltersChange={setFilters} onClose={() => setShowFilters(false)} />
        )}

        {/* Conteúdos por visualização */}
        {viewMode === "list" && (
          <AnotacoesListView anotacoes={anotacoes} isLoading={isLoading} onEdit={handleEditAnotacao} />
        )}

        {viewMode === "kanban" && (
          <AnotacoesKanbanView anotacoes={anotacoes} isLoading={isLoading} onEdit={handleEditAnotacao} />
        )}

        {viewMode === "calendar" && (
          <AnotacoesCalendarView anotacoes={anotacoes} isLoading={isLoading} onEdit={handleEditAnotacao} />
        )}
      </div>

      {/* Drawer de criação/edição */}
      <AnotacaoDrawer open={drawerOpen} onOpenChange={setDrawerOpen} anotacaoId={selectedAnotacaoId} />
    </>
  );
}
