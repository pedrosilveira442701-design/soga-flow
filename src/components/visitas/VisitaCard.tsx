import { Calendar, MapPin, Phone, User, MessageCircle, MapPinned, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Visita } from "@/hooks/useVisitas";

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
  const telefoneFonte = visita.telefone || visita.clientes?.telefone || "";
  const enderecoFonte = visita.endereco || visita.clientes?.endereco || "";

  const phoneDigits = telefoneFonte.replace(/\D/g, "");
  const whatsappUrl = phoneDigits
    ? `https://wa.me/55${phoneDigits}?text=${encodeURIComponent(
        `Olá, tudo bem? Estou entrando em contato sobre a visita: ${visita.assunto || ""}.`,
      )}`
    : null;

  const mapsUrl = enderecoFonte
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoFonte)}`
    : null;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(visita);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja excluir esta visita?")) {
      onDelete(visita.id);
    }
  };

  const handleToggleRealizada = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleRealizada(visita.id, !visita.realizada);
  };

  const handleWhatsapp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (whatsappUrl) {
      window.open(whatsappUrl, "_blank");
    }
  };

  const handleMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapsUrl) {
      window.open(mapsUrl, "_blank");
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(visita);
  };

  return (
    <Card
      className="w-full shadow-sm hover:shadow-md transition-shadow cursor-pointer rounded-2xl border border-slate-200"
      onClick={handleViewDetails}
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            {visita.marcacao_tipo && (
              <span className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                {visita.marcacao_tipo}
              </span>
            )}
            <CardTitle className="text-sm font-semibold leading-tight">
              {visita.assunto || "Visita sem assunto"}
            </CardTitle>
            {visita.clientes?.nome && <p className="text-xs text-slate-500">{visita.clientes.nome}</p>}
          </div>

          <div className="flex flex-col items-end gap-1">
            {/* Status badge */}
            <Badge
              variant="outline"
              className={`text-xs px-3 py-0.5 rounded-full font-medium ${statusColor[visita.status]}`}
            >
              {statusLabel[visita.status]}
            </Badge>

            {/* Ações (ícones MAIORES) */}
            <div className="flex items-center gap-1 mt-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-slate-100"
                onClick={handleEdit}
              >
                <Pencil className="h-4 w-4" strokeWidth={1.8} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-red-50 text-red-600"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.9} />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 pt-1 space-y-3">
        {/* Info básica */}
        <div className="space-y-1.5 text-xs text-slate-600">
          {(visita.data || visita.hora) && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {visita.data}
                {visita.hora && ` às ${visita.hora.slice(0, 5)}`}
              </span>
            </div>
          )}

          {enderecoFonte && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span className="line-clamp-1">{enderecoFonte}</span>
            </div>
          )}

          {telefoneFonte && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span>{telefoneFonte}</span>
            </div>
          )}

          {visita.responsavel && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>{visita.responsavel}</span>
            </div>
          )}
        </div>

        {/* Botões WhatsApp / Maps */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-center gap-2 rounded-full text-xs"
            onClick={handleWhatsapp}
            disabled={!whatsappUrl}
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
            WhatsApp
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-center gap-2 rounded-full text-xs"
            onClick={handleMaps}
            disabled={!mapsUrl}
          >
            <MapPinned className="h-4 w-4" strokeWidth={1.8} />
            Maps
          </Button>
        </div>

        {/* Rodapé: marcar realizada + detalhes */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
          <button
            type="button"
            onClick={handleToggleRealizada}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-600 transition-colors"
          >
            <CheckCircle2
              className={`h-3.5 w-3.5 ${visita.realizada ? "text-emerald-500" : "text-slate-300"}`}
              fill={visita.realizada ? "currentColor" : "none"}
              strokeWidth={1.8}
            />
            {visita.realizada ? "Marcada como realizada" : "Marcar como realizada"}
          </button>

          <button
            type="button"
            onClick={handleViewDetails}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline"
          >
            Ver detalhes
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
