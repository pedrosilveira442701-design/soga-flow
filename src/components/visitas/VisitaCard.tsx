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
  agendar: "bg-slate-100 text-slate-700 border-slate-200",
  marcada: "bg-blue-50 text-blue-700 border-blue-200",
  atrasada: "bg-red-50 text-red-700 border-red-200",
  concluida: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function VisitaCard({ visita, onEdit, onToggleRealizada, onDelete, onViewDetails }: VisitaCardProps) {
  const nomeCliente = visita.cliente_manual_name || visita.clientes?.nome || "Cliente não informado";

  const telefone = visita.telefone || visita.clientes?.telefone || "";

  const endereco = visita.endereco || visita.clientes?.endereco || "";

  const whatsappUrl = telefone
    ? `https://wa.me/55${telefone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá ${nomeCliente}, tudo bem? Aqui é da Só Garagens, sobre a visita: ${visita.assunto}.`,
      )}`
    : null;

  const mapsUrl = endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}` : null;

  const dataFormatada = visita.data ? new Date(visita.data).toLocaleDateString("pt-BR") : null;

  return (
    <Card className="w-full rounded-2xl border border-slate-200 shadow-sm bg-white">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2">
        <div className="flex flex-col gap-1">
          {visita.marcacao_tipo && (
            <span className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
              {visita.marcacao_tipo}
            </span>
          )}
          <h3 className="text-sm font-semibold text-slate-900 leading-snug">{visita.assunto}</h3>
          <p className="text-xs text-slate-500">{nomeCliente}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
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
              className="h-7 w-7 rounded-full hover:bg-slate-100"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(visita);
              }}
            >
              <Edit2 className="h-5 w-5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-red-50 text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(visita.id);
              }}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Infos principais */}
      <div className="px-4 pb-3 space-y-1.5 text-xs text-slate-600">
        {endereco && (
          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 mt-[1px] text-slate-400 shrink-0" />
            <span>{endereco}</span>
          </div>
        )}

        {telefone && (
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-slate-400 shrink-0" />
            <span>{telefone}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-1">
          {dataFormatada && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>{dataFormatada}</span>
            </div>
          )}
          {visita.hora && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>{visita.hora}</span>
            </div>
          )}
        </div>
      </div>

      {/* Botões WhatsApp / Maps */}
      <div className="px-4 pb-3 flex gap-3">
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
      <div className="border-t px-4 py-2.5 flex items-center justify-between text-[11px]">
        <button
          type="button"
          className="flex items-center gap-1 text-slate-600 hover:text-emerald-600 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onToggleRealizada(visita.id, !visita.realizada);
          }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{visita.realizada ? "Marcar como pendente" : "Marcar como realizada"}</span>
        </button>

        <button
          type="button"
          className="text-slate-600 hover:text-blue-600 font-medium transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(visita);
          }}
        >
          Ver detalhes
        </button>
      </div>
    </Card>
  );
}
