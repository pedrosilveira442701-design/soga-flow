import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Download, Trash2, Edit, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getFileIcon,
  formatFileSize,
  isImageFile,
  isPdfFile,
} from "@/lib/fileUtils";
import type { ArquivoWithRelations } from "@/hooks/useArquivos";
import { useArquivos } from "@/hooks/useArquivos";

interface ArquivoPreviewDialogProps {
  arquivo: ArquivoWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArquivoPreviewDialog({
  arquivo,
  open,
  onOpenChange,
}: ArquivoPreviewDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameMode, setRenameMode] = useState(false);
  const [newName, setNewName] = useState("");

  const { getSignedUrl, deleteArquivo, downloadArquivo, renameArquivo } =
    useArquivos();

  useEffect(() => {
    if (arquivo && open) {
      setNewName(arquivo.nome);
      // Carregar URL assinada
      getSignedUrl(arquivo.url).then(setSignedUrl).catch(console.error);
    }
  }, [arquivo, open]);

  if (!arquivo) return null;

  const { icon: Icon, color } = getFileIcon(arquivo.nome);
  const isImage = isImageFile(arquivo.nome);
  const isPdf = isPdfFile(arquivo.nome);

  const handleDelete = () => {
    deleteArquivo.mutate(arquivo, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        onOpenChange(false);
      },
    });
  };

  const handleRename = () => {
    if (newName && newName !== arquivo.nome) {
      renameArquivo.mutate(
        { id: arquivo.id, nome: newName },
        {
          onSuccess: () => {
            setRenameMode(false);
          },
        }
      );
    } else {
      setRenameMode(false);
    }
  };

  const getEntidadeBadge = () => {
    const colors: Record<string, string> = {
      cliente: "bg-blue-500/10 text-blue-500",
      contrato: "bg-green-500/10 text-green-500",
      proposta: "bg-yellow-500/10 text-yellow-500",
      lead: "bg-purple-500/10 text-purple-500",
      visita: "bg-orange-500/10 text-orange-500",
      geral: "bg-gray-500/10 text-gray-500",
    };

    return (
      <Badge className={colors[arquivo.entidade] || colors.geral}>
        {arquivo.entidade}
      </Badge>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Preview do Arquivo</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Preview Area */}
            <div className="flex-1 bg-muted/30 rounded-lg flex items-center justify-center overflow-auto">
              {isImage && signedUrl ? (
                <img
                  src={signedUrl}
                  alt={arquivo.nome}
                  className="max-w-full max-h-full object-contain"
                />
              ) : isPdf && signedUrl ? (
                <iframe
                  src={signedUrl}
                  className="w-full h-full"
                  title={arquivo.nome}
                />
              ) : (
                <div className="text-center space-y-4">
                  <Icon className={`h-24 w-24 mx-auto ${color}`} />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Preview não disponível para este tipo de arquivo
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => downloadArquivo(arquivo)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Fazer Download
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar de Informações */}
            <div className="w-80 space-y-6 overflow-y-auto">
              {/* Nome e Tipo */}
              <div className="space-y-3">
                {renameMode ? (
                  <div className="space-y-2">
                    <Label>Nome do arquivo</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename();
                          if (e.key === "Escape") setRenameMode(false);
                        }}
                      />
                      <Button size="icon" onClick={handleRename}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold break-all">{arquivo.nome}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRenameMode(true)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    {arquivo.tipo && (
                      <Badge className="mt-2">{arquivo.tipo}</Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Detalhes */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Detalhes</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tamanho:</span>
                    <span>
                      {arquivo.size ? formatFileSize(arquivo.size) : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Criado em:</span>
                    <span>
                      {formatDistanceToNow(new Date(arquivo.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Formato:</span>
                    <span className="uppercase">
                      {arquivo.nome.split(".").pop()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vinculação */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Vinculação</h4>
                <div className="flex items-center gap-2">
                  {getEntidadeBadge()}
                  {arquivo.entidade_nome && (
                    <span className="text-sm">{arquivo.entidade_nome}</span>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => downloadArquivo(arquivo)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o arquivo "{arquivo.nome}"? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
