import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Proposta, usePropostas } from "@/hooks/usePropostas";
import { 
  User, 
  Calendar, 
  Square, 
  DollarSign, 
  TrendingDown, 
  TrendingUp,
  Edit,
  Trash2,
  MoreVertical,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ProposalForm from "@/components/forms/ProposalForm";

interface PropostaDetailsDialogProps {
  proposta: Proposta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PropostaDetailsDialog({
  proposta,
  open,
  onOpenChange,
}: PropostaDetailsDialogProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { updateStatus, deleteProposta, updateProposta } = usePropostas();

  if (!proposta) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      aberta: { label: "Aberta", variant: "default" },
      fechada: { label: "Fechada", variant: "secondary" },
      perdida: { label: "Perdida", variant: "destructive" },
    };
    const config = statusMap[status] || statusMap.aberta;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getMargemColor = (margem: number) => {
    if (margem < 20) return "text-destructive";
    if (margem < 35) return "text-yellow-600";
    return "text-success";
  };

  const handleDelete = async () => {
    await deleteProposta.mutateAsync(proposta.id);
    setShowDeleteDialog(false);
    onOpenChange(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    await updateStatus.mutateAsync({ id: proposta.id, status: newStatus });
  };

  const handleEdit = async (data: any) => {
    await updateProposta.mutateAsync({ ...data, id: proposta.id });
    setShowEditDialog(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes da Proposta</span>
              <div className="flex items-center gap-2">
                {getStatusBadge(proposta.status)}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    {proposta.status === "aberta" && (
                      <>
                        <DropdownMenuItem onClick={() => handleStatusChange("fechada")}>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Marcar como Fechada
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange("perdida")}>
                          <TrendingDown className="h-4 w-4 mr-2" />
                          Marcar como Perdida
                        </DropdownMenuItem>
                      </>
                    )}
                    {proposta.status !== "aberta" && (
                      <DropdownMenuItem onClick={() => handleStatusChange("aberta")}>
                        <FileText className="h-4 w-4 mr-2" />
                        Reabrir Proposta
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informações Principais */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Cliente</div>
                  <div className="font-medium">{proposta.clientes?.nome}</div>
                  {proposta.clientes?.cidade && (
                    <div className="text-xs text-muted-foreground">{proposta.clientes.cidade}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Data</div>
                  <div className="font-medium">
                    {format(new Date(proposta.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Tipo de Piso</div>
                <div className="font-medium">{proposta.tipo_piso}</div>
              </div>
            </div>

            {/* Medições e Valores */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground mb-1">Área</div>
                <div className="text-2xl font-bold">{proposta.m2.toFixed(2)} m²</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground mb-1">Preço/m²</div>
                <div className="text-2xl font-bold">{formatCurrency(proposta.valor_m2)}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground mb-1">Custo/m²</div>
                <div className="text-2xl font-bold">{formatCurrency(proposta.custo_m2)}</div>
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="rounded-lg bg-muted/50 p-6 space-y-4">
              <h3 className="font-semibold text-lg mb-4">Resumo Financeiro</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Bruto</div>
                  <div className="text-xl font-semibold text-primary">
                    {formatCurrency(proposta.valor_total)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Custo</div>
                  <div className="text-xl font-semibold text-muted-foreground">
                    {formatCurrency(proposta.m2 * proposta.custo_m2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valor Líquido
                  </div>
                  <div className="text-3xl font-bold text-success">
                    {formatCurrency(proposta.liquido)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Margem</div>
                  <div className={`text-3xl font-bold ${getMargemColor(proposta.margem_pct)}`}>
                    {proposta.margem_pct.toFixed(1)}%
                  </div>
                  {proposta.margem_pct < 20 && (
                    <div className="text-xs text-destructive mt-1">
                      ⚠️ Atenção: margem abaixo do recomendado
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Proposta</DialogTitle>
          </DialogHeader>
          <ProposalForm
            onSubmit={handleEdit}
            initialData={{
              cliente_id: proposta.cliente_id,
              m2: proposta.m2,
              valor_m2: proposta.valor_m2,
              custo_m2: proposta.custo_m2,
              tipo_piso: proposta.tipo_piso,
              data: proposta.data,
              status: proposta.status,
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
