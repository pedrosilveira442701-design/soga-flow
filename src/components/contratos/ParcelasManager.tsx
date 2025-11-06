import { useState } from "react";
import { useParcelas } from "@/hooks/useParcelas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Plus,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParcelasManagerProps {
  contratoId: string;
  valorNegociado: number;
  propostaInfo?: {
    m2: number;
    custo_m2?: number;
    servicos?: Array<{ descricao: string; valor: number }>;
    margem_pct?: number;
  };
}

export function ParcelasManager({ contratoId, valorNegociado, propostaInfo }: ParcelasManagerProps) {
  const { parcelas, isLoading, marcarComoPago, deleteParcela, addParcela, updateParcela } =
    useParcelas(contratoId);
  
  // Margem da proposta
  const margemPct = propostaInfo?.margem_pct || 0;
  
  // Calcular valor da margem por parcela
  const calcularMargemPorParcela = (valorParcela: number) => {
    return (valorParcela * margemPct) / 100;
  };
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [novaParcelaValor, setNovaParcelaValor] = useState("");
  const [novaParcelaVencimento, setNovaParcelaVencimento] = useState<Date>();
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editParcelaId, setEditParcelaId] = useState<string | null>(null);
  const [editParcelaValor, setEditParcelaValor] = useState("");
  const [editParcelaVencimento, setEditParcelaVencimento] = useState<Date>();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string, vencimento: string) => {
    const isVencida = isPast(parseISO(vencimento)) && status === "pendente";
    
    if (isVencida) {
      return <Badge variant="destructive">Vencida</Badge>;
    }
    
    switch (status) {
      case "pago":
        return <Badge className="bg-green-500">Paga</Badge>;
      case "pendente":
        return <Badge variant="secondary">Pendente</Badge>;
      case "cancelado":
        return <Badge variant="outline">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleMarcarComoPago = async (parcelaId: string) => {
    await marcarComoPago(parcelaId);
  };

  const handleAddParcela = async () => {
    if (!novaParcelaVencimento || !novaParcelaValor) return;

    await addParcela({
      valor: parseFloat(novaParcelaValor),
      vencimento: novaParcelaVencimento.toISOString().split("T")[0],
    });

    setShowAddDialog(false);
    setNovaParcelaValor("");
    setNovaParcelaVencimento(undefined);
  };

  const handleOpenEditDialog = (parcela: any) => {
    setEditParcelaId(parcela.id);
    setEditParcelaValor(parcela.valor_liquido_parcela.toString());
    setEditParcelaVencimento(parseISO(parcela.vencimento));
    setShowEditDialog(true);
  };

  const handleEditParcela = async () => {
    if (!editParcelaId || !editParcelaVencimento || !editParcelaValor) return;

    await updateParcela({
      id: editParcelaId,
      data: {
        valor_liquido_parcela: parseFloat(editParcelaValor),
        vencimento: editParcelaVencimento.toISOString().split("T")[0],
      },
    });

    setShowEditDialog(false);
    setEditParcelaId(null);
    setEditParcelaValor("");
    setEditParcelaVencimento(undefined);
  };

  const totais = {
    total: parcelas.reduce((sum, p) => sum + Number(p.valor_liquido_parcela), 0),
    pago: parcelas
      .filter((p) => p.status === "pago")
      .reduce((sum, p) => sum + Number(p.valor_liquido_parcela), 0),
    pendente: parcelas
      .filter((p) => p.status === "pendente")
      .reduce((sum, p) => sum + Number(p.valor_liquido_parcela), 0),
    vencidas: parcelas.filter(
      (p) => p.status === "pendente" && isPast(parseISO(p.vencimento))
    ).length,
    margemTotal: parcelas.reduce((sum, p) => {
      const valorParcela = Number(p.valor_liquido_parcela);
      return sum + calcularMargemPorParcela(valorParcela);
    }, 0),
    margemPendente: parcelas
      .filter((p) => p.status === "pendente")
      .reduce((sum, p) => {
        const valorParcela = Number(p.valor_liquido_parcela);
        return sum + calcularMargemPorParcela(valorParcela);
      }, 0),
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando parcelas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Parcelas do Contrato</h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Parcela
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Nova Parcela</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={novaParcelaValor}
                  onChange={(e) => setNovaParcelaValor(e.target.value)}
                />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !novaParcelaVencimento && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {novaParcelaVencimento ? (
                        format(novaParcelaVencimento, "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={novaParcelaVencimento}
                      onSelect={setNovaParcelaVencimento}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={handleAddParcela} className="w-full">
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alertas */}
      {totais.vencidas > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">
              {totais.vencidas} parcela{totais.vencidas > 1 ? "s" : ""} vencida
              {totais.vencidas > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              Verifique os pagamentos em atraso
            </p>
          </div>
        </div>
      )}

      {/* Tabela de Parcelas */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Margem (%)</TableHead>
              <TableHead>Valor da Margem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Pagamento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {parcelas.map((parcela) => {
              const isVencida =
                isPast(parseISO(parcela.vencimento)) &&
                parcela.status === "pendente";
              
              const valorParcela = Number(parcela.valor_liquido_parcela);
              const margemParcela = calcularMargemPorParcela(valorParcela);

              return (
                <TableRow
                  key={parcela.id}
                  className={cn(isVencida && "bg-destructive/5")}
                >
                  <TableCell className="font-medium">
                    {parcela.numero_parcela}ª
                  </TableCell>
                  <TableCell>
                    {format(parseISO(parcela.vencimento), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(valorParcela)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {margemPct.toFixed(2)}%
                  </TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {formatCurrency(margemParcela)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(parcela.status, parcela.vencimento)}
                  </TableCell>
                  <TableCell>
                    {parcela.data_pagamento
                      ? format(parseISO(parcela.data_pagamento), "dd/MM/yyyy", {
                          locale: ptBR,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {parcela.status === "pendente" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditDialog(parcela)}
                            title="Editar parcela"
                            className="h-9 px-3"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarcarComoPago(parcela.id)}
                            title="Marcar como paga"
                            className="h-9 px-3 border-green-500 text-green-600 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Pagar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                title="Excluir parcela"
                                className="h-9 px-3 border-destructive text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Parcela</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta parcela? Esta
                                  ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteParcela(parcela.id)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Footer com Totalizações */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 rounded-lg border bg-muted/50">
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-lg font-semibold">{formatCurrency(totais.total)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total da Margem</p>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(totais.margemTotal)}
          </p>
        </div>
        <div className="col-span-2 md:col-span-1 rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-primary">Líquido a Receber</p>
          </div>
          <p className="text-xl font-bold text-primary">
            {formatCurrency(totais.margemPendente)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Pago</p>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(totais.pago)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Pendente</p>
          <p className="text-lg font-semibold text-blue-600">
            {formatCurrency(totais.pendente)}
          </p>
        </div>
      </div>

      {/* Dialog de Editar Parcela */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Parcela</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={editParcelaValor}
                onChange={(e) => setEditParcelaValor(e.target.value)}
              />
            </div>
            <div>
              <Label>Vencimento *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editParcelaVencimento && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editParcelaVencimento ? (
                      format(editParcelaVencimento, "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editParcelaVencimento}
                    onSelect={setEditParcelaVencimento}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={handleEditParcela} className="flex-1">
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
