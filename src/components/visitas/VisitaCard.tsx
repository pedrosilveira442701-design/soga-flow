import { Calendar, Clock, MapPin, Phone, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Visita } from "@/hooks/useVisitas";

interface VisitaCardProps {
  visita: Visita;
  onEdit: (visita: Visita) => void;
  onToggleRealizada: (id: string, realizada: boolean) => void;
  onDelete: (id: string) => void;
  onViewDetails: (visita: Visita) => void;
}

export function VisitaCard({ visita, onEdit, onToggleRealizada, onDelete, onViewDetails }: VisitaCardProps) {
  // Telefones e endereço preferindo o que está na própria visita
  const telefoneRaw = visita.telefone || visita.clientes?.telefone || "";
  const telefoneDigits = telefoneRaw.replace(/\D/g, "");

  const baseEndereco = visita.endereco || visita.clientes?.endereco || "";
  const bairro = visita.clientes?.bairro || "";
  const cidade = visita.clientes?.cidade || "";
  const enderecoCompleto = [baseEndereco, bairro, cidade].filter(Boolean).join(", ");

  // Links
  const whatsappLink =
    telefoneDigits.length >= 10
      ? `https://wa.me/${telefoneDigits}?text=${encodeURIComponent(
          `Olá, estou entrando em contato sobre a visita: ${visita.assunto || ""}`,
        )}`
      : null;

  const mapsLink = enderecoCompleto
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`
    : null;

  const isConcluida = visita.realizada || visita.status === "concluida";

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (whatsappLink) {
      window.open(whatsappLink, "_blank", "noopener,noreferrer");
    }
  };

  const handleMapsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapsLink) {
      window.open(mapsLink, "_blank", "noopener,noreferrer");
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(visita);
  };

  const handleToggleRealizadaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleRealizada(visita.id, !isConcluida);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(visita.id);
  };

  return (
    <Card
      className="group relative cursor-pointer rounded-2xl border border-border/70 bg-background/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      onClick={() => onViewDetails(visita)}
    >
      {/* Barra de ações (ícones maiores) */}
      <div className="absolute left-2 top-2 z-10 flex gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full border-muted-foreground/20 bg-background/90 shadow-sm hover:bg-muted"
          onClick={handleEditClick}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={isConcluida ? "default" : "outline"}
          size="icon"
          className="h-8 w-8 rounded-full border-emerald-500/40 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100"
          onClick={handleToggleRealizadaClick}
        >
          <CheckCircle2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full border-red-500/40 bg-red-50/70 text-red-600 hover:bg-red-100"
          onClick={handleDeleteClick}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3 p-4 pt-10">
        {/* Tipo + status */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-xs px-2 py-0.5">
            {visita.marcacao_tipo === "medicao"
              ? "Medição"
              : visita.marcacao_tipo === "instalacao"
                ? "Instalação"
                : visita.marcacao_tipo === "orcamento"
                  ? "Orçamento"
                  : visita.marcacao_tipo === "followup"
                    ? "Follow-up"
                    : visita.marcacao_tipo === "manutencao"
                      ? "Manutenção"
                      : visita.marcacao_tipo === "reuniao"
                        ? "Reunião"
                        : "Visita"}
          </Badge>

          <Badge
            className={
              visita.status === "agendar"
                ? "bg-gray-100 text-gray-700"
                : visita.status === "marcada"
                  ? "bg-blue-100 text-blue-700"
                  : visita.status === "atrasada"
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
            }
          >
            {visita.status === "agendar"
              ? "Agendar"
              : visita.status === "marcada"
                ? "Marcada"
                : visita.status === "atrasada"
                  ? "Atrasada"
                  : "Concluída"}
          </Badge>
        </div>

        {/* Assunto / Cliente */}
        <div className="space-y-1">
          <p className="font-semibold text-sm leading-snug line-clamp-2">{visita.assunto}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {visita.clientes?.nome || visita.cliente_manual_name || "Cliente não informado"}
          </p>
        </div>

        {/* Data / hora */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{visita.data ? new Date(visita.data).toLocaleDateString("pt-BR") : "Sem data"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{visita.hora || "Sem horário"}</span>
          </div>
        </div>

        {/* Endereço / telefone */}
        <div className="space-y-1.5 text-xs">
          {enderecoCompleto && (
            <div className="flex items-start gap-1.5 text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span className="line-clamp-2">{enderecoCompleto}</span>
            </div>
          )}
          {telefoneRaw && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{telefoneRaw}</span>
            </div>
          )}
        </div>

        {/* Botões de ação – WhatsApp / Maps */}
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 gap-2 text-xs"
            onClick={handleWhatsAppClick}
            disabled={!whatsappLink}
          >
            <Phone className="h-4 w-4" />
            WhatsApp
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 gap-2 text-xs"
            onClick={handleMapsClick}
            disabled={!mapsLink}
          >
            <MapPin className="h-4 w-4" />
            Maps
          </Button>
        </div>
      </div>
    </Card>
  );
}
