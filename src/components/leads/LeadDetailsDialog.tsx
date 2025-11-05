import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pencil,
  Trash2,
  Phone,
  MapPin,
  DollarSign,
  User,
  Calendar,
  TrendingUp,
  Clock,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"] & {
  clientes?: {
    nome: string;
    telefone?: string;
    endereco?: string;
  } | null;
};

interface LeadDetailsDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
}

const STAGE_LABELS: Record<string, string> = {
  novo: "Novo",
  contato: "Contato",
  negociacao: "Negociação",
  proposta_enviada: "Proposta Enviada",
  fechado_ganho: "Fechado Ganho",
  perdido: "Perdido",
};

const STAGE_COLORS: Record<string, string> = {
  novo: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  contato: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  negociacao: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  proposta_enviada: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  fechado_ganho: "bg-green-500/10 text-green-700 border-green-500/20",
  perdido: "bg-red-500/10 text-red-700 border-red-500/20",
};

export function LeadDetailsDialog({
  lead,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: LeadDetailsDialogProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!lead) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleDelete = () => {
    onDelete(lead.id);
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  const handleWhatsApp = () => {
    if (lead.clientes?.telefone) {
      window.open(
        `https://wa.me/${lead.clientes.telefone.replace(/\D/g, "")}`,
        "_blank"
      );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-h3 mb-2">
                  {lead.clientes?.nome || "Lead sem cliente"}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={STAGE_COLORS[lead.estagio] || ""}
                  >
                    {STAGE_LABELS[lead.estagio] || lead.estagio}
                  </Badge>
                  {lead.origem && (
                    <span className="text-caption text-muted-foreground">
                      • Origem: {lead.origem}
                    </span>
                  )}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onEdit(lead)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Informações Principais */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-caption text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Valor Potencial</span>
                </div>
                <p className="text-body font-semibold text-primary">
                  {formatCurrency(Number(lead.valor_potencial) || 0)}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-caption text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>Tipo de Piso</span>
                </div>
                <p className="text-body font-medium">
                  {lead.tipo_piso || "Não especificado"}
                </p>
              </div>

              {lead.responsavel && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-caption text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Responsável</span>
                  </div>
                  <p className="text-body font-medium">{lead.responsavel}</p>
                </div>
              )}

              {lead.clientes?.telefone && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-caption text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>Telefone</span>
                  </div>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-body font-medium"
                    onClick={handleWhatsApp}
                  >
                    {lead.clientes.telefone}
                  </Button>
                </div>
              )}

              {lead.clientes?.endereco && (
                <div className="space-y-1 col-span-2">
                  <div className="flex items-center gap-2 text-caption text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Endereço</span>
                  </div>
                  <p className="text-body">{lead.clientes.endereco}</p>
                </div>
              )}
            </motion.div>

            <Separator />

            {/* Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h4 className="text-body font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </h4>

              <div className="space-y-3 pl-4 border-l-2 border-border">
                {lead.ultima_interacao && (
                  <div className="relative pl-4">
                    <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-primary border-2 border-background" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        <span className="text-caption font-medium">
                          Última Interação
                        </span>
                      </div>
                      <p className="text-caption text-muted-foreground">
                        {format(
                          new Date(lead.ultima_interacao),
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR }
                        )}
                        {" • "}
                        {formatDistanceToNow(new Date(lead.ultima_interacao), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                )}

                <div className="relative pl-4">
                  <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-muted border-2 border-background" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-caption font-medium">
                        Lead Criado
                      </span>
                    </div>
                    <p className="text-caption text-muted-foreground">
                      {format(
                        new Date(lead.created_at),
                        "dd/MM/yyyy 'às' HH:mm",
                        { locale: ptBR }
                      )}
                      {" • "}
                      {formatDistanceToNow(new Date(lead.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <Separator />

            {/* Ações Rápidas */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-3"
            >
              {lead.clientes?.telefone && (
                <Button onClick={handleWhatsApp} className="flex-1 gap-2">
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => onEdit(lead)}
                className="flex-1 gap-2"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lead? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
