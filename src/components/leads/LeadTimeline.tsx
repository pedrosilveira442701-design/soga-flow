import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Phone, Mail, MessageSquare, Users, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Interacao {
  id: string;
  tipo_interacao: string;
  data_hora: string;
  observacao: string | null;
  automatica?: boolean;
}

interface LeadTimelineProps {
  interacoes: Interacao[];
  onDelete: (id: string) => void;
}

const TIPO_ICONS: Record<string, any> = {
  "Ligação": Phone,
  "Email": Mail,
  "WhatsApp": MessageSquare,
  "Reunião": Users,
  "Visita": Calendar,
  "Criação": Clock,
  "Mudança de Estágio": Clock,
};

const TIPO_COLORS: Record<string, string> = {
  "Ligação": "bg-blue-500",
  "Email": "bg-purple-500",
  "WhatsApp": "bg-green-500",
  "Reunião": "bg-orange-500",
  "Visita": "bg-pink-500",
  "Criação": "bg-gray-500",
  "Mudança de Estágio": "bg-indigo-500",
};

export function LeadTimeline({ interacoes, onDelete }: LeadTimelineProps) {
  if (interacoes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhuma interação registrada ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {interacoes.map((interacao, index) => {
        const Icon = TIPO_ICONS[interacao.tipo_interacao] || Clock;
        const color = TIPO_COLORS[interacao.tipo_interacao] || "bg-gray-500";
        
        return (
          <div key={interacao.id} className="relative pl-8 pb-4">
            {/* Timeline line */}
            {index < interacoes.length - 1 && (
              <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-border" />
            )}
            
            {/* Timeline dot */}
            <div className={`absolute left-0 top-1 w-6 h-6 rounded-full ${color} flex items-center justify-center`}>
              <Icon className="w-3 h-3 text-white" />
            </div>

            {/* Content */}
            <div className={`rounded-lg p-4 space-y-2 ${interacao.automatica ? 'bg-muted/20 border border-border/30' : 'bg-muted/30'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={interacao.automatica ? "outline" : "secondary"} className="text-xs">
                      {interacao.tipo_interacao}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(interacao.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {interacao.observacao && (
                    <p className={`text-sm whitespace-pre-wrap ${interacao.automatica ? 'text-muted-foreground italic' : ''}`}>
                      {interacao.observacao}
                    </p>
                  )}
                </div>
                
                {!interacao.automatica && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir esta interação? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(interacao.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
