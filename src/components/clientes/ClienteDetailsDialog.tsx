import { Cliente } from "@/hooks/useClientes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  MessageCircle,
  FileText,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface ClienteDetailsDialogProps {
  cliente: Cliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (cliente: Cliente) => void;
  onDelete: (id: string) => void;
}

export function ClienteDetailsDialog({
  cliente,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ClienteDetailsDialogProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { user } = useAuth();

  // Buscar contratos do cliente
  const { data: contratos = [], isLoading: isLoadingContratos } = useQuery({
    queryKey: ["contratos-cliente", cliente?.id],
    queryFn: async () => {
      if (!cliente?.id || !user) return [];

      const { data, error } = await supabase
        .from("contratos")
        .select(`
          *,
          parcelas:financeiro_parcelas(
            id,
            numero_parcela,
            valor_liquido_parcela,
            vencimento,
            status,
            data_pagamento
          )
        `)
        .eq("cliente_id", cliente.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!cliente?.id && !!user && open,
  });

  if (!cliente) return null;

  const handleWhatsApp = () => {
    if (cliente.telefone) {
      const phone = cliente.telefone.replace(/\D/g, "");
      window.open(`https://wa.me/55${phone}`, "_blank");
    }
  };

  const handleDelete = () => {
    onDelete(cliente.id);
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  const handleViewContrato = (contratoId: string) => {
    window.location.href = `/contratos?id=${contratoId}`;
  };

  const propostasCount = cliente.propostas?.[0]?.count || 0;
  const leadsCount = cliente.leads?.[0]?.count || 0;

  // Calcular resumo financeiro dos contratos
  const resumoFinanceiro = contratos.reduce(
    (acc, contrato) => {
      const totalContrato = Number(contrato.valor_negociado);
      const parcelas = contrato.parcelas || [];
      const valorPago = parcelas
        .filter((p: any) => p.status === "pago")
        .reduce((sum: number, p: any) => sum + Number(p.valor_liquido_parcela), 0);
      const valorPendente = parcelas
        .filter((p: any) => p.status === "pendente")
        .reduce((sum: number, p: any) => sum + Number(p.valor_liquido_parcela), 0);

      return {
        totalContratado: acc.totalContratado + totalContrato,
        totalPago: acc.totalPago + valorPago,
        totalPendente: acc.totalPendente + valorPendente,
        contratos: acc.contratos + 1,
      };
    },
    { totalContratado: 0, totalPago: 0, totalPendente: 0, contratos: 0 }
  );

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2">
                  {cliente.nome}
                </DialogTitle>
                <Badge variant={cliente.status === "ativo" ? "default" : "secondary"}>
                  {cliente.status === "ativo" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="info" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="contratos">
                Contratos ({contratos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
            {/* Informações de Contato */}
            <div className="space-y-3">
              {cliente.contato && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{cliente.contato}</span>
                </div>
              )}
              {cliente.telefone && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">{cliente.telefone}</span>
                </div>
              )}
              {(cliente.endereco || cliente.cidade || cliente.bairro) && (
                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <div className="text-sm">
                    {cliente.endereco && <div>{cliente.endereco}</div>}
                    {(cliente.bairro || cliente.cidade) && (
                      <div>
                        {cliente.bairro && `${cliente.bairro}, `}
                        {cliente.cidade}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {cliente.cpf_cnpj && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">CPF/CNPJ: {cliente.cpf_cnpj}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Estatísticas</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                  <FileText className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-2xl font-bold">{propostasCount}</span>
                  <span className="text-xs text-muted-foreground">Propostas</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                  <Users className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-2xl font-bold">{leadsCount}</span>
                  <span className="text-xs text-muted-foreground">Leads</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs font-medium mt-1">Cliente desde</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(cliente.created_at), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="text-sm">Cliente criado</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(cliente.created_at), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                {cliente.updated_at !== cliente.created_at && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground mt-2" />
                    <div className="flex-1">
                      <p className="text-sm">Última atualização</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(cliente.updated_at), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => {
                      onEdit(cliente);
                      onOpenChange(false);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => setDeleteDialogOpen(true)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar
                  </Button>
                  {cliente.telefone && (
                    <Button onClick={handleWhatsApp} className="flex-1">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="contratos">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {isLoadingContratos ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-64" />
                  </div>
                ) : contratos.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Nenhum contrato encontrado
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Este cliente ainda não possui contratos
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Resumo Financeiro */}
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium text-muted-foreground">
                            Total Contratos
                          </p>
                        </div>
                        <p className="text-2xl font-bold">
                          {resumoFinanceiro.contratos}
                        </p>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium text-muted-foreground">
                            Total Contratado
                          </p>
                        </div>
                        <p className="text-2xl font-bold">
                          {formatCurrency(resumoFinanceiro.totalContratado)}
                        </p>
                      </div>

                      <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950/20">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <p className="text-sm font-medium text-muted-foreground">
                            Total Pago
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(resumoFinanceiro.totalPago)}
                        </p>
                      </div>

                      <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <p className="text-sm font-medium text-muted-foreground">
                            A Receber
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(resumoFinanceiro.totalPendente)}
                        </p>
                      </div>
                    </div>

                    {/* Lista de Contratos */}
                    <div>
                      <h3 className="font-semibold mb-4">Histórico de Contratos</h3>
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Forma Pagamento</TableHead>
                              <TableHead>Parcelas</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {contratos.map((contrato: any) => {
                              const parcelas = contrato.parcelas || [];
                              const parcelasPagas = parcelas.filter(
                                (p: any) => p.status === "pago"
                              ).length;
                              const progressoParcelas = parcelas.length > 0
                                ? (parcelasPagas / parcelas.length) * 100
                                : 0;

                              return (
                                <TableRow key={contrato.id}>
                                  <TableCell>
                                    {format(
                                      parseISO(contrato.data_inicio),
                                      "dd/MM/yyyy",
                                      { locale: ptBR }
                                    )}
                                  </TableCell>
                                  <TableCell className="font-semibold">
                                    {formatCurrency(Number(contrato.valor_negociado))}
                                  </TableCell>
                                  <TableCell>{contrato.forma_pagamento}</TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-sm">
                                        <span>
                                          {parcelasPagas}/{parcelas.length}
                                        </span>
                                      </div>
                                      <Progress
                                        value={progressoParcelas}
                                        className="h-1.5"
                                      />
                                    </div>
                                  </TableCell>
                                  <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleViewContrato(contrato.id)}
                                      title="Ver detalhes"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{cliente.nome}"? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
