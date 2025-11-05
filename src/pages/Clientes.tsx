import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, Filter, MoreVertical, Phone, Mail, MapPin } from "lucide-react";

// Mock data
const mockClientes = [
  {
    id: 1,
    nome: "João Silva",
    contato: "joao@email.com",
    telefone: "(11) 98765-4321",
    cidade: "São Paulo",
    bairro: "Jardins",
    status: "Ativo",
    propostas: 3,
    ultimaInteracao: "2 dias atrás",
  },
  {
    id: 2,
    nome: "Maria Santos",
    contato: "maria@email.com",
    telefone: "(11) 97654-3210",
    cidade: "São Paulo",
    bairro: "Moema",
    status: "Ativo",
    propostas: 1,
    ultimaInteracao: "1 semana atrás",
  },
  {
    id: 3,
    nome: "Carlos Oliveira",
    contato: "carlos@email.com",
    telefone: "(11) 96543-2109",
    cidade: "São Paulo",
    bairro: "Vila Mariana",
    status: "Inativo",
    propostas: 0,
    ultimaInteracao: "3 meses atrás",
  },
];

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus clientes e contatos
          </p>
        </div>
        
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Propostas</TableHead>
                  <TableHead>Última Interação</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockClientes.map((cliente) => (
                  <TableRow key={cliente.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {cliente.contato}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {cliente.telefone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {cliente.cidade} - {cliente.bairro}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={cliente.status === "Ativo" ? "default" : "secondary"}
                      >
                        {cliente.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{cliente.propostas}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cliente.ultimaInteracao}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
