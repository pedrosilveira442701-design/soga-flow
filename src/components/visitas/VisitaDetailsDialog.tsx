import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Visita } from "@/hooks/useVisitas";
import { Calendar, Clock, MapPin, Phone, User, ExternalLink, Edit, Check, MessageSquare } from "lucide-react";
import { format, parseISO, isPast, isToday, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPOS_VISITA = [
  { value: "medicao", label: "Medição", icon: "📏", color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  { value: "instalacao", label: "Instalação", icon: "🔨", color: "bg-green-500/10 text-green-700 border-green-500/20" },
  { value: "followup", label: "Follow-up", icon: "📞", color: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  {
    value: "orcamento",
    label: "Orçamento",
    icon: "💰",
    color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  },
  {
    value: "manutencao",
    label: "Manutenção",
    icon: "🛠️",
    color: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  },
  { value: "reuniao", label: "Reunião", icon: "🤝", color: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20" },
  { value: "outro", label: "Outro", icon: "📋", color: "bg-gray-500/10 text-gray-700 border-gray-500/20" },
];

interface VisitaDetailsDialogProps {
  visita: Visita | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (visita: Visita) => void;
  onToggleRealizada: (id: string, realizada: boolean) => void;
}

export function VisitaDetailsDialog({
  visita,
  open,
  onOpenChange,
  onEdit,
  onToggleRealizada,
}: VisitaDetailsDialogProps) {
  if (!visita) return null;

  const tipo = TIPOS_VISITA.find((t) => t.value === visita.marcacao_tipo);
  const dataVisita = visita.data ? parseISO(visita.data) : null;
  const isAtrasada = dataVisita && isPast(dataVisita) && !visita.realizada;
  const isHoje = dataVisita && isToday(dataVisita);

  const getContagem = () => {
    if (!dataVisita) return null;
    const dias = differenceInDays(dataVisita, new Date());
    if (dias > 0) return `Faltam ${dias} dia${dias > 1 ? "s" : ""}`;
    if (dias < 0) return `Há ${Math.abs(dias)} dia${Math.abs(dias) > 1 ? "s" : ""}`;
    return "Hoje";
  };

  const getStatusBadge = () => {
    if (visita.realizada) {
      return (
        <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
          <Check className="h-4 w-4 mr-1" />
          Realizada
        </Badge>
      );
    }
    if (isAtrasada) {
      return <Badge className="bg-red-500/10 text-red-700 border-red-500/20">Atrasada</Badge>;
    }
    return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">Pendente</Badge>;
  };

  const handleWhatsApp = () => {
    if (visita.telefone) {
      const numero = visita.telefone.replace(/\D/g, "");
      window.open(`https://wa.me/55${numero}`, "_blank");
    }
  };

  const handleMaps = () => {
    if (visita.endereco) {
      const query = encodeURIComponent(visita.endereco);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
    }
  };

  const handleLigar = () => {
    if (visita.telefone) {
      window.location.href = `tel:${visita.telefone}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <DialogTitle className="text-2xl">{visita.assunto}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {tipo && (
                  <Badge className={tipo.color}>
                    {tipo.icon} {tipo.label}
                  </Badge>
                )}
                {getStatusBadge()}
                {isHoje && <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">HOJE</Badge>}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(visita)}>
              <Edit className="h-4.5 w-4.5 mr-2" />
              Editar
            </Button>
          </div>
        </DialogHeader>

        <Separator />

        <div className="grid md:grid-cols-2 gap-6">
          {/* Coluna 1: Detalhes da Visita */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Detalhes da Visita</h3>

              {visita.clientes && (
                <div className="space-y-1 mb-4">
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="text-lg font-medium">{visita.clientes.nome}</p>
                </div>
              )}

              {dataVisita && (
                <div className="flex items-start gap-3 mb-4">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {format(dataVisita, "EEEE, dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                      {visita.hora && ` às ${visita.hora.slice(0, 5)}`}
                    </p>
                    <p className="text-sm text-muted-foreground">{getContagem()}</p>
                  </div>
                </div>
              )}

              {visita.responsavel && (
                <div className="flex items-center gap-3 mb-4">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Responsável</p>
                    <p className="font-medium">{visita.responsavel}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Coluna 2: Localização e Contato */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Localização e Contato</h3>

              {visita.endereco && (
                <div className="mb-4">
                  <div className="flex items-start gap-3 mb-2">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Endereço</p>
                      <p className="font-medium">{visita.endereco}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleMaps} className="ml-8">
                    <ExternalLink className="h-4.5 w-4.5 mr-2" />
                    Abrir no Google Maps
                  </Button>
                </div>
              )}

              {visita.telefone && (
                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="font-medium">{visita.telefone}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-8">
                    <Button variant="outline" size="sm" onClick={handleLigar}>
                      <Phone className="h-4.5 w-4.5 mr-2" />
                      Ligar
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleWhatsApp}>
                      <MessageSquare className="h-4.5 w-4.5 mr-2" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {visita.observacao && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Observações</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visita.observacao}</p>
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Criada em:{" "}
            {format(parseISO(visita.created_at), "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
          </p>
          {visita.updated_at !== visita.created_at && (
            <p>
              Atualizada em:{" "}
              {format(parseISO(visita.updated_at), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </p>
          )}
        </div>

        <Separator />

        <div className="flex justify-end gap-3">
          {!visita.realizada && (
            <Button onClick={() => onToggleRealizada(visita.id, true)}>
              <Check className="h-4 w-4 mr-2" />
              Marcar como Realizada
            </Button>
          )}
          {visita.realizada && (
            <Button variant="outline" onClick={() => onToggleRealizada(visita.id, false)}>
              Marcar como Pendente
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
