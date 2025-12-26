import { useState } from "react";
import { DollarSign, Search, Filter, CheckCircle2, AlertCircle } from "lucide-react";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { FluxoCaixaChart } from "@/components/financeiro/FluxoCaixaChart";
import { MarcarPagoDialog } from "@/components/financeiro/MarcarPagoDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export default function Financeiro() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<{
    search: string;
    status: "" | "pendente" | "pago" | "vencido" | "cancelado" | "atrasado";
    formaPagamento: string;
  }>({
    search: "",
    status: "",
    formaPagamento: "",
  });
  const [apenasEmAberto, setApenasEmAberto] = useState(false);
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState<string[]>([]);
  const [marcarPagoOpen, setMarcarPagoOpen] = useState(false);

  const { parcelas: todasParcelas, isLoading, kpis, fluxoCaixa, isLoadingFluxo, marcarComoPago } =
    useFinanceiro(filters);

  // Filtrar parcelas em aberto se necessário
  const parcelas = apenasEmAberto
    ? todasParcelas.filter((p) => p.status === "pendente" || p.status === "atrasado")
    : todasParcelas;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pago: { variant: "default", label: "Pago", className: "bg-green-600" },
      pendente: { variant: "secondary", label: "Pendente" },
      atrasado: { variant: "destructive", label: "Atrasado" },
      cancelado: { variant: "outline", label: "Cancelado" },
    };
    const config = variants[status] || variants.pendente;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendentes = parcelas
        .filter((p) => p.status === "pendente" || p.status === "atrasado")
        .map((p) => p.id);
      setParcelasSelecionadas(pendentes);
    } else {
      setParcelasSelecionadas([]);
    }
  };

  const handleSelectParcela = (id: string, checked: boolean) => {
    if (checked) {
      setParcelasSelecionadas([...parcelasSelecionadas, id]);
    } else {
      setParcelasSelecionadas(parcelasSelecionadas.filter((p) => p !== id));
    }
  };

  const handleMarcarComoPago = async (dataPagamento: string, forma: string) => {
    await marcarComoPago({
      ids: parcelasSelecionadas,
      dataPagamento,
      forma,
    });
    setParcelasSelecionadas([]);
  };

  const aplicarFiltroRapido = (tipo: string) => {
    const hoje = new Date().toISOString().split("T")[0];
    const fimSemana = new Date();
    fimSemana.setDate(fimSemana.getDate() + 7);

    switch (tipo) {
      case "hoje":
        setFilters({ ...filters, status: "", search: "" });
        break;
      case "semana":
        setFilters({ ...filters, status: "", search: "" });
        break;
      case "atrasadas":
        setFilters({ ...filters, status: "atrasado", search: "" });
        break;
      case "mes":
        setFilters({ ...filters, status: "", search: "" });
        break;
      default:
        setFilters({ search: "", status: "", formaPagamento: "" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-h1 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Financeiro
        </h1>
        <p className="text-muted-foreground">
          Gestão completa de recebimentos e fluxo de caixa
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">
              Total a Receber
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(kpis.totalAReceber)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">
              Recebido Este Mês
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(kpis.recebidoMes)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">
              A Receber Este Mês
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(kpis.aReceberMes)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">
              Parcelas Atrasadas
            </div>
            <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
              {kpis.atrasadas}
              {kpis.atrasadas > 0 && <AlertCircle className="h-5 w-5" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fluxo de Caixa */}
      <FluxoCaixaChart data={fluxoCaixa} isLoading={isLoadingFluxo} />

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Filtros Rápidos */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => aplicarFiltroRapido("todos")}
              >
                Todos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => aplicarFiltroRapido("hoje")}
              >
                Vence Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => aplicarFiltroRapido("semana")}
              >
                Vence Esta Semana
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => aplicarFiltroRapido("atrasadas")}
                className={
                  filters.status === "atrasado" ? "bg-destructive/10" : ""
                }
              >
                Atrasadas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => aplicarFiltroRapido("mes")}
              >
                Este Mês
              </Button>
              <Button
                variant={apenasEmAberto ? "default" : "outline"}
                size="sm"
                onClick={() => setApenasEmAberto(!apenasEmAberto)}
              >
                <Filter className="mr-2 icon-md" />
                Apenas em Aberto
              </Button>
            </div>

            {/* Filtros Avançados */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 icon-md text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente ou CPF/CNPJ..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>

              <Select
                value={filters.status || "todos"}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value === "todos" ? "" : value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.formaPagamento || "todas"}
                onValueChange={(value) =>
                  setFilters({ ...filters, formaPagamento: value === "todas" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Forma de Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="À Vista">À Vista</SelectItem>
                  <SelectItem value="Parcelado">Parcelado</SelectItem>
                  <SelectItem value="Financiado">Financiado</SelectItem>
                </SelectContent>
              </Select>

              {parcelasSelecionadas.length > 0 && (
                <Button
                  onClick={() => setMarcarPagoOpen(true)}
                  className="gap-2"
                >
                  <CheckCircle2 className="icon-md" />
                  Marcar {parcelasSelecionadas.length} como Pago
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Parcelas */}
      <Card>
        <CardContent className="pt-6">
          {parcelas.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhuma parcela encontrada
              </h3>
              <p className="text-muted-foreground mb-4">
                Crie contratos para começar a gerenciar recebimentos
              </p>
              <Button onClick={() => navigate("/contratos")}>
                Ver Contratos
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          parcelasSelecionadas.length > 0 &&
                          parcelasSelecionadas.length ===
                            parcelas.filter(
                              (p) =>
                                p.status === "pendente" || p.status === "atrasado"
                            ).length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Valor Bruto</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Margem Líquida</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Pgto</TableHead>
                    <TableHead>Forma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelas.map((parcela) => {
                    const isAtrasado = parcela.status === "atrasado";
                    const canSelect =
                      parcela.status === "pendente" || parcela.status === "atrasado";

                    return (
                      <TableRow
                        key={parcela.id}
                        className={isAtrasado ? "bg-destructive/5" : ""}
                      >
                        <TableCell>
                          {canSelect && (
                            <Checkbox
                              checked={parcelasSelecionadas.includes(parcela.id)}
                              onCheckedChange={(checked) =>
                                handleSelectParcela(parcela.id, checked as boolean)
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {parcela.contrato?.cliente?.nome || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {parcela.contrato?.cliente?.cpf_cnpj || "—"}
                        </TableCell>
                        <TableCell>{parcela.numero_parcela}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(Number(parcela.valor_liquido_parcela))}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatCurrency(
                            Number(parcela.valor_liquido_parcela) *
                              (1 - Number(parcela.contrato?.margem_pct || 0) / 100)
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(
                            Number(parcela.valor_liquido_parcela) *
                              (Number(parcela.contrato?.margem_pct || 0) / 100)
                          )}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(parcela.vencimento + "T00:00:00"),
                            "dd/MMM/yyyy",
                            { locale: ptBR }
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(parcela.status)}</TableCell>
                        <TableCell>
                          {parcela.data_pagamento
                            ? format(
                                new Date(parcela.data_pagamento + "T00:00:00"),
                                "dd/MMM/yyyy",
                                { locale: ptBR }
                              )
                            : "—"}
                        </TableCell>
                        <TableCell>{parcela.forma || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Footer com Totalização */}
              <div className="border-t p-4 bg-muted/50">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Total: {parcelas.length} parcela{parcelas.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-1">Total Recebido</span>
                      <span className="text-lg font-bold text-blue-600">
                        {formatCurrency(
                          parcelas
                            .filter((p) => p.status === "pago")
                            .reduce((sum, p) => sum + Number(p.valor_liquido_parcela), 0)
                        )}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-1">Margem Líquida Realizada</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(
                          parcelas
                            .filter((p) => p.status === "pago")
                            .reduce((sum, p) => {
                              const valor = Number(p.valor_liquido_parcela);
                              const margemPct = Number(p.contrato?.margem_pct || 0);
                              return sum + (valor * (margemPct / 100));
                            }, 0)
                        )}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-1">Total a Receber</span>
                      <span className="text-lg font-bold text-amber-600">
                        {formatCurrency(
                          parcelas
                            .filter((p) => p.status === "pendente" || p.status === "atrasado")
                            .reduce((sum, p) => sum + Number(p.valor_liquido_parcela), 0)
                        )}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-1">Margem Líquida a Receber</span>
                      <span className="text-lg font-bold text-emerald-600">
                        {formatCurrency(
                          parcelas
                            .filter((p) => p.status === "pendente" || p.status === "atrasado")
                            .reduce((sum, p) => {
                              const valor = Number(p.valor_liquido_parcela);
                              const margemPct = Number(p.contrato?.margem_pct || 0);
                              return sum + (valor * (margemPct / 100));
                            }, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Marcar como Pago */}
      <MarcarPagoDialog
        open={marcarPagoOpen}
        onOpenChange={setMarcarPagoOpen}
        parcelasSelecionadas={parcelasSelecionadas.length}
        onConfirm={handleMarcarComoPago}
      />
    </div>
  );
}
