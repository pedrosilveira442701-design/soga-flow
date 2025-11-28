import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, MapPin, Pencil, Trash2, Eye, CheckCircle2, Clock } from "lucide-react";
import type { Visita } from "@/hooks/useVisitas";
import { toast } from "sonner";

interface VisitaCardProps {
  visita: Visita;
  onEdit: (visita: Visita) => void;
  onToggleRealizada: (id: string, realizada: boolean) => void;
  onDelete: (id: string) => void;
  onViewDetails: (visita: Visita) => void;
}

function normalizePhoneForWhats(telefone?: string | null): string {
  if (!telefone) return "";
  let digits = telefone.replace(/\D/g, "");
  // se vier só DDD+telefone, prefixa 55
  if (digits.length <= 11) {
    digits = `55${digits}`;
  }
  return digits;
}

export function VisitaCard({ visita, onEdit, onToggleRealizada, onDelete, onViewDetails }: VisitaCardProps) {
  const nomeCliente = visita.clientes?.nome || visita.cliente_manual_name || "Cliente não informado";

  const telefone = visita.telefone || visita.clientes?.telefone || "";
  const endereco = visita.endereco || visita.clientes?.endereco || "";

  const telefoneWhats = normalizePhoneForWhats(telefone);

  const mensagemWhats = `Olá ${nomeCliente}, tudo bem? Estou entrando em contato sobre a visita: ${visita.assunto}.`;
  const whatsappUrl = telefoneWhats ? `https://wa.me/${telefoneWhats}?text=${encodeURIComponent(mensagemWhats)}` : "";

  const mapsUrl = endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}` : "";

  const handleWhatsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!whatsappUrl) {
      toast.error("Telefone não informado para esta visita");
      return;
    }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const handleMapsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mapsUrl) {
      toast.error("Endereço não informado para esta visita");
      return;
    }
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(visita.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(visita);
  };

  const handleToggleRealizadaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleRealizada(visita.id, !visita.realizada);
  };

  const handleViewDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(visita);
  };

  const dataLabel = visita.data ? new Date(visita.data).toLocaleDateString("pt-BR") : "Sem data";
  const horaLabel = visita.hora || "--:--";

  return (
    <Card
      className="
        mb-2 rounded-xl border shadow-sm bg-background
        hover:shadow-md hover:border-primary/50
        transition-all duration-200
      "
      onClick={handleViewDetailsClick}
    >
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">{nomeCliente}</CardTitle>
            <p className="text-xs text-muted-foreground truncate">{visita.assunto}</p>
          </div>

          {/* Ações no canto superior direito, com ícones maiores */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleViewDetailsClick}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEditClick}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant={visita.realizada ? "outline" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={handleToggleRealizadaClick}
            >
              {visita.realizada ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={handleDeleteClick}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-1 pb-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            <span className="font-medium">Data:</span> {dataLabel}
          </span>
          <span>
            <span className="font-medium">Hora:</span> {horaLabel}
          </span>
        </div>

        {/* Botões de ação: WhatsApp e Maps */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 justify-center gap-2"
            onClick={handleWhatsClick}
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 justify-center gap-2"
            onClick={handleMapsClick}
          >
            <MapPin className="h-4 w-4" />
            Maps
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
