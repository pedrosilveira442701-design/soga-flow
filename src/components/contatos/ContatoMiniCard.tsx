import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, ArrowRight, Pencil, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Contato } from "@/hooks/useContatos";
import { cn } from "@/lib/utils";

interface ContatoMiniCardProps {
  contato: Contato;
  onConvertToLead: (contato: Contato) => void;
  onEdit: (contato: Contato) => void;
  onDelete: (contato: Contato) => void;
}

const TAG_STYLES = {
  anuncio: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30",
  descoberta: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  orcamento: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
};

const TAG_LABELS = {
  anuncio: "Anúncio",
  descoberta: "Descoberta",
  orcamento: "Orçamento",
};

export function ContatoMiniCard({ contato, onConvertToLead, onEdit, onDelete }: ContatoMiniCardProps) {
  return (
    <div className="p-3 rounded-lg border-2 border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1.5 min-w-0">
          {contato.nome && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-sm font-semibold text-foreground truncate">
                {contato.nome}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Phone className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">
              {contato.telefone}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {contato.tag && (
              <Badge 
                variant="outline" 
                className={cn("text-xs", TAG_STYLES[contato.tag])}
              >
                {TAG_LABELS[contato.tag]}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {contato.origem}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(contato.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </span>
          </div>
          {contato.observacoes && (
            <p className="text-xs text-muted-foreground truncate mt-1">
              {contato.observacoes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(contato)}
            className="h-8 w-8 p-0"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(contato)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <Button
        size="default"
        variant="default"
        onClick={() => onConvertToLead(contato)}
        className="w-full gap-2 h-11 text-sm font-semibold shadow-sm hover:shadow-md transition-all"
        aria-label="Criar Lead"
      >
        <ArrowRight className="h-4 w-4" />
        Criar Lead
      </Button>
    </div>
  );
}
