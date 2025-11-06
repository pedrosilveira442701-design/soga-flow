import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Proposta } from "@/hooks/usePropostas";

export default function Propostas() {
  const { propostas, isLoading, createProposta, deleteProposta } = usePropostas();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProposta, setSelectedProposta] = useState<Proposta | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todas");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");

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

  // KPIs - Recalculados localmente para garantir precisão
  const kpis = useMemo(() => {
    const total = propostas.length;
    const fechadas = propostas.filter((p) => p.status === "fechada").length;
    const taxaFechamento = total > 0 ? (fechadas / total) * 100 : 0;
    
    // Valor em Aberto: soma do VALOR LÍQUIDO (lucro) de todas as propostas abertas
    // Valor Líquido = (Total Bruto - Desconto) - Custo Total
    const valorEmAberto = propostas
      .filter((p) => p.status === "aberta")
      .reduce((sum, p) => {
        const servicos = p.servicos && Array.isArray(p.servicos) && p.servicos.length > 0
          ? p.servicos
          : [{ tipo: p.tipo_piso, m2: p.m2, valor_m2: p.valor_m2, custo_m2: p.custo_m2 }];
        
        const totalBruto = servicos.reduce((acc: number, s: any) => acc + ((s.m2 || 0) * (s.valor_m2 || 0)), 0);
        const totalCusto = servicos.reduce((acc: number, s: any) => acc + ((s.m2 || 0) * (s.custo_m2 || 0)), 0);
        const desconto = p.desconto || 0;
        const totalComDesconto = totalBruto - desconto;
        const liquido = totalComDesconto - totalCusto;
        
        return sum + liquido;
      }, 0);
    
    // Margem Média: média da margem percentual de todas as propostas
    // Margem % = (Valor Líquido / Total com Desconto) * 100
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

    return { total, taxaFechamento, valorEmAberto, margemMedia };
  }, [propostas]);

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

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("todas");
    setTipoFilter("todos");
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
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Proposta
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Propostas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Fechamento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.taxaFechamento.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor em Aberto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.valorEmAberto)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMargemColor(kpis.margemMedia)}`}>
              {kpis.margemMedia.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os Status</SelectItem>
            <SelectItem value="aberta">Abertas</SelectItem>
            <SelectItem value="fechada">Fechadas</SelectItem>
            <SelectItem value="perdida">Perdidas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-full sm:w-48">
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

        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters} size="icon">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter badges */}
      {hasActiveFilters && (
        <div className="flex gap-2 flex-wrap">
          {searchTerm && (
            <Badge variant="secondary">
              Busca: {searchTerm}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => setSearchTerm("")}
              />
            </Badge>
          )}
          {statusFilter !== "todas" && (
            <Badge variant="secondary">
              Status: {statusFilter}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => setStatusFilter("todas")}
              />
            </Badge>
          )}
          {tipoFilter !== "todos" && (
            <Badge variant="secondary">
              Tipo: {tipoFilter}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => setTipoFilter("todos")}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo de Piso</TableHead>
              <TableHead className="text-right">Área (m²)</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-right">Margem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPropostas.length === 0 ? (
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
                      <Button onClick={() => setShowCreateDialog(true)} className="mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeira Proposta
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredPropostas.map((proposta) => {
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
                        {proposta.clientes?.cidade && (
                          <div className="text-xs text-muted-foreground">
                            {proposta.clientes.cidade}
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
                    <TableCell>{getStatusBadge(proposta.status)}</TableCell>
                    <TableCell>
                      {format(new Date(proposta.data), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover z-50">
                          <DropdownMenuItem onClick={() => handleView(proposta)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(proposta.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
