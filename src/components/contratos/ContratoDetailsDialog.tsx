import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Calendar,
  DollarSign,
  User,
  Edit,
  XCircle,
  CheckCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Contrato } from "@/hooks/useContratos";
import { ParcelasManager } from "./ParcelasManager";
import ArquivosList from "@/components/arquivos/ArquivosList";
import { Paperclip } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ContratoDetailsDialogProps {
  contrato: Contrato | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (contrato: Contrato) => void;
  onCancel?: (id: string) => void;
}

export function ContratoDetailsDialog({
  contrato,
  open,
  onOpenChange,
  onEdit,
  onCancel,
}: ContratoDetailsDialogProps) {
  if (!contrato) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-blue-500">Ativo</Badge>;
      case "concluido":
        return <Badge className="bg-green-500">Concluído</Badge>;
      case "cancelado":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const progressoPagamento = contrato.parcelas
    ? (contrato.parcelas.pagas / contrato.parcelas.total) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <DialogTitle className="text-2xl">
                  Contrato - {contrato.cliente?.nome}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Criado em{" "}
                  {format(parseISO(contrato.created_at), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
            {getStatusBadge(contrato.status)}
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Informações Principais */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Cliente</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <p className="font-medium">{contrato.cliente?.nome}</p>
                </div>
                {contrato.cliente?.telefone && (
                  <p className="text-sm text-muted-foreground">
                    {contrato.cliente.telefone}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">CPF/CNPJ</p>
                <p className="font-medium">{contrato.cpf_cnpj}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Forma de Pagamento
                </p>
                <p className="font-medium">{contrato.forma_pagamento}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Data de Início</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <p className="font-medium">
                    {format(parseISO(contrato.data_inicio), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>

              {contrato.proposta && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Proposta Origem
                  </p>
                  <p className="font-medium">
                    {contrato.proposta.tipo_piso} - {contrato.proposta.m2}{contrato.proposta.tipo_piso === "Rodapé Abaulado" ? "ml" : "m²"}
                  </p>
                </div>
              )}

              {contrato.observacoes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{contrato.observacoes}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Resumo Financeiro */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Resumo Financeiro
            </h3>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-1">
                  Valor Total
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(Number(contrato.valor_negociado))}
                </p>
              </div>

              <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950/20">
                <p className="text-sm text-muted-foreground mb-1">Total Pago</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(contrato.parcelas?.valor_pago || 0)}
                </p>
              </div>

              <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20">
                <p className="text-sm text-muted-foreground mb-1">
                  Saldo Restante
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(contrato.parcelas?.valor_restante || 0)}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-1">Parcelas</p>
                <p className="text-2xl font-bold">
                  {contrato.parcelas?.pagas || 0}/{contrato.parcelas?.total || 0}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{progressoPagamento.toFixed(0)}%</span>
              </div>
              <Progress value={progressoPagamento} className="h-2" />
            </div>
          </div>

          <Separator />

          {/* Gerenciador de Parcelas */}
          <ParcelasManager 
            contratoId={contrato.id} 
            valorNegociado={Number(contrato.valor_negociado)}
            margem_pct={contrato.margem_pct || 0}
            propostaInfo={contrato.proposta}
          />

          <Separator />

          {/* Seção de Arquivos */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-4">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Anexos do Contrato</h3>
            </div>
            <ArquivosList 
              entidade="contrato"
              entidadeId={contrato.id}
              showUpload={true}
              compact={false}
            />
          </div>

          <Separator />

          {/* Footer com Ações */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              {contrato.status === "ativo" && onEdit && (
                <Button variant="outline" onClick={() => onEdit(contrato)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Contrato
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {contrato.status === "ativo" && onCancel && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar Contrato
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar Contrato</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja cancelar este contrato? As parcelas
                        pendentes serão canceladas automaticamente. Esta ação não
                        pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onCancel(contrato.id)}>
                        Confirmar Cancelamento
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
