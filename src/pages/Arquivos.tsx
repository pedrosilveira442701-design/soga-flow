import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/kpi/KPICard";
import { ArquivoCard } from "@/components/arquivos/ArquivoCard";
import { ArquivoUploadDialog } from "@/components/arquivos/ArquivoUploadDialog";
import { ArquivoPreviewDialog } from "@/components/arquivos/ArquivoPreviewDialog";
import { DownloadHistoryList } from "@/components/arquivos/DownloadHistoryList";
import { EmptyState } from "@/components/states/EmptyState";
import { useArquivos, type ArquivoWithRelations } from "@/hooks/useArquivos";
import {
  FileText,
  Upload,
  Grid3x3,
  List,
  Search,
  Building2,
  TrendingUp,
  HardDrive,
} from "lucide-react";
import { motion } from "framer-motion";
import { ENTIDADES, TIPOS_ARQUIVO } from "@/lib/fileUtils";

export default function Arquivos() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewArquivo, setPreviewArquivo] = useState<ArquivoWithRelations | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState({
    search: "",
    entidade: "todos",
    tipo: "todos",
  });

  const { arquivos, isLoading, kpis, downloadArquivo, deleteArquivo } = useArquivos(filters);

  const handleDeleteWithConfirm = (arquivo: ArquivoWithRelations) => {
    if (confirm(`Tem certeza que deseja deletar "${arquivo.nome}"?`)) {
      deleteArquivo.mutate(arquivo);
    }
  };

  const filteredArquivos = arquivos.filter((arquivo) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return arquivo.nome.toLowerCase().includes(searchLower);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Arquivos
          </h1>
          <p className="text-muted-foreground">
            Gerencie documentos e arquivos vinculados ao sistema
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? (
              <List className="h-4 w-4" />
            ) : (
              <Grid3x3 className="h-4 w-4" />
            )}
          </Button>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload de Arquivos
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total de Arquivos"
            value={kpis.totalArquivos}
            icon={FileText}
            delta={{ value: `${kpis.uploadsMes} este mês`, direction: "up" }}
          />
          <KPICard
            title="Clientes"
            value={kpis.porEntidade.clientes}
            icon={Building2}
            delta={{ value: `${kpis.porEntidade.contratos} contratos`, direction: "up" }}
          />
          <KPICard
            title="Propostas"
            value={kpis.porEntidade.propostas}
            icon={TrendingUp}
            delta={{ value: `${kpis.porEntidade.leads} leads`, direction: "up" }}
          />
          <KPICard
            title="Visitas"
            value={kpis.porEntidade.visitas}
            icon={HardDrive}
          />
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                className="pl-9"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </div>

            <Select
              value={filters.entidade}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, entidade: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Entidades</SelectItem>
                {ENTIDADES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.tipo}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, tipo: value === "todos" ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                {TIPOS_ARQUIVO.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() =>
                setFilters({ search: "", entidade: "todos", tipo: "todos" })
              }
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Arquivos */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredArquivos.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum arquivo encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Faça upload de documentos, fotos e arquivos relacionados aos seus clientes e contratos
          </p>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Fazer Primeiro Upload
          </Button>
        </div>
      ) : (
        <motion.div
          className={
            viewMode === "grid"
              ? "grid gap-4 md:grid-cols-3 lg:grid-cols-4"
              : "space-y-2"
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {filteredArquivos.map((arquivo) => (
            <ArquivoCard
              key={arquivo.id}
              arquivo={arquivo}
              onPreview={setPreviewArquivo}
              onDownload={downloadArquivo}
              onDelete={handleDeleteWithConfirm}
              onRename={(arquivo) => {
                // Implementar rename inline
                const newName = prompt("Novo nome:", arquivo.nome);
                if (newName) {
                  // renameArquivo mutation já está no hook
                }
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Histórico de Downloads */}
      <DownloadHistoryList />

      {/* Dialogs */}
      <ArquivoUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      <ArquivoPreviewDialog
        arquivo={previewArquivo}
        open={!!previewArquivo}
        onOpenChange={(open) => !open && setPreviewArquivo(null)}
      />
    </div>
  );
}
