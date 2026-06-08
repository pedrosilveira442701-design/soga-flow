import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, ArrowRight, Pencil, User, Trash2, MessageSquare, Sparkles, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Contato } from "@/hooks/useContatos";
import { WhatsAppConversaDialog } from "@/components/leads/WhatsAppConversaDialog";
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

const TRIAGEM = {
  potencial: { label: "Potencial", cls: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30" },
  pendente: { label: "A revisar", cls: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30" },
  ruido: { label: "Ruído", cls: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30" },
} as const;

export function ContatoMiniCard({ contato, onConvertToLead, onEdit, onDelete }: ContatoMiniCardProps) {
  const [conversaOpen, setConversaOpen] = useState(false);
  return (
    <div className="p-3 rounded-lg border-2 border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors space-y-2 max-w-[520px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1.5 min-w-0">
          {contato.nome && (
            <div className="flex items-center gap-2">
              <User className="h-[18px] w-[18px] text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-sm font-semibold text-foreground truncate">{contato.nome}</span>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Phone className="h-[18px] w-[18px] text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">{contato.telefone}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {contato.origem === "whatsapp" && contato.triagem_status && TRIAGEM[contato.triagem_status] && (
              <Badge variant="outline" className={cn("text-xs font-semibold", TRIAGEM[contato.triagem_status].cls)}>
                {TRIAGEM[contato.triagem_status].label}
              </Badge>
            )}
            {contato.tag && (
              <Badge variant="outline" className={cn("text-xs", TAG_STYLES[contato.tag])}>
                {TAG_LABELS[contato.tag]}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {contato.origem}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-5 w-5" />
              {format(new Date(contato.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </span>
          </div>
          {contato.triagem_motivo && (
            <p className="text-xs text-muted-foreground italic mt-1 flex items-start gap-1">
              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-violet-500" />
              {contato.triagem_motivo}
            </p>
          )}
          {contato.observacoes && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{contato.observacoes}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon" variant="ghost" onClick={() => onEdit(contato)} title="Editar contato">
            <Pencil className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(contato)}
            className="text-destructive hover:text-destructive"
            title="Excluir contato"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Button
          onClick={() => onConvertToLead(contato)}
          className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 h-8 text-xs font-medium flex items-center gap-1"
        >
          <span className="text-base leading-none">＋</span>
          Lead
        </Button>
        {contato.origem === "whatsapp" && (
          <>
            <Button
              variant="outline"
              onClick={() => setConversaOpen(true)}
              className="rounded-full px-3 h-8 text-xs font-medium flex items-center gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5 text-green-600" />
              Ver conversa
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`https://wa.me/${(contato.telefone || "").replace(/\D/g, "")}`, "_blank")}
              className="rounded-full px-3 h-8 text-xs font-medium flex items-center gap-1.5 border-green-600/40 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
              title="Abrir conversa no WhatsApp"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir no WhatsApp
            </Button>
          </>
        )}
      </div>

      <WhatsAppConversaDialog
        open={conversaOpen}
        onOpenChange={setConversaOpen}
        telefone={contato.telefone}
        jid={contato.whatsapp_jid}
        nome={contato.nome}
      />
    </div>
  );
}
