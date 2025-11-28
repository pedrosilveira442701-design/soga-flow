import { Visita } from "@/hooks/useVisitas";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Circle,
} from "lucide-react";

interface VisitaCardProps {
  visita: Visita;
  onEdit: (visita: Visita) => void;
  onToggleRealizada: (id: string, realizada: boolean) => void;
  onDelete: (id: string) => void;
  onViewDetails: (visita: Visita) => void;
}

const STATUS_CONFIG: Record<Visita["status"], { label: string; className: string }> = {
  agendar: {
    label: "Agendar",
    className: "bg-slate-100 text-slate-800 border border-slate-200",
  },
  marcada: {
    label: "Marcada",
    className: "bg-sky-100 text-sky-800 border border-sky-200",
  },
  atrasada: {
    label: "Atrasada",
    className: "bg-red-100 text-red-800 border border-red-200",
  },
  concluida: {
    label: "Concluída",
    className: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  },
};

function formatDate(date: string | null | undefined) {
  if (!date) return "--";
  return new Date(date).toLocaleDateString("pt-BR");
}

function formatTime(time: string | null | undefined) {
  if (!time) return "--";
  // hora vem como "HH:MM:SS" ou "HH:MM"
  return time.slice(0, 5);
}

function getWhatsAppLink(visita: Visita) {
  const telefone = visita.telefone || visita.clientes?.telefone || undefined;

  if (!telefone) return null;

  const onlyDigits = telefone.replace(/\D/g, "");
  if (!onlyDigits) return null;

  const nome = visita.clientes?.nome || visita.cliente_manual_name || "cliente";

  const mensagem = `Olá ${nome}! Aqui é da Só Garagens. Estou falando sobre a visita: "${visita.assunto}" ${
    visita.data ? `no dia ${formatDate(visita.data)}` : ""
  } ${visita.hora ? `às ${formatTime(visita.hora)}` : ""}.`;

  return `https://wa.me/${onlyDigits}?text=${encodeURIComponent(mensagem)}`;
}

function getMapsLink(visita: Visita) {
  const endereco = visita.endereco || visita.clientes?.endereco || undefined;

  if (!endereco) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
}

export function VisitaCard({ visita, onEdit, onToggleRealizada, onDelete, onViewDetails }: VisitaCardProps) {
  const nomeCliente = visita.clientes?.nome || visita.cliente_manual_name || "Cliente não informado";

  const endereco = visita.endereco || visita.clientes?.endereco || "Endereço não informado";

  const telefone = visita.telefone || visita.clientes?.telefone || "";

  const statusInfo = STATUS_CONFIG[visita.status];
  const whatsappUrl = getWhatsAppLink(visita);
  const mapsUrl = getMapsLink(visita);

  const handleToggleRealizada = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onToggleRealizada(visita.id, !visita.realizada);
  };

  const handleEdit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onEdit(visita);
  };

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onDelete(visita.id);
  };

  const handleViewDetails = () => {
    onViewDetails(visita);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border border-slate-200"
      onClick={handleViewDetails}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold leading-snug">{nomeCliente}</CardTitle>
            <CardDescription className="text-xs flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="line-clamp-1">{endereco}</span>
            </CardDescription>
          </div>

          {/* Ações principais - AGORA GRANDES E VISÍVEIS */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Ver detalhes"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails();
              }}
            >
              <Eye className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Editar visita"
              onClick={handleEdit}
            >
              <Edit2 className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
              title="Excluir visita"
              onClick={handleDelete}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <Badge className={`text-[11px] px-2 py-0.5 font-medium ${statusInfo.className}`}>{statusInfo.label}</Badge>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={visita.realizada ? "Marcar como pendente" : "Marcar como realizada"}
            onClick={handleToggleRealizada}
          >
            {visita.realizada ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Circle className="h-5 w-5 text-slate-400" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-2 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(visita.data)}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTime(visita.hora)}</span>
          </div>
        </div>

        <div className="flex items-start gap-1 text-muted-foreground">
          <span className="font-semibold text-[11px] uppercase tracking-wide">Assunto:</span>
          <span className="text-xs line-clamp-2">{visita.assunto}</span>
        </div>

        {telefone && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            <span className="text-xs">{telefone}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Botão WhatsApp */}
          {whatsappUrl && (
            <Button type="button" variant="outline" size="icon" className="h-9 w-9" asChild>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Abrir WhatsApp"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            </Button>
          )}

          {/* Botão Maps */}
          {mapsUrl && (
            <Button type="button" variant="outline" size="icon" className="h-9 w-9" asChild>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Abrir no Google Maps"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            </Button>
          )}
        </div>

        <div className="text-[10px] text-muted-foreground text-right">
          {visita.marcacao_tipo && <span className="uppercase tracking-wide">{visita.marcacao_tipo}</span>}
        </div>
      </CardFooter>
    </Card>
  );
}
