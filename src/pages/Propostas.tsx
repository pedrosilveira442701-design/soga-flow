import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePropostas } from "@/hooks/usePropostas";
import ProposalForm from "@/components/forms/ProposalForm";
import PropostaDetailsDialog from "@/components/propostas/PropostaDetailsDialog";
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Filter,
  X,
  TrendingUp,
  DollarSign,
  Percent,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Proposta } from "@/hooks/usePropostas";

export default function Propostas() {
  const { propostas, isLoading, createProposta, updateStatus, deleteProposta } = usePropostas();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProposta, setSelectedProposta] = useState<Proposta | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todas");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleCreate = async (data: any) => {
    await createProposta.mutateAsync(data);
    setShowCreateDialog(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta proposta?")) {
      await deleteProposta.mutateAsync(id);
    }
  };

  const handleView = (proposta: Proposta) => {
    setSelectedProposta(proposta);
    setShowDetailsDialog(true);
  };

  // Filter propostas
  const filteredPropostas = useMemo(() => {
    return propostas.filter((proposta) => {
      const matchesSearch = proposta.clientes?.nome
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "todas" || proposta.status === statusFilter;
      
      // Para filtro de tipo, considerar tanto servicos quanto tipo_piso antigo
      const tipos = proposta.servicos && proposta.servicos.length > 0
        ? proposta.servicos.map(s => s.tipo === "Outro" && s.tipo_outro ? s.tipo_outro : s.tipo)
        : [proposta.tipo_piso];
      const matchesTipo =
        tipoFilter === "todos" || tipos.some(t => t === tipoFilter);

      return matchesSearch && matchesStatus && matchesTipo;
    });
  }, [propostas, searchTerm, statusFilter, tipoFilter]);

  const sortedPropostas = useMemo(() => {
    if (!sortColumn) return filteredPropostas;

    return [...filteredPropostas].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "cliente":
          aValue = a.clientes?.nome || "";
          bValue = b.clientes?.nome || "";
          break;
        case "valor":
          aValue = Number(a.valor_total);
          bValue = Number(b.valor_total);
          break;
        case "area":
          aValue = Number(a.m2);
          bValue = Number(b.m2);
          break;
        case "tipo_piso":
          aValue = a.tipo_piso || "";
          bValue = b.tipo_piso || "";
          break;
        case "data":
          aValue = new Date(a.data);
          bValue = new Date(b.data);
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredPropostas, sortColumn, sortDirection]);

  // KPIs - Recalculados localmente para garantir precisão
  const kpis = useMemo(() => {
    const total = propostas.length;
    
    // Contar propostas por status
    const perdidas = propostas.filter((p) => p.status === "perdida").length;
    const repouso = propostas.filter((p) => p.status === "repouso").length;
    const ativas = total - perdidas - repouso;
    
    // Valores financeiros
    const calcularValorLiquido = (p: any) => {
      const servicos = p.servicos && Array.isArray(p.servicos) && p.servicos.length > 0
        ? p.servicos
        : [{ tipo: p.tipo_piso, m2: p.m2, valor_m2: p.valor_m2, custo_m2: p.custo_m2 }];
      
      const totalBruto = servicos.reduce((acc: number, s: any) => acc + ((s.m2 || 0) * (s.valor_m2 || 0)), 0);
      const totalCusto = servicos.reduce((acc: number, s: any) => acc + ((s.m2 || 0) * (s.custo_m2 || 0)), 0);
      const desconto = p.desconto || 0;
      const totalComDesconto = totalBruto - desconto;
      return totalComDesconto - totalCusto;
    };
    
    const valorTotal = propostas.reduce((sum, p) => sum + calcularValorLiquido(p), 0);
    const valorPerdidas = propostas
      .filter((p) => p.status === "perdida")
      .reduce((sum, p) => sum + calcularValorLiquido(p), 0);
    const valorRepouso = propostas
      .filter((p) => p.status === "repouso")
      .reduce((sum, p) => sum + calcularValorLiquido(p), 0);
    const valorReal = valorTotal - valorPerdidas - valorRepouso;
    
    // Taxa de fechamento sobre volume real
    const fechadas = propostas.filter((p) => p.status === "fechada").length;
    const taxaFechamento = ativas > 0 ? (fechadas / ativas) * 100 : 0;
    
    // Margem Média de todas as propostas
    const margemMedia =
      propostas.length > 0
        ? propostas.reduce((sum, p) => {
            const servicos = p.servicos && Array.isArray(p.servicos) && p.servicos.length > 0
              ? p.servicos
              : [{ tipo: p.tipo_piso, m2: p.m2, valor_m2: p.valor_m2, custo_m2: p.custo_m2 }];
            
            const totalBruto = servicos.reduce((acc: number, s: any) => acc + ((s.m2 || 0) * (s.valor_m2 || 0)), 0);
            const totalCusto = servicos.reduce((acc: number, s: any) => acc + ((s.m2 || 0) * (s.custo_m2 || 0)), 0);
            const desconto = p.desconto || 0;
            const totalComDesconto = totalBruto - desconto;
            const liquido = totalComDesconto - totalCusto;
            const margem = totalComDesconto > 0 ? (liquido / totalComDesconto) * 100 : 0;
            
            return sum + margem;
          }, 0) / propostas.length
        : 0;

    return { 
      total, 
      perdidas, 
      repouso, 
      ativas, 
      valorTotal,
      valorPerdidas,
      valorRepouso,
      valorReal,
      taxaFechamento, 
      margemMedia 
    };
  }, [propostas]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const statusOptions = [
    { value: "aberta", label: "Aberta", variant: "default" as const },
    { value: "fechada", label: "Fechada", variant: "secondary" as const },
    { value: "repouso", label: "Repouso", variant: "outline" as const },
    { value: "perdida", label: "Perdida", variant: "destructive" as const },
  ];

  const getStatusBadge = (propostaId: string, status: string) => {
    const currentStatus = statusOptions.find(s => s.value === status) || statusOptions[0];
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="inline-flex">
            <Badge 
              variant={currentStatus.variant} 
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              {currentStatus.label}
            </Badge>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-2">
          <div className="flex flex-col gap-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  updateStatus.mutate({ id: propostaId, status: option.value });
                }}
                className={`px-3 py-2 text-sm rounded-md text-left transition-colors ${
                  option.value === status
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-accent/50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const getMargemColor = (margem: number) => {
    if (margem < 20) return "text-destructive";
    if (margem < 35) return "text-yellow-600";
    return "text-success";
  };

  const tiposPiso = Array.from(
    new Set(
      propostas.flatMap(p => 
        p.servicos && p.servicos.length > 0
          ? p.servicos.map(s => s.tipo === "Outro" && s.tipo_outro ? s.tipo_outro : s.tipo)
          : [p.tipo_piso]
      )
    )
  );
  const hasActiveFilters = searchTerm || statusFilter !== "todas" || tipoFilter !== "todos";

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4.5 w-4.5 ml-1 inline opacity-0 group-hover:opacity-50 transition-opacity" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4.5 w-4.5 ml-1 inline text-primary" />
    ) : (
      <ArrowDown className="h-4.5 w-4.5 ml-1 inline text-primary" />
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("todas");
    setTipoFilter("todos");
    setSortColumn(null);
    setSortDirection("asc");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Propostas</h1>
          <p className="text-muted-foreground">
            Gerencie propostas comerciais com análise de margem
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="h-11 px-5">
          <Plus className="icon-md mr-2" />
          Nova Proposta
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Propostas</CardTitle>
            <FileText className="icon-md text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(kpis.valorTotal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perdidas</CardTitle>
            <X className="icon-md text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{kpis.perdidas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(kpis.valorPerdidas)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repouso</CardTitle>
            <Clock className="icon-md text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{kpis.repouso}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(kpis.valorRepouso)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Real (Ativas)</CardTitle>
            <TrendingUp className="icon-md text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{kpis.ativas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(kpis.valorReal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
            <Percent className="icon-md text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMargemColor(kpis.margemMedia)}`}>
              {kpis.margemMedia.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Taxa: {kpis.taxaFechamento.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Filtros</CardTitle>
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {[searchTerm, statusFilter !== "todas", tipoFilter !== "todos"].filter(Boolean).length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredPropostas.length} de {propostas.length}
              </span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca */}
            <div className="md:col-span-3">
              <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Buscar Cliente
              </Label>
              <Input
                placeholder="Digite o nome do cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10"
              />
            </div>

            {/* Status */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Todos os Status
                    </span>
                  </SelectItem>
                  <SelectItem value="aberta">Abertas</SelectItem>
                  <SelectItem value="fechada">Fechadas</SelectItem>
                  <SelectItem value="repouso">Repouso</SelectItem>
                  <SelectItem value="perdida">Perdidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo */}
            <div className="md:col-span-2">
              <Label className="text-sm font-medium mb-2 block">Tipo de Piso</Label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  {tiposPiso.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pills de filtros ativos */}
          {hasActiveFilters && (
            <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t">
              {searchTerm && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  <Search className="h-3 w-3" />
                  {searchTerm}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-transparent"
                    onClick={() => setSearchTerm("")}
                    aria-label="Remover filtro de busca"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {statusFilter !== "todas" && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  {statusOptions.find(s => s.value === statusFilter)?.label}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-transparent"
                    onClick={() => setStatusFilter("todas")}
                    aria-label="Remover filtro de status"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {tipoFilter !== "todos" && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  {tipoFilter}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-transparent"
                    onClick={() => setTipoFilter("todos")}
                    aria-label="Remover filtro de tipo"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort("cliente")} className="group">
                Cliente
                <SortIcon column="cliente" />
              </TableHead>
              <TableHead onClick={() => handleSort("tipo_piso")} className="group">
                Tipo de Piso
                <SortIcon column="tipo_piso" />
              </TableHead>
              <TableHead className="text-right" onClick={() => handleSort("area")}>
                Área (m²)
                <SortIcon column="area" />
              </TableHead>
              <TableHead className="text-right" onClick={() => handleSort("valor")}>
                Valor Total
                <SortIcon column="valor" />
              </TableHead>
              <TableHead className="text-right">Margem</TableHead>
              <TableHead onClick={() => handleSort("status")} className="group">
                Status
                <SortIcon column="status" />
              </TableHead>
              <TableHead onClick={() => handleSort("data")} className="group">
                Data
                <SortIcon column="data" />
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPropostas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-medium">Nenhuma proposta encontrada</p>
                    <p className="text-sm text-muted-foreground">
                      {hasActiveFilters
                        ? "Tente ajustar os filtros"
                        : "Crie sua primeira proposta"}
                    </p>
                    {!hasActiveFilters && (
                      <Button onClick={() => setShowCreateDialog(true)} className="mt-2 h-11 px-5">
                        <Plus className="h-5 w-5 mr-3" />
                        Criar Primeira Proposta
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedPropostas.map((proposta) => {
                // Calcular valores da mesma forma que no resumo financeiro
                const servicos = proposta.servicos && Array.isArray(proposta.servicos) && proposta.servicos.length > 0
                  ? proposta.servicos
                  : [{ tipo: proposta.tipo_piso, m2: proposta.m2, valor_m2: proposta.valor_m2, custo_m2: proposta.custo_m2 }];
                
                const totalBruto = servicos.reduce((acc: number, s: any) => acc + ((s.m2 || 0) * (s.valor_m2 || 0)), 0);
                const totalCusto = servicos.reduce((acc: number, s: any) => acc + ((s.m2 || 0) * (s.custo_m2 || 0)), 0);
                const desconto = proposta.desconto || 0;
                const valorTotal = totalBruto - desconto;
                const liquido = valorTotal - totalCusto;
                const margem = valorTotal > 0 ? (liquido / valorTotal) * 100 : 0;

                return (
                  <TableRow key={proposta.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{proposta.clientes?.nome}</div>
                        {(proposta.clientes?.cidade || proposta.clientes?.bairro) && (
                          <div className="text-xs text-muted-foreground">
                            {[proposta.clientes.cidade, proposta.clientes.bairro]
                              .filter(Boolean)
                              .join(" / ")}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {proposta.servicos && proposta.servicos.length > 0 ? (
                        <div className="space-y-1">
                          {proposta.servicos.map((s, idx) => (
                            <Badge key={idx} variant="outline" className="mr-1">
                              {s.tipo === "Outro" && s.tipo_outro ? s.tipo_outro : s.tipo}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="outline">{proposta.tipo_piso}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{proposta.m2.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(valorTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${getMargemColor(margem)}`}>
                        {margem.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(proposta.id, proposta.status)}</TableCell>
                    <TableCell>
                      {format(new Date(proposta.data), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="default"
                          size="icon"
                          onClick={() => handleView(proposta)}
                          title="Ver detalhes"
                          className="h-10 w-10"
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(proposta.id)}
                          title="Excluir proposta"
                          className="h-10 w-10 border-2 border-destructive text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Proposta</DialogTitle>
          </DialogHeader>
          <ProposalForm onSubmit={handleCreate} />
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <PropostaDetailsDialog
        proposta={selectedProposta}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />
    </div>
  );
}
