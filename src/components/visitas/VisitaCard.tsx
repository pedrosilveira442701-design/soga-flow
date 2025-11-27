import { Calendar, Clock, MapPin, User, MoreVertical, Check, X, MessageSquare, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Visita } from '@/hooks/useVisitas';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIPOS_VISITA = [
  { value: 'medicao', label: 'Medição', icon: '📏', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  { value: 'instalacao', label: 'Instalação', icon: '🔨', color: 'bg-green-500/10 text-green-700 border-green-500/20' },
  { value: 'followup', label: 'Follow-up', icon: '📞', color: 'bg-purple-500/10 text-purple-700 border-purple-500/20' },
  { value: 'orcamento', label: 'Orçamento', icon: '💰', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
  { value: 'manutencao', label: 'Manutenção', icon: '🛠️', color: 'bg-orange-500/10 text-orange-700 border-orange-500/20' },
  { value: 'reuniao', label: 'Reunião', icon: '🤝', color: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20' },
  { value: 'outro', label: 'Outro', icon: '📋', color: 'bg-gray-500/10 text-gray-700 border-gray-500/20' },
];

interface VisitaCardProps {
  visita: Visita;
  onEdit: (visita: Visita) => void;
  onToggleRealizada: (id: string, realizada: boolean) => void;
  onDelete: (id: string) => void;
  onViewDetails: (visita: Visita) => void;
}

export function VisitaCard({
  visita,
  onEdit,
  onToggleRealizada,
  onDelete,
  onViewDetails,
}: VisitaCardProps) {
  const tipo = TIPOS_VISITA.find((t) => t.value === visita.marcacao_tipo);
  
  const dataVisita = visita.data ? parseISO(visita.data) : null;
  
  // Combinar data + hora para verificação correta de atraso
  let dataHoraCompleta = dataVisita;
  if (dataVisita && visita.hora) {
    const [horas, minutos] = visita.hora.split(':');
    dataHoraCompleta = new Date(dataVisita);
    dataHoraCompleta.setHours(parseInt(horas), parseInt(minutos), 0, 0);
  }
  
  const isAtrasada = dataHoraCompleta && isPast(dataHoraCompleta) && !visita.realizada;
  const isHoje = dataVisita && isToday(dataVisita);

  const getStatusBadge = () => {
    if (visita.realizada) {
      return (
        <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
          <Check className="h-3 w-3 mr-1" />
          Realizada
        </Badge>
      );
    }
    if (isAtrasada) {
      return (
        <Badge className="bg-red-500/10 text-red-700 border-red-500/20">
          <X className="h-3 w-3 mr-1" />
          Atrasada
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
        <Clock className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  const handleWhatsApp = () => {
    if (visita.telefone) {
      const numero = visita.telefone.replace(/\D/g, '');
      const clienteNome = visita.clientes?.nome || visita.cliente_manual_name || 'Cliente';
      const dataFormatada = visita.data ? format(parseISO(visita.data), 'dd/MM/yyyy') : '';
      const horaFormatada = visita.hora ? visita.hora.slice(0, 5) : '';
      const mensagem = encodeURIComponent(
        `Olá, aqui é da Só Garagens. Assunto: ${visita.assunto} — Visita ${dataFormatada} às ${horaFormatada}. Podemos confirmar?`
      );
      window.open(`https://wa.me/55${numero}?text=${mensagem}`, '_blank');
    }
  };

  const handleMaps = () => {
    if (visita.endereco) {
      const query = encodeURIComponent(visita.endereco);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {tipo && (
              <Badge className={tipo.color}>
                {tipo.icon} {tipo.label}
              </Badge>
            )}
            {isHoje && (
              <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                HOJE
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(visita)}>
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(visita)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleRealizada(visita.id, !visita.realizada)}
              >
                {visita.realizada ? 'Marcar como Pendente' : 'Marcar como Realizada'}
              </DropdownMenuItem>
              {visita.telefone && (
                <DropdownMenuItem onClick={handleWhatsApp}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  WhatsApp
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(visita.id)}
                className="text-destructive"
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <h3 className="font-semibold text-lg line-clamp-2">{visita.assunto}</h3>
          {(visita.clientes || visita.cliente_manual_name) && (
            <p className="text-sm text-muted-foreground mt-1">
              {visita.clientes?.nome || visita.cliente_manual_name}
            </p>
          )}
          {!visita.clientes && !visita.cliente_manual_name && (
            <p className="text-sm text-muted-foreground mt-1 italic">
              Sem cliente cadastrado
            </p>
          )}
        </div>

        <div className="space-y-2 text-sm">
          {visita.data && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(parseISO(visita.data), "dd 'de' MMMM", { locale: ptBR })}
                {visita.hora && ` às ${visita.hora.slice(0, 5)}`}
              </span>
            </div>
          )}

          {visita.responsavel && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{visita.responsavel}</span>
            </div>
          )}

          {visita.endereco && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{visita.endereco}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {visita.telefone && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              className="flex-1"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              WhatsApp
            </Button>
          )}
          {visita.endereco && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMaps}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Maps
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          {getStatusBadge()}
        </div>
      </CardContent>
    </Card>
  );
}
