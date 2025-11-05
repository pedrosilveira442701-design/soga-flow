import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Download, MoreVertical, Trash2, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getFileIcon, formatFileSize, isImageFile } from "@/lib/fileUtils";
import type { ArquivoWithRelations } from "@/hooks/useArquivos";
import { motion } from "framer-motion";

interface ArquivoCardProps {
  arquivo: ArquivoWithRelations;
  onPreview: (arquivo: ArquivoWithRelations) => void;
  onDownload: (arquivo: ArquivoWithRelations) => void;
  onDelete: (arquivo: ArquivoWithRelations) => void;
  onRename: (arquivo: ArquivoWithRelations) => void;
}

export function ArquivoCard({
  arquivo,
  onPreview,
  onDownload,
  onDelete,
  onRename,
}: ArquivoCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { icon: Icon, color } = getFileIcon(arquivo.nome);
  const isImage = isImageFile(arquivo.nome);

  // Carregar URL da imagem se for uma imagem
  useState(() => {
    if (isImage) {
      import("@/integrations/supabase/client").then(({ supabase }) => {
        supabase.storage
          .from("arquivos")
          .createSignedUrl(arquivo.url, 3600)
          .then(({ data }) => {
            if (data) setImageUrl(data.signedUrl);
          });
      });
    }
  });

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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300">
        {/* Preview Area */}
        <div className="aspect-square bg-muted/50 flex items-center justify-center relative overflow-hidden">
          {isImage && imageUrl ? (
            <img
              src={imageUrl}
              alt={arquivo.nome}
              className="w-full h-full object-cover"
            />
          ) : (
            <Icon className={`h-16 w-16 ${color}`} />
          )}

          {/* Overlay com ações (aparecem no hover) */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={() => onPreview(arquivo)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => onDownload(arquivo)}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Badge de tipo no canto */}
          {arquivo.tipo && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary">{arquivo.tipo}</Badge>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{arquivo.nome}</p>
              <p className="text-caption text-muted-foreground">
                {arquivo.size ? formatFileSize(arquivo.size) : ""}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onPreview(arquivo)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDownload(arquivo)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRename(arquivo)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Renomear
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(arquivo)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between">
            {getEntidadeBadge()}
            <span className="text-caption text-muted-foreground">
              {formatDistanceToNow(new Date(arquivo.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
