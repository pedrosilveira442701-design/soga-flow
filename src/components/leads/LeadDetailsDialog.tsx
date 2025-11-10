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
  Calendar as CalendarIcon,
  TrendingUp,
  Clock,
  MessageSquare,
  Plus,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";
import { VisitaForm } from "@/components/forms/VisitaForm";
import { useVisitas } from "@/hooks/useVisitas";
import { useLeadInteracoes } from "@/hooks/useLeadInteracoes";
import { LeadTimeline } from "./LeadTimeline";
import { LeadTimelineForm } from "./LeadTimelineForm";
import { toast } from "sonner";

type Lead = Database["public"]["Tables"]["leads"]["Row"] & {
  clientes?: {
    nome: string;
    telefone?: string;
    endereco?: string;
  } | null;
  produtos?: Array<{
    tipo: string;
    medida: number | null;
  }>;
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
  const [visitaDialogOpen, setVisitaDialogOpen] = useState(false);
  const [showTimelineForm, setShowTimelineForm] = useState(false);
  const { createVisita } = useVisitas();
  const { interacoes, isLoading: isLoadingInteracoes, createInteracao, deleteInteracao } = useLeadInteracoes(lead?.id);

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

  const handleAgendarVisita = (data: any) => {
    createVisita.mutate(data, {
      onSuccess: () => {
        setVisitaDialogOpen(false);
        toast.success('Visita agendada com sucesso!');
      },
    });
  };

  const getInitialVisitaData = () => {
    if (!lead.cliente_id) return {};
    
    // Sugerir tipo de visita baseado no estágio do lead
    let tipoSugerido = 'orcamento';
    if (lead.estagio === 'contato' || lead.estagio === 'visita_agendada') {
      tipoSugerido = 'medicao';
    } else if (lead.estagio === 'proposta' || lead.estagio === 'contrato') {
      tipoSugerido = 'orcamento';
    }

    return {
      cliente_id: lead.cliente_id,
      marcacao_tipo: tipoSugerido,
      assunto: `Visita - ${lead.tipo_piso || 'Lead'}`,
      responsavel: lead.responsavel || '',
    };
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

              <div className="space-y-1 col-span-2">
                <div className="flex items-center gap-2 text-caption text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>Serviços</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    // Processar produtos do campo JSONB
                    const produtos = lead.produtos;
                    
                    if (produtos && Array.isArray(produtos) && produtos.length > 0) {
                      return produtos.map((produto, index) => {
                        // Formatar "Outro: descrição" como "Outro — descrição"
                        let displayTipo = produto.tipo;
                        if (produto.tipo?.startsWith("Outro:")) {
                          displayTipo = produto.tipo.replace("Outro:", "Outro —");
                        }
                        
                        return (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-caption font-normal"
                            title={displayTipo}
                          >
                            {displayTipo}
                          </Badge>
                        );
                      });
                    }
                    
                    // Fallback para dados legados (tipo_piso)
                    if (lead.tipo_piso) {
                      const tipos = lead.tipo_piso.split(",").map(t => t.trim());
                      return tipos.map((tipo, index) => {
                        // Formatar "Outro: descrição" como "Outro — descrição"
                        let displayTipo = tipo;
                        if (tipo?.startsWith("Outro:")) {
                          displayTipo = tipo.replace("Outro:", "Outro —");
                        }
                        
                        return (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-caption font-normal"
                            title={displayTipo}
                          >
                            {displayTipo}
                          </Badge>
                        );
                      });
                    }
                    
                    // Sem dados
                    return <span className="text-body text-muted-foreground">—</span>;
                  })()}
                </div>
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

            {/* Timeline de Interações */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-body font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline de Interações
                </h4>
                {!showTimelineForm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTimelineForm(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nova Interação
                  </Button>
                )}
              </div>

              {showTimelineForm && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <LeadTimelineForm
                    leadId={lead.id}
                    onSubmit={(data) => {
                      createInteracao.mutate(data as any, {
                        onSuccess: () => {
                          setShowTimelineForm(false);
                        },
                      });
                    }}
                    onCancel={() => setShowTimelineForm(false)}
                    isLoading={createInteracao.isPending}
                  />
                </div>
              )}

              {isLoadingInteracoes ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50 animate-pulse" />
                  <p>Carregando interações...</p>
                </div>
              ) : (
                <LeadTimeline
                  interacoes={interacoes}
                  onDelete={(id) => deleteInteracao.mutate(id)}
                />
              )}
            </motion.div>

            <Separator />

            {/* Ações Rápidas */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3"
            >
              {lead.cliente_id && (
                <Button
                  onClick={() => setVisitaDialogOpen(true)}
                  className="flex-1 gap-2"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Agendar Visita
                </Button>
              )}
              {lead.clientes?.telefone && (
                <Button
                  onClick={handleWhatsApp}
                  className="flex-1 gap-2"
                  variant={lead.cliente_id ? "outline" : "default"}
                >
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

      {/* Agendar Visita Dialog */}
      <Dialog open={visitaDialogOpen} onOpenChange={setVisitaDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agendar Visita</DialogTitle>
            <DialogDescription>
              Agende uma visita para o lead {lead?.clientes?.nome}
            </DialogDescription>
          </DialogHeader>
          <VisitaForm
            visita={getInitialVisitaData() as any}
            onSubmit={handleAgendarVisita}
            isLoading={createVisita.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
