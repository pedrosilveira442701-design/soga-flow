import { whatsappLink } from "@/lib/utils";
import { Visita } from "@/hooks/useVisitas";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Phone, MessageCircle, MapPinned, Edit2, Trash2, CheckCircle2 } from "lucide-react";

interface VisitaCardProps {
  visita: Visita;
  onEdit: (visita: Visita) => void;
  onToggleRealizada: (id: string, realizada: boolean) => void;
  onDelete: (id: string) => void;
  onViewDetails: (visita: Visita) => void;
}

const statusLabel: Record<Visita["status"], string> = {
  agendar: "Agendar",
  marcada: "Marcada",
  atrasada: "Atrasada",
  concluida: "Concluída",
};

const statusColor: Record<Visita["status"], string> = {
  agendar: "bg-muted text-muted-foreground border-border",
  marcada: "bg-primary/10 text-primary border-primary/20",
  atrasada: "bg-destructive/10 text-destructive border-destructive/20",
  concluida: "bg-success/10 text-success border-success/20",
};

export function VisitaCard({ visita, onEdit, onToggleRealizada, onDelete, onViewDetails }: VisitaCardProps) {
  const nomeCliente = visita.cliente_manual_name || visita.clientes?.nome || "Cliente não informado";

  const telefone = visita.telefone || visita.clientes?.telefone || "";
  const endereco = visita.endereco || visita.clientes?.endereco || "";

  const whatsappUrl = telefone
    ? `${whatsappLink(telefone)}?text=${encodeURIComponent(
        `Olá ${nomeCliente}, tudo bem? Aqui é da Só Garagens, sobre a visita: ${visita.assunto}.`,
      )}`
    : null;

  const mapsUrl = endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}` : null;

  const dataFormatada = visita.data ? new Date(visita.data).toLocaleDateString("pt-BR") : null;

  const handleCardClick = (e: React.MouseEvent) => {
    // Não abre detalhes se clicar em botões ou links
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    onViewDetails(visita);
  };

  return (
    <Card 
      className="w-full rounded-2xl border border-border shadow-sm bg-card cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-2">
        {/* ===== ORDEM DO CONTEÚDO ===== */}
        <div className="flex flex-col gap-1 text-foreground min-w-0 flex-1">
          {/* 1) Nome do cliente */}
          <h3 className="text-sm font-semibold leading-snug">{nomeCliente}</h3>

          {/* 2) Endereço */}
          {endereco && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-[1px] text-muted-foreground/70 shrink-0" />
              <span className="min-w-0 break-words">{endereco}</span>
            </div>
          )}

          {/* 3) Telefone */}
          {telefone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
              <span>{telefone}</span>
            </div>
          )}

          {/* 4) Tipo de visita */}
          {visita.marcacao_tipo && (
            <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {visita.marcacao_tipo}
            </span>
          )}

          {/* 5) Assunto */}
          <p className="text-xs text-muted-foreground">{visita.assunto}</p>
        </div>

        {/* Status + ações */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Status pill */}
          <Badge className={`rounded-full px-3 py-1 text-[11px] font-semibold border ${statusColor[visita.status]}`}>
            {statusLabel[visita.status]}
          </Badge>

          {/* Ações topo: editar / excluir */}
          <div className="flex items-center gap-1 mt-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full" aria-label="Editar visita"
              onClick={() => onEdit(visita)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10" aria-label="Excluir visita"
              onClick={() => onDelete(visita.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Infos extras: data / hora */}
      <div className="px-4 pb-3 space-y-1.5 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-3 mt-1">
          {dataFormatada && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{dataFormatada}</span>
            </div>
          )}
          {visita.hora && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{visita.hora}</span>
            </div>
          )}
        </div>
      </div>

      {/* Botões WhatsApp / Maps */}
      <div className="px-4 pb-3 flex gap-3" onPointerDown={(e) => e.stopPropagation()}>
        <Button
          type="button"
          variant="outline"
          className="flex-1 justify-center gap-2 rounded-full text-xs"
          disabled={!whatsappUrl}
          asChild={!!whatsappUrl}
        >
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5" />
              <span>WhatsApp</span>
            </a>
          ) : (
            <>
              <MessageCircle className="h-5 w-5" />
              <span>WhatsApp</span>
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="flex-1 justify-center gap-2 rounded-full text-xs"
          disabled={!mapsUrl}
          asChild={!!mapsUrl}
        >
          {mapsUrl ? (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPinned className="h-5 w-5" />
              <span>Maps</span>
            </a>
          ) : (
            <>
              <MapPinned className="h-5 w-5" />
              <span>Maps</span>
            </>
          )}
        </Button>
      </div>

      {/* Rodapé: marcar como realizada / ver detalhes */}
      <div className="border-t px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <button
          type="button"
          className="flex items-center gap-1 text-muted-foreground hover:text-success transition-colors"
          onClick={() => onToggleRealizada(visita.id, !visita.realizada)}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{visita.realizada ? "Marcar como pendente" : "Marcar como realizada"}</span>
        </button>

        <button
          type="button"
          className="text-muted-foreground hover:text-primary font-medium transition-colors"
          onClick={() => onViewDetails(visita)}
        >
          Ver detalhes
        </button>
      </div>
    </Card>
  );
}
