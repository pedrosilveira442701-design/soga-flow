import { useState, useMemo } from "react";
import { useContratos } from "@/hooks/useContratos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Trash2,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertCircle,
  X,
  Pencil,
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Contrato } from "@/hooks/useContratos";
import { ContratoForm } from "@/components/forms/ContratoForm";
import { ContratoDetailsDialog } from "@/components/contratos/ContratoDetailsDialog";
import { Progress } from "@/components/ui/progress";
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

export default function Contratos() {
  const { contratos, isLoading, createContrato, updateContrato, deleteContrato } = useContratos();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateFromPropostaDialog, setShowCreateFromPropostaDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formaPagamentoFilter, setFormaPagamentoFilter] = useState<string>("all");

  const handleCreate = async (data: any) => {
    await createContrato(data);
    setShowCreateDialog(false);
    setShowCreateFromPropostaDialog(false);
  };

  const handleDelete = async (id: string) => {
    await deleteContrato(id);
  };

  const handleView = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setShowDetailsDialog(true);
  };

  const handleEdit = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setShowEditDialog(true);
  };

  const handleUpdate = async (data: any) => {
    if (selectedContrato) {
      await updateContrato({ id: selectedContrato.id, data });
      setShowEditDialog(false);
      setSelectedContrato(null);
    }
  };

  const filteredContratos = useMemo(() => {
    return contratos.filter((contrato) => {
      const matchesSearch =
        searchTerm === "" ||
        contrato.cliente?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contrato.cpf_cnpj.includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" || contrato.status === statusFilter;

      const matchesFormaPagamento =
        formaPagamentoFilter === "all" ||
        contrato.forma_pagamento === formaPagamentoFilter;

      return matchesSearch && matchesStatus && matchesFormaPagamento;
    });
  }, [contratos, searchTerm, statusFilter, formaPagamentoFilter]);

  const kpis = useMemo(() => {
    const ativos = contratos.filter((c) => c.status === "ativo");
    const valorTotalAtivo = ativos.reduce(
      (sum, c) => sum + Number(c.valor_negociado),
      0
    );

    const hoje = new Date();
    const inicioMes = startOfMonth(hoje);
    const fimMes = endOfMonth(hoje);

    let valorPago = 0;
    let valorRestante = 0;
    let recebidoMes = 0;
    let aReceberMes = 0;

    contratos.forEach((contrato) => {
      if (contrato.parcelas) {
        valorPago += contrato.parcelas.valor_pago || 0;
        valorRestante += contrato.parcelas.valor_restante || 0;
        
        // Estimativa para o mês
        const valorParcela = Number(contrato.valor_negociado) / (contrato.parcelas.total || 1);
        const parcelasPagas = contrato.parcelas.pagas || 0;
        
        if (parcelasPagas > 0) {
          recebidoMes += valorParcela * 0.3; // Aproximação
        }
        if (contrato.parcelas.total > parcelasPagas) {
          aReceberMes += valorParcela * 0.3; // Aproximação
        }
      }
    });

    return {
      contratosAtivos: ativos.length,
      valorTotalAtivo,
      valorPago,
      valorRestante,
      recebidoMes,
      aReceberMes,
    };
  }, [contratos]);

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

  const getSituacaoBadge = (contrato: Contrato) => {
    if (contrato.status === "concluido") {
      return <Badge className="bg-green-500">Concluído</Badge>;
    }
    if (contrato.status === "cancelado") {
      return <Badge variant="destructive">Cancelado</Badge>;
    }
    
    const parcelas = contrato.parcelas;
    if (!parcelas) return <Badge variant="secondary">-</Badge>;

    if (parcelas.pagas === parcelas.total) {
      return <Badge className="bg-green-500">Pago</Badge>;
    }

    // Verificar se tem parcelas vencidas seria ideal aqui
    return <Badge variant="secondary">Em Andamento</Badge>;
  };

  const activeFilters = [
    statusFilter !== "all" && { key: "status", label: `Status: ${statusFilter}` },
    formaPagamentoFilter !== "all" && {
      key: "forma",
      label: `Forma: ${formaPagamentoFilter}`,
    },
  ].filter(Boolean);

  const clearFilters = () => {
    setStatusFilter("all");
    setFormaPagamentoFilter("all");
    setSearchTerm("");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Contratos
          </h1>
          <p className="text-muted-foreground">
            Gerencie contratos, acompanhe parcelas e recebimentos
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateFromPropostaDialog(true)} variant="outline" className="h-11 px-5">
            <FileText className="mr-3 h-5 w-5" />
            Criar de Proposta
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="h-11 px-5">
            <Plus className="mr-3 h-5 w-5" />
            Novo Contrato
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">
              Contratos Ativos
            </p>
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <p className="text-3xl font-bold">{kpis.contratosAtivos}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {contratos.length} total
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">
              Valor Total Ativo
            </p>
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <p className="text-3xl font-bold">
            {formatCurrency(kpis.valorTotalAtivo)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Em contratos ativos</p>
        </div>

        <div className="rounded-lg border bg-card p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">
              Já Recebido
            </p>
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-3xl font-bold text-green-700 dark:text-green-400">
            {formatCurrency(kpis.valorPago)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Parcelas pagas</p>
        </div>

        <div className="rounded-lg border bg-card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">
              Restante a Receber
            </p>
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
            {formatCurrency(kpis.valorRestante)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Parcelas pendentes</p>
        </div>

        <div className="rounded-lg border bg-card p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">
              Este Mês
            </p>
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            {formatCurrency(kpis.aReceberMes)}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            ↑ {formatCurrency(kpis.recebidoMes)} recebido
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou CPF/CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={formaPagamentoFilter}
          onValueChange={setFormaPagamentoFilter}
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Forma de Pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Formas</SelectItem>
            <SelectItem value="À Vista">À Vista</SelectItem>
            <SelectItem value="Boleto">Boleto</SelectItem>
            <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
            <SelectItem value="Pix">Pix</SelectItem>
            <SelectItem value="Transferência Bancária">Transferência</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {activeFilters.map((filter: any) => (
            <Badge key={filter.key} variant="secondary" className="gap-1">
              {filter.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  if (filter.key === "status") setStatusFilter("all");
                  if (filter.key === "forma") setFormaPagamentoFilter("all");
                }}
              />
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2"
          >
            Limpar filtros
          </Button>
        </div>
      )}

      {/* Tabela */}
      {filteredContratos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Nenhum contrato encontrado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm || statusFilter !== "all" || formaPagamentoFilter !== "all"
              ? "Tente ajustar os filtros"
              : "Crie seu primeiro contrato para começar"}
          </p>
          {!searchTerm && statusFilter === "all" && formaPagamentoFilter === "all" && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="mt-4 h-11 px-5"
              variant="outline"
            >
              <Plus className="mr-3 h-5 w-5" />
              Criar Primeiro Contrato
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Total da Margem</TableHead>
                <TableHead>Líquido a Receber</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Pendente</TableHead>
                <TableHead>Forma Pagamento</TableHead>
                <TableHead>Data Início</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContratos.map((contrato) => {
                const progressoParcelas = contrato.parcelas
                  ? (contrato.parcelas.pagas / contrato.parcelas.total) * 100
                  : 0;

                // Calcular valores conforme lógica da janela de contrato
                const total = Number(contrato.valor_negociado); // Valor bruto total
                const totalDaMargem = contrato.margem_pct 
                  ? total * (contrato.margem_pct / 100)
                  : total; // Lucro total
                
                // Cálculo de valores por parcela
                const totalParcelas = contrato.parcelas?.total || 1;
                const parcelasPagas = contrato.parcelas?.pagas || 0;
                const parcelasPendentes = totalParcelas - parcelasPagas;
                
                // Pago (líquido) = valor líquido das parcelas pagas
                const pago = contrato.parcelas?.valor_pago || 0;
                
                // Pendente (líquido) = valor líquido das parcelas pendentes
                const pendente = contrato.parcelas?.valor_restante || 0;
                
                // Líquido a Receber = margem das parcelas pendentes
                const liquidoAReceber = contrato.margem_pct 
                  ? pendente * (contrato.margem_pct / 100)
                  : pendente;

                return (
                  <TableRow key={contrato.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{contrato.cliente?.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {contrato.cpf_cnpj}
                        </p>
                      </div>
                    </TableCell>
                    {/* Total - Valor Negociado */}
                    <TableCell>
                      <p className="font-semibold">
                        {formatCurrency(total)}
                      </p>
                    </TableCell>
                    {/* Total da Margem - Lucro total */}
                    <TableCell>
                      <div>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(totalDaMargem)}
                        </p>
                        {contrato.margem_pct && (
                          <p className="text-xs text-muted-foreground">
                            {contrato.margem_pct.toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </TableCell>
                    {/* Líquido a Receber - Lucro que falta receber */}
                    <TableCell>
                      <p className="font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(liquidoAReceber)}
                      </p>
                    </TableCell>
                    {/* Pago - Valor líquido já recebido */}
                    <TableCell>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(pago)}
                      </p>
                    </TableCell>
                    {/* Pendente - Valor bruto pendente */}
                    <TableCell>
                      <p className="font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(pendente)}
                      </p>
                    </TableCell>
                    <TableCell>{contrato.forma_pagamento}</TableCell>
                    <TableCell>
                      {format(parseISO(contrato.data_inicio), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span>
                            {contrato.parcelas?.pagas || 0}/{contrato.parcelas?.total || 0}
                          </span>
                        </div>
                        <Progress value={progressoParcelas} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleView(contrato)}
                          title="Ver detalhes"
                          className="h-11 px-5 rounded-xl"
                        >
                          <Eye className="h-9 w-9 mr-2" />
                          Ver
                        </Button>
                        {contrato.status !== "cancelado" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleEdit(contrato)}
                              title="Editar contrato"
                              className="h-11 px-5 rounded-xl"
                            >
                              <Pencil className="h-9 w-9 mr-2" />
                              Editar
                            </Button>
                          </>
                        )}
                        {contrato.status !== "cancelado" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                title="Cancelar contrato"
                                className="h-11 px-5 rounded-xl border-2 border-primary text-primary hover:bg-primary/10"
                              >
                                <X className="h-9 w-9 mr-2" />
                                Cancelar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar Contrato</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja cancelar este contrato? Esta
                                  ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(contrato.id)}
                                >
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
          </DialogHeader>
          <ContratoForm onSubmit={handleCreate} mode="create" />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCreateFromPropostaDialog}
        onOpenChange={setShowCreateFromPropostaDialog}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Contrato a partir de Proposta</DialogTitle>
          </DialogHeader>
          <ContratoForm onSubmit={handleCreate} mode="fromProposta" />
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Contrato</DialogTitle>
          </DialogHeader>
          {selectedContrato && (
            <ContratoForm
              onSubmit={handleUpdate}
              mode="create"
              initialData={{
                cliente_id: selectedContrato.cliente_id,
                valor_negociado: Number(selectedContrato.valor_negociado),
                forma_pagamento: selectedContrato.forma_pagamento,
                data_inicio: selectedContrato.data_inicio,
                observacoes: selectedContrato.observacoes || "",
                cpf_cnpj: selectedContrato.cpf_cnpj,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ContratoDetailsDialog
        contrato={selectedContrato}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        onCancel={handleDelete}
      />
    </div>
  );
}
