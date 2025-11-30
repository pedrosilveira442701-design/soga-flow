import { useState, useEffect } from "react";
import { useParcelas } from "@/hooks/useParcelas";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Edit, Trash2, Plus, AlertCircle, TrendingUp, Percent } from "lucide-react";
import { MarcarPagoDialog } from "@/components/financeiro/MarcarPagoDialog";
import { format, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParcelasManagerProps {
  contratoId: string;
  valorNegociado: number;
  margem_pct: number;
  propostaInfo?: {
    m2: number;
    custo_m2?: number;
    servicos?: Array<{ descricao: string; valor: number }>;
  };
}

export function ParcelasManager({ contratoId, valorNegociado, margem_pct, propostaInfo }: ParcelasManagerProps) {
  const queryClient = useQueryClient();
  const { parcelas, isLoading, marcarComoPago, deleteParcela, addParcela, updateParcela } = useParcelas(contratoId);

  // Estado local para margem editável
  const [margemPct, setMargemPct] = useState(margem_pct || 0);
  const [isEditingMargem, setIsEditingMargem] = useState(false);
  const [margemInput, setMargemInput] = useState(String(margem_pct || 0));

  // Sincronizar estado quando margem_pct mudar
  useEffect(() => {
    setMargemPct(margem_pct || 0);
    setMargemInput(String(margem_pct || 0));
  }, [margem_pct]);

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

  const [showPagarDialog, setShowPagarDialog] = useState(false);
  const [parcelaParaPagar, setParcelaParaPagar] = useState<string | null>(null);

  const [showEditPagaDialog, setShowEditPagaDialog] = useState(false);
  const [editPagaParcelaId, setEditPagaParcelaId] = useState<string | null>(null);
  const [editPagaData, setEditPagaData] = useState<Date>();
  const [editPagaForma, setEditPagaForma] = useState("");

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

  const handleMarcarComoPago = async (dataPagamento: string, forma: string) => {
    if (!parcelaParaPagar) return;
    await marcarComoPago({ id: parcelaParaPagar, dataPagamento, forma });
    setParcelaParaPagar(null);
  };

  const handleOpenPagarDialog = (parcelaId: string) => {
    setParcelaParaPagar(parcelaId);
    setShowPagarDialog(true);
  };

  const handleOpenEditPagaDialog = (parcela: any) => {
    setEditPagaParcelaId(parcela.id);
    setEditPagaData(parcela.data_pagamento ? parseISO(parcela.data_pagamento) : new Date());
    setEditPagaForma(parcela.forma || "");
    setShowEditPagaDialog(true);
  };

  const handleEditParcePaga = async () => {
    if (!editPagaParcelaId || !editPagaData) return;

    await updateParcela({
      id: editPagaParcelaId,
      data: {
        data_pagamento: editPagaData.toISOString().split("T")[0],
        forma: editPagaForma,
      },
    });

    setShowEditPagaDialog(false);
    setEditPagaParcelaId(null);
    setEditPagaData(undefined);
    setEditPagaForma("");
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

  const handleSalvarMargem = async () => {
    const novaMargem = parseFloat(margemInput);

    if (isNaN(novaMargem) || novaMargem < 0 || novaMargem > 100) {
      toast.error("Margem deve ser um número entre 0 e 100");
      return;
    }

    try {
      const { error } = await supabase.from("contratos").update({ margem_pct: novaMargem }).eq("id", contratoId);

      if (error) throw error;

      setMargemPct(novaMargem);
      setIsEditingMargem(false);
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Margem atualizada com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar margem");
      console.error(error);
    }
  };

  const totais = {
    total: parcelas.reduce((sum, p) => sum + Number(p.valor_liquido_parcela), 0),
    pago: parcelas.filter((p) => p.status === "pago").reduce((sum, p) => sum + Number(p.valor_liquido_parcela), 0),
    pendente: parcelas
      .filter((p) => p.status === "pendente")
      .reduce((sum, p) => sum + Number(p.valor_liquido_parcela), 0),
    vencidas: parcelas.filter((p) => p.status === "pendente" && isPast(parseISO(p.vencimento))).length,
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
      {/* Cabeçalho com Margem Editável */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Parcelas do Contrato</h3>

          {/* Campo de Margem Editável */}
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 bg-primary/5">
            <Percent className="h-5 w-5 text-primary" />
            <Label className="text-sm font-medium text-muted-foreground">Margem:</Label>
            {isEditingMargem ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={margemInput}
                  onChange={(e) => setMargemInput(e.target.value)}
                  className="w-20 h-8 text-sm"
                  autoFocus
                />
                <span className="text-sm">%</span>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleSalvarMargem}>
                  <CheckCircle className="h-5 w-5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => {
                    setIsEditingMargem(false);
                    setMargemInput(String(margemPct));
                  }}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">{margemPct.toFixed(2)}%</span>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setIsEditingMargem(true)}>
                  <Edit className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-11 px-5">
              <Plus className="h-6 w-6 mr-3" />
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
                        !novaParcelaVencimento && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-5 w-5" />
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
            <p className="text-sm text-muted-foreground">Verifique os pagamentos em atraso</p>
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
              <TableHead>Forma</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parcelas.map((parcela) => {
              const isVencida = isPast(parseISO(parcela.vencimento)) && parcela.status === "pendente";

              const valorParcela = Number(parcela.valor_liquido_parcela);
              const margemParcela = calcularMargemPorParcela(valorParcela);

              return (
                <TableRow key={parcela.id} className={cn(isVencida && "bg-destructive/5")}>
                  <TableCell className="font-medium">{parcela.numero_parcela}ª</TableCell>
                  <TableCell>
                    {format(parseISO(parcela.vencimento), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>{formatCurrency(valorParcela)}</TableCell>
                  <TableCell className="text-muted-foreground">{margemPct.toFixed(2)}%</TableCell>
                  <TableCell className="font-semibold text-green-600">{formatCurrency(margemParcela)}</TableCell>
                  <TableCell>{getStatusBadge(parcela.status, parcela.vencimento)}</TableCell>
                  <TableCell>
                    {parcela.data_pagamento
                      ? format(parseISO(parcela.data_pagamento), "dd/MM/yyyy", {
                          locale: ptBR,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell>{parcela.forma || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {parcela.status === "pendente" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditDialog(parcela)}
                            title="Editar parcela"
                            className="h-11 px-5"
                          >
                            <Edit className="h-6 w-6 mr-3" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPagarDialog(parcela.id)}
                            title="Marcar como paga"
                            className="h-11 px-5 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                          >
                            <CheckCircle className="h-6 w-6 mr-3" />
                            Pagar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                title="Excluir parcela"
                                className="h-11 px-5 border-destructive text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-6 w-6 mr-3" />
                                Excluir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Parcela</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta parcela? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteParcela(parcela.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      {parcela.status === "pago" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditPagaDialog(parcela)}
                          title="Editar pagamento"
                          className="h-11 px-5"
                        >
                          <Edit className="h-6 w-6 mr-3" />
                          Editar Pagamento
                        </Button>
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
          <p className="text-lg font-semibold text-green-600">{formatCurrency(totais.margemTotal)}</p>
        </div>
        <div className="col-span-2 md:col-span-1 rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium text-primary">Líquido a Receber</p>
          </div>
          <p className="text-xl font-bold text-primary">{formatCurrency(totais.margemPendente)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Pago</p>
          <p className="text-lg font-semibold text-green-600">{formatCurrency(totais.pago)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Pendente</p>
          <p className="text-lg font-semibold text-blue-600">{formatCurrency(totais.pendente)}</p>
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
                      !editParcelaVencimento && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
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
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleEditParcela} className="flex-1">
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MarcarPagoDialog
        open={showPagarDialog}
        onOpenChange={setShowPagarDialog}
        parcelasSelecionadas={1}
        onConfirm={handleMarcarComoPago}
      />

      {/* Dialog para editar parcela paga */}
      <Dialog open={showEditPagaDialog} onOpenChange={setShowEditPagaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Data do Pagamento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editPagaData && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {editPagaData ? format(editPagaData, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editPagaData}
                    onSelect={setEditPagaData}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <select
                value={editPagaForma}
                onChange={(e) => setEditPagaForma(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="">Selecione</option>
                <option value="pix">PIX</option>
                <option value="transferencia">Transferência</option>
                <option value="boleto">Boleto</option>
                <option value="cartao">Cartão</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowEditPagaDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleEditParcePaga} className="flex-1">
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
