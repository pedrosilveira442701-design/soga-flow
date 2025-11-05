import { useState } from "react";
import { useArquivosByEntidade, useArquivos } from "@/hooks/useArquivos";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Eye, Download, Trash2, Upload } from "lucide-react";
import { formatFileSize, getFileIcon } from "@/lib/fileUtils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArquivoUploadDialog } from "./ArquivoUploadDialog";
import { ArquivoPreviewDialog } from "./ArquivoPreviewDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Arquivo } from "@/hooks/useArquivos";

interface ArquivosListProps {
  entidade: string;
  entidadeId: string;
  showUpload?: boolean;
  compact?: boolean;
}

export default function ArquivosList({
  entidade,
  entidadeId,
  showUpload = true,
  compact = false,
}: ArquivosListProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedArquivo, setSelectedArquivo] = useState<Arquivo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [arquivoToDelete, setArquivoToDelete] = useState<string | null>(null);

  const { data: arquivos, isLoading } = useArquivosByEntidade(entidade, entidadeId);
  const { downloadArquivo, deleteArquivo } = useArquivos();

  const handlePreview = (arquivo: Arquivo) => {
    setSelectedArquivo(arquivo);
    setPreviewDialogOpen(true);
  };

  const handleDownload = async (arquivo: Arquivo) => {
    await downloadArquivo(arquivo);
  };

  const handleDeleteClick = (arquivoId: string) => {
    setArquivoToDelete(arquivoId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (arquivoToDelete && arquivos) {
      const arquivo = arquivos.find(a => a.id === arquivoToDelete);
      if (arquivo) {
        await deleteArquivo.mutateAsync(arquivo);
        setDeleteDialogOpen(false);
        setArquivoToDelete(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com botão de upload */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-medium">Arquivos ({arquivos?.length || 0})</h4>
        </div>
        {showUpload && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUploadDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        )}
      </div>

      {/* Lista de arquivos */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : arquivos && arquivos.length > 0 ? (
        <div className="space-y-2">
          {arquivos.map((arquivo) => {
            const { icon: Icon, color } = getFileIcon(arquivo.nome);
            return (
              <div
                key={arquivo.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <Icon className={`h-5 w-5 ${color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{arquivo.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(0)} •{" "}
                    {formatDistanceToNow(new Date(arquivo.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePreview(arquivo)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(arquivo)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(arquivo.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-4">
            Nenhum arquivo anexado
          </p>
          {showUpload && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Fazer Upload
            </Button>
          )}
        </div>
      )}

      {/* Dialogs */}
      <ArquivoUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        defaultEntidade={entidade}
        defaultEntidadeId={entidadeId}
      />

      {selectedArquivo && (
        <ArquivoPreviewDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          arquivo={selectedArquivo}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este arquivo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
