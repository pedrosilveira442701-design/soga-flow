import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Contato } from "@/hooks/useContatos";

interface ContatoMiniCardProps {
  contato: Contato;
  onConvertToLead: (contato: Contato) => void;
}

export function ContatoMiniCard({ contato, onConvertToLead }: ContatoMiniCardProps) {
  return (
    <div className="p-3 rounded-lg border-2 border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Phone className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">
              {contato.telefone}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {contato.origem}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(contato.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onConvertToLead(contato)}
        className="w-full gap-2 h-8 text-xs bg-background hover:bg-accent"
      >
        Criar Lead
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
