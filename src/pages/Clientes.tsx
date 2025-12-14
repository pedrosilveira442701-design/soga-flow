import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states/EmptyState";
import {
  UserPlus,
  Search,
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  Eye,
  MessageCircle,
  Users,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useClientes, Cliente } from "@/hooks/useClientes";
import { ClienteForm } from "@/components/forms/ClienteForm";
import { ClienteDetailsDialog } from "@/components/clientes/ClienteDetailsDialog";

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "inativo">("todos");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const { clientes, isLoading, createCliente, updateCliente, deleteCliente } = useClientes();

  // Filter clientes
  const filteredClientes = useMemo(() => {
    if (!clientes) return [];

    return clientes.filter((cliente) => {
      const matchesSearch =
        cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.contato?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.telefone?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "todos" || cliente.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clientes, searchTerm, statusFilter]);

  const sortedClientes = useMemo(() => {
    if (!sortColumn) return filteredClientes;

    return [...filteredClientes].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "nome":
          aValue = a.nome || "";
          bValue = b.nome || "";
          break;
        case "email":
          aValue = a.contato || "";
          bValue = b.contato || "";
          break;
        case "telefone":
          aValue = a.telefone || "";
          bValue = b.telefone || "";
          break;
        case "cidade":
          aValue = a.cidade || "";
          bValue = b.cidade || "";
          break;
        case "propostas":
          aValue = a.propostas?.[0]?.count || 0;
          bValue = b.propostas?.[0]?.count || 0;
          break;
        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredClientes, sortColumn, sortDirection]);

  const handleCreateCliente = async (data: any) => {
    const clienteData: any = { ...data };
    
    // Se forneceu created_at, converter Date para string ISO
    if (data.created_at) {
      clienteData.created_at = data.created_at.toISOString();
    }

    await createCliente.mutateAsync(clienteData);
    setCreateDialogOpen(false);
  };

  const handleUpdateCliente = async (data: any) => {
    if (!selectedCliente) return;
    await updateCliente.mutateAsync({ ...data, id: selectedCliente.id });
    setEditDialogOpen(false);
    setSelectedCliente(null);
  };

  const handleDeleteCliente = async (id: string) => {
    await deleteCliente.mutateAsync(id);
  };

  const handleEditCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setEditDialogOpen(true);
  };

  const handleViewDetails = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setDetailsDialogOpen(true);
  };

  const handleWhatsApp = (telefone: string | null) => {
    if (telefone) {
      const phone = telefone.replace(/\D/g, "");
      window.open(`https://wa.me/55${phone}`, "_blank");
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="icon-xl" />
            Clientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus clientes e contatos
          </p>
        </div>

        <Button onClick={() => setCreateDialogOpen(true)} className="h-11 px-5">
          <UserPlus className="icon-md mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Filtros</CardTitle>
              {(searchTerm || statusFilter !== "todos") && (
                <Badge variant="secondary" className="ml-2">
                  {[searchTerm, statusFilter !== "todos"].filter(Boolean).length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredClientes.length} de {clientes?.length || 0}
              </span>
              {(searchTerm || statusFilter !== "todos") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("todos");
                    setSortColumn(null);
                    setSortDirection("asc");
                  }}
                >
                  <X className="icon-md mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Busca - 3 colunas */}
            <div className="md:col-span-3">
              <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Buscar Cliente
              </Label>
              <Input
                placeholder="Nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10"
              />
            </div>

            {/* Status - 1 coluna */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value: any) => setStatusFilter(value)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Todos
                    </span>
                  </SelectItem>
                  <SelectItem value="ativo">
                    <span className="flex items-center gap-2">
                      <Badge variant="default" className="h-4 w-4 p-0" />
                      Ativo
                    </span>
                  </SelectItem>
                  <SelectItem value="inativo">
                    <span className="flex items-center gap-2">
                      <Badge variant="secondary" className="h-4 w-4 p-0" />
                      Inativo
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pills de filtros ativos */}
          {(searchTerm || statusFilter !== "todos") && (
            <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t">
              {searchTerm && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  <Search className="h-4 w-4" />
                  {searchTerm}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-transparent"
                    onClick={() => setSearchTerm("")}
                    aria-label="Remover filtro de busca"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </Badge>
              )}
              {statusFilter !== "todos" && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  {statusFilter === "ativo" ? "Ativo" : "Inativo"}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-transparent"
                    onClick={() => setStatusFilter("todos")}
                    aria-label="Remover filtro de status"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredClientes.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum cliente cadastrado"
              description="Comece adicionando seu primeiro cliente"
              action={{
                label: "Adicionar Cliente",
                onClick: () => setCreateDialogOpen(true),
              }}
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => handleSort("nome")} className="group">
                      Nome
                      <SortIcon column="nome" />
                    </TableHead>
                    <TableHead onClick={() => handleSort("email")} className="group">
                      Contato
                      <SortIcon column="email" />
                    </TableHead>
                    <TableHead onClick={() => handleSort("telefone")} className="group">
                      Telefone
                      <SortIcon column="telefone" />
                    </TableHead>
                    <TableHead onClick={() => handleSort("cidade")} className="group">
                      Localização
                      <SortIcon column="cidade" />
                    </TableHead>
                    <TableHead onClick={() => handleSort("status")} className="group">
                      Status
                      <SortIcon column="status" />
                    </TableHead>
                    <TableHead className="text-center" onClick={() => handleSort("propostas")}>
                      Propostas
                      <SortIcon column="propostas" />
                    </TableHead>
                    <TableHead className="text-center">Leads</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClientes.map((cliente) => {
                    const propostasCount = cliente.propostas?.[0]?.count || 0;
                    const leadsCount = cliente.leads?.[0]?.count || 0;

                    return (
                      <TableRow
                        key={cliente.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleViewDetails(cliente)}
                      >
                        <TableCell>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(cliente);
                            }}
                            className="font-medium text-primary hover:underline text-left"
                          >
                            {cliente.nome}
                          </button>
                        </TableCell>
                        <TableCell>
                          {cliente.contato ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4.5 w-4.5 text-muted-foreground" />
                              {cliente.contato}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {cliente.telefone ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4.5 w-4.5 text-muted-foreground" />
                              {cliente.telefone}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {cliente.cidade || cliente.bairro ? (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4.5 w-4.5 text-muted-foreground" />
                              {cliente.cidade && cliente.bairro
                                ? `${cliente.cidade} - ${cliente.bairro}`
                                : cliente.cidade || cliente.bairro}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              cliente.status === "ativo" ? "default" : "secondary"
                            }
                          >
                            {cliente.status === "ativo" ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{propostasCount}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{leadsCount}</Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="default"
                              size="icon"
                              onClick={() => handleViewDetails(cliente)}
                              title="Ver detalhes"
                              className="h-10 w-10"
                            >
                              <Eye className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="default"
                              size="icon"
                              onClick={() => handleEditCliente(cliente)}
                              title="Editar cliente"
                              className="h-10 w-10"
                            >
                              <Edit className="h-5 w-5" />
                            </Button>
                            {cliente.telefone && (
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => handleWhatsApp(cliente.telefone)}
                                title="Enviar WhatsApp"
                                className="h-10 w-10"
                              >
                                <MessageCircle className="h-5 w-5" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteCliente(cliente.id)}
                              title="Deletar cliente"
                              className="h-10 w-10 border-2 border-destructive text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <ClienteForm
            onSubmit={handleCreateCliente}
            isLoading={createCliente.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {selectedCliente && (
            <ClienteForm
              initialData={selectedCliente}
              onSubmit={handleUpdateCliente}
              isLoading={updateCliente.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <ClienteDetailsDialog
        cliente={selectedCliente}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onEdit={handleEditCliente}
        onDelete={handleDeleteCliente}
      />
    </div>
  );
}
