import { useState, useEffect } from "react";
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
import { useContratos } from "@/hooks/useContratos";
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
  FileCheck,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ProposalForm from "@/components/forms/ProposalForm";
import { ContratoForm } from "@/components/forms/ContratoForm";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import ArquivosList from "@/components/arquivos/ArquivosList";
import { Paperclip } from "lucide-react";

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
  const [showContratoDialog, setShowContratoDialog] = useState(false);
  const { updateStatus, deleteProposta, updateProposta } = usePropostas();
  const { createContrato } = useContratos();

  // Verificar se a proposta já tem contrato
  const { data: contratoExistente, refetch: refetchContrato } = useQuery({
    queryKey: ["contrato-proposta", proposta?.id],
    queryFn: async () => {
      if (!proposta?.id) return null;
      
      const { data, error } = await supabase
        .from("contratos")
        .select("id, status")
        .eq("proposta_id", proposta.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!proposta?.id && open,
  });

  useEffect(() => {
    if (open && proposta?.id) {
      refetchContrato();
    }
  }, [open, proposta?.id, refetchContrato]);

  if (!proposta) return null;

  // Calcular totais a partir dos serviços
  const servicos = proposta.servicos && Array.isArray(proposta.servicos) && proposta.servicos.length > 0
    ? proposta.servicos
    : [{ tipo: proposta.tipo_piso, m2: proposta.m2, valor_m2: proposta.valor_m2, custo_m2: proposta.custo_m2 }];

  const totalM2 = servicos.reduce((acc: number, s: any) => acc + (s.m2 || 0), 0);
  const totalBruto = servicos.reduce((acc: number, s: any) => acc + ((s.m2 || 0) * (s.valor_m2 || 0)), 0);
  const totalCusto = servicos.reduce((acc: number, s: any) => acc + ((s.m2 || 0) * (s.custo_m2 || 0)), 0);
  const liquido = totalBruto - totalCusto;
  const margem = totalBruto > 0 ? (liquido / totalBruto) * 100 : 0;

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

  const handleCreateContrato = async (data: any) => {
    await createContrato(data);
    setShowContratoDialog(false);
    onOpenChange(false);
  };

  const handleViewContrato = () => {
    if (contratoExistente?.id) {
      // Navegar para a página de contratos e abrir o contrato específico
      window.location.href = `/contratos?id=${contratoExistente.id}`;
    }
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

            {/* Serviços */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Serviços</h3>
              {servicos.map((servico: any, index: number) => (
                <div key={index} className="rounded-lg border p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Tipo</div>
                      <div className="font-medium">
                        {servico.tipo === "Outro" && servico.tipo_outro 
                          ? servico.tipo_outro 
                          : servico.tipo}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Área</div>
                      <div className="font-medium">{(servico.m2 || 0).toFixed(2)} m²</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Preço/m²</div>
                      <div className="font-medium">{formatCurrency(servico.valor_m2 || 0)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Custo/m²</div>
                      <div className="font-medium">{formatCurrency(servico.custo_m2 || 0)}</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Subtotal</span>
                    <span className="font-bold text-lg">
                      {formatCurrency((servico.m2 || 0) * (servico.valor_m2 || 0))}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Ação de Contrato */}
            {proposta.status === "fechada" && (
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                {contratoExistente ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileCheck className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">Contrato Gerado</p>
                        <p className="text-sm text-muted-foreground">
                          Esta proposta já possui um contrato associado
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleViewContrato} variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Contrato
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">Proposta Fechada</p>
                        <p className="text-sm text-muted-foreground">
                          Gere um contrato para formalizar esta venda
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => setShowContratoDialog(true)}>
                      <FileCheck className="h-4 w-4 mr-2" />
                      Gerar Contrato
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Resumo Financeiro */}
            <div className="rounded-lg bg-muted/50 p-6 space-y-4">
              <h3 className="font-semibold text-lg mb-4">Resumo Financeiro</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Área Total</div>
                  <div className="text-xl font-semibold">
                    {totalM2.toFixed(2)} m²
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Bruto</div>
                  <div className="text-xl font-semibold text-primary">
                    {formatCurrency(totalBruto)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Custo</div>
                  <div className="text-xl font-semibold text-muted-foreground">
                    {formatCurrency(totalCusto)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valor Líquido
                  </div>
                  <div className="text-3xl font-bold text-success">
                    {formatCurrency(liquido)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground mb-1">Margem</div>
                  <div className={`text-3xl font-bold ${getMargemColor(margem)}`}>
                    {margem.toFixed(1)}%
                  </div>
                  {margem < 20 && (
                    <div className="text-xs text-destructive mt-1">
                      ⚠️ Atenção: margem abaixo do recomendado
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Seção de Arquivos */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Paperclip className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Anexos da Proposta</h3>
              </div>
              <ArquivosList 
                entidade="proposta"
                entidadeId={proposta.id}
                showUpload={true}
                compact={false}
              />
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
              servicos: servicos.map((s: any) => ({
                tipo: s.tipo || "",
                tipo_outro: s.tipo_outro || "",
                m2: s.m2 || 0,
                valor_m2: s.valor_m2 || 0,
                custo_m2: s.custo_m2 || 0,
              })),
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

      {/* Gerar Contrato Dialog */}
      <Dialog open={showContratoDialog} onOpenChange={setShowContratoDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar Contrato da Proposta</DialogTitle>
          </DialogHeader>
          <ContratoForm
            onSubmit={handleCreateContrato}
            initialData={{
              cliente_id: proposta.cliente_id,
              proposta_id: proposta.id,
              valor_negociado: Number(liquido),
              cpf_cnpj: "",
              forma_pagamento: "",
              data_inicio: new Date().toISOString().split("T")[0],
              numero_parcelas: 1,
              dia_vencimento: 10,
              observacoes: `Contrato gerado a partir da proposta - ${totalM2.toFixed(2)}m²`,
            }}
            mode="fromProposta"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
