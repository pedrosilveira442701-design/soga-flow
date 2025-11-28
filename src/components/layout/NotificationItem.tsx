import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  AlertCircle,
  TrendingUp,
  FileText,
  Building,
  Trash2,
  CheckCircle,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import type { Notificacao } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";

interface NotificationItemProps {
  notification: Notificacao;
}

const iconMap: Record<string, any> = {
  Calendar,
  AlertCircle,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  FileText,
  Building,
};

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  const { markAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();

  const IconComponent = notification.icone && iconMap[notification.icone] 
    ? iconMap[notification.icone] 
    : AlertCircle;

  const handleView = () => {
    if (!notification.lida) {
      markAsRead(notification.id);
    }

    // Navigate based on entity type
    if (notification.entidade && notification.entidade_id) {
      switch (notification.entidade) {
        case "parcela":
          navigate("/financeiro");
          break;
        case "visita":
          navigate("/visitas");
          break;
        case "lead":
          navigate("/leads");
          break;
        case "proposta":
          navigate("/propostas");
          break;
        case "contrato":
          navigate("/contratos");
          break;
        case "obra":
          navigate("/obras");
          break;
        default:
          break;
      }
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(notification.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notification.id);
  };

  return (
    <div
      className={cn(
        "p-4 hover:bg-muted/50 transition-colors",
        !notification.lida && "bg-muted/30"
      )}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-1">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            notification.tipo === "financeiro" && "bg-green-100 text-green-600",
            notification.tipo === "visita" && "bg-blue-100 text-blue-600",
            notification.tipo === "visita_atrasada" && "bg-red-100 text-red-600",
            notification.tipo === "lead" && "bg-purple-100 text-purple-600",
            notification.tipo === "proposta" && "bg-orange-100 text-orange-600",
            notification.tipo === "contrato" && "bg-teal-100 text-teal-600",
            notification.tipo === "obra" && "bg-amber-100 text-amber-600"
          )}>
            <IconComponent className="h-4 w-4" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium",
                !notification.lida && "font-semibold"
              )}>
                {notification.titulo}
              </p>
              {notification.descricao && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {notification.descricao}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {format(new Date(notification.agendamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>

            {!notification.lida && (
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
            )}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleView}
              className="h-7 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver
            </Button>
            
            {!notification.lida && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAsRead}
                className="h-7 text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Marcar como lida
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-7 text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Excluir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
