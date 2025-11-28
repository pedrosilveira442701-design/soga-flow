// src/components/visitas/VisitaCard.tsx
import { Visita } from "@/hooks/useVisitas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Phone, MessageCircleMore, Edit2, Trash2, CheckCircle2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface VisitaCardProps {
  visita: Visita;
  onEdit: (visita: Visita) => void;
  onToggleRealizada: (id: string, realizada: boolean) => void;
  onDelete: (id: string) => void;
  onViewDetails: (visita: Visita) => void;
}

export function VisitaCard({ visita, onEdit, onToggleRealizada, onDelete, onViewDetails }: VisitaCardProps) {
  const nomeCliente = visita.clientes?.nome || visita.cliente_manual_name || "Cliente não informado";

  const assunto = visita.assunto || "Sem assunto";

  const enderecoBase =
    visita.endereco ||
    visita.clientes?.endereco ||
    `${visita.clientes?.bairro || ""} ${visita.clientes?.cidade ? `- ${visita.clientes.cidade}` : ""}`.trim() ||
    "";

  const telefoneBase = visita.telefone || visita.clientes?.telefone || "";

  const dataFormatada = visita.data ? new Date(visita.data).toLocaleDateString("pt-BR") : "Sem data";

  const horaFormatada = visita.hora || "Sem horário";

  const isConcluida = visita.realizada || visita.status === "concluida";

  // --------- LINKS WHATSAPP / MAPS ---------

  const limparTelefone = (tel: string) => tel.replace(/\D/g, "");

  const telefoneNumerico = limparTelefone(telefoneBase || "");

  const hasWhatsapp = telefoneNumerico.length >= 10;
  const hasMaps = !!enderecoBase;

  const mensagemWhats = `Olá ${nomeCliente}, estou entrando em contato sobre a visita: ${assunto}.`;
  const whatsappUrl = hasWhatsapp
    ? `https://wa.me/55${telefoneNumerico}?text=${encodeURIComponent(mensagemWhats)}`
    : "";

  const mapsUrl = hasMaps ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoBase)}` : "";

  // Impede que o clique/pointer desses botões dispare o drag do Kanban
  const handleInteractivePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  const handleInteractiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card p-4 shadow-sm cursor-pointer",
        "hover:shadow-md hover:border-primary/40 transition-all duration-150",
      )}
      onClick={() => onViewDetails(visita)}
    >
      {/* Ações no canto superior direito */}
      <div className="absolute right-2 top-2 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(visita);
          }}
        >
          <Edit2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(visita.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{visita.marcacao_tipo?.toUpperCase() || "VISITA"}</span>
          <h3 className="font-semibold text-sm leading-tight">{assunto}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{nomeCliente}</p>
        </div>

        <div className="flex flex-col items-end gap-1">
          {isConcluida && (
            <Badge
              variant="outline"
              className="border-emerald-500/60 text-emerald-700 bg-emerald-50 text-[10px] px-2 py-0.5"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Concluída
            </Badge>
          )}

          {!isConcluida && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-2 py-0.5",
                visita.status === "atrasada" && "border-red-500/60 text-red-700 bg-red-50",
                visita.status === "marcada" && "border-blue-500/60 text-blue-700 bg-blue-50",
                visita.status === "agendar" && "border-amber-500/60 text-amber-700 bg-amber-50",
              )}
            >
              {visita.status === "atrasada" && "Atrasada"}
              {visita.status === "marcada" && "Marcada"}
              {visita.status === "agendar" && "Agendar"}
              {visita.status === "concluida" && "Concluída"}
            </Badge>
          )}
        </div>
      </div>

      {/* Infos principais */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{dataFormatada}</span>
          <Clock className="h-3.5 w-3.5 ml-3" />
          <span>{horaFormatada}</span>
        </div>

        {enderecoBase && (
          <div className="flex items-start gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 mt-[2px]" />
            <span className="line-clamp-2">{enderecoBase}</span>
          </div>
        )}

        {telefoneBase && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            <span>{telefoneBase}</span>
          </div>
        )}
      </div>

      {/* Ações principais */}
      <div className="mt-3 flex gap-2">
        {/* WhatsApp */}
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          disabled={!hasWhatsapp}
          onPointerDown={handleInteractivePointerDown}
          onClick={handleInteractiveClick}
          asChild
        >
          <a href={hasWhatsapp ? whatsappUrl : undefined} target="_blank" rel="noopener noreferrer">
            <MessageCircleMore className="h-4 w-4 mr-1" />
            WhatsApp
          </a>
        </Button>

        {/* Google Maps */}
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          disabled={!hasMaps}
          onPointerDown={handleInteractivePointerDown}
          onClick={handleInteractiveClick}
          asChild
        >
          <a href={hasMaps ? mapsUrl : undefined} target="_blank" rel="noopener noreferrer">
            <MapPin className="h-4 w-4 mr-1" />
            Maps
          </a>
        </Button>
      </div>

      {/* Footer: marcar realizada / detalhes */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <button
          type="button"
          className="inline-flex items-center gap-1 hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onToggleRealizada(visita.id, !isConcluida);
          }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {isConcluida ? "Marcar como pendente" : "Marcar como realizada"}
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-1 hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(visita);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
          Ver detalhes
        </button>
      </div>
    </div>
  );
}
