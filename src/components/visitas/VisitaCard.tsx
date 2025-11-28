import React from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  Edit2,
  Trash2,
  MessageCircle,
  MapPinned,
  CheckCircle2,
  Info,
} from "lucide-react";
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
  const clienteNome = visita.clientes?.nome || visita.cliente_manual_name || "Cliente não informado";
  const endereco = visita.endereco || visita.clientes?.endereco || "";
  const telefone = visita.telefone || visita.clientes?.telefone || "";

  const dataFormatada =
    visita.data && new Date(visita.data).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const horaFormatada = visita.hora?.slice(0, 5);

  const statusLabel = (() => {
    switch (visita.status) {
      case "agendar":
        return "Agendar";
      case "marcada":
        return "Marcada";
      case "atrasada":
        return "Atrasada";
      case "concluida":
        return "Concluída";
      default:
        return visita.status;
    }
  })();

  const statusColor =
    visita.status === "concluida"
      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : visita.status === "atrasada"
        ? "bg-red-100 text-red-700 border-red-300"
        : visita.status === "marcada"
          ? "bg-blue-100 text-blue-700 border-blue-300"
          : "bg-slate-100 text-slate-700 border-slate-300";

  const isConcluida = visita.realizada || visita.status === "concluida";

  const handleWhatsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!telefone) return;

    const msg = `Olá ${clienteNome}, tudo bem?

Aqui é da Só Garagens. Estamos confirmando a visita para *${visita.assunto}* ${
      dataFormatada ? `no dia ${dataFormatada}` : ""
    } ${horaFormatada ? `às ${horaFormatada}` : ""}.`;

    const url = `https://wa.me/55${telefone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleMapsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!endereco) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleToggleRealizada = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleRealizada(visita.id, !isConcluida);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(visita);
  };

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

  return (
    <Card
      className="group relative flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
      onClick={handleViewDetails}
    >
      {/* Botões Editar / Excluir (topo direito) */}
      <div className="absolute right-3 top-3 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-slate-100"
          onClick={handleEdit}
        >
          <Edit2 className="h-4 w-4 md:h-5 md:w-5 text-slate-600" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-red-50"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
        </Button>
      </div>

      {/* Título / status */}
      <div className="flex items-start justify-between gap-2 pr-16">
        <div className="space-y-1">
          <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
            {visita.marcacao_tipo?.toUpperCase()}
          </p>
          <p className="text-sm font-semibold text-slate-900 leading-snug">{visita.assunto}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {clienteNome}
          </p>
        </div>

        <Badge
          variant="outline"
          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}
        >
          {isConcluida && <CheckCircle2 className="h-3.5 w-3.5" />}
          {statusLabel}
        </Badge>
      </div>

      {/* Infos de data / hora / endereço / telefone */}
      <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 mt-1">
        <div className="flex flex-wrap items-center gap-3">
          {dataFormatada && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {dataFormatada}
            </span>
          )}
          {horaFormatada && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {horaFormatada}
            </span>
          )}
        </div>

        {endereco && (
          <div className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5" />
            <span className="leading-snug">{endereco}</span>
          </div>
        )}

        {telefone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            <span>{telefone}</span>
          </div>
        )}
      </div>

      {/* Botões principais: WhatsApp / Maps */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-center gap-2 text-xs md:text-sm"
          onClick={handleWhatsClick}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MessageCircle className="h-4 w-4 md:h-5 md:w-5" />
          WhatsApp
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-center gap-2 text-xs md:text-sm"
          onClick={handleMapsClick}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MapPinned className="h-4 w-4 md:h-5 md:w-5" />
          Maps
        </Button>
      </div>

      {/* Ações inferiores */}
      <div className="mt-2 flex items-center justify-between border-t pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs gap-1.5"
          onClick={handleToggleRealizada}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <CheckCircle2 className="h-4 w-4" />
          {isConcluida ? "Marcar como pendente" : "Marcar como realizada"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs gap-1.5"
          onClick={handleViewDetails}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Info className="h-4 w-4" />
          Ver detalhes
        </Button>
      </div>
    </Card>
  );
}
