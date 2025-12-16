import { useState } from "react";
import { Plus, Building2, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useObras } from "@/hooks/useObras";
import { ObraDetailsDialog } from "@/components/obras/ObraDetailsDialog";
import { EmptyState } from "@/components/states/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Obra } from "@/hooks/useObras";

const STATUS_LABELS = {
  mobilizacao: "Mobilização",
  execucao: "Em Execução",
  acabamento: "Acabamento",
  concluida: "Concluída",
  finalizada: "Finalizada",
  pausada: "Pausada",
};

const STATUS_COLORS = {
  mobilizacao: "bg-blue-500",
  execucao: "bg-yellow-500",
  acabamento: "bg-orange-500",
  concluida: "bg-green-500",
  finalizada: "bg-green-500",
  pausada: "bg-gray-500",
};

export default function Obras() {
  const { obras, isLoading } = useObras();
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleViewDetails = (obra: Obra) => {
    setSelectedObra(obra);
    setShowDetailsDialog(true);
  };

  const filteredObras = obras.filter((obra) => {
    if (statusFilter === "all") return true;
    return obra.status === statusFilter;
  });

  const obrasAtivas = obras.filter((o) => 
    o.status === "execucao" || o.status === "mobilizacao" || o.status === "acabamento"
  ).length;

  const obrasConcluidas = obras.filter((o) => o.status === "concluida").length;

  const progressoMedio = obras.length > 0
    ? Math.round(obras.reduce((acc, o) => acc + (o.progresso_pct || 0), 0) / obras.length)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Obras
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestão operacional e acompanhamento de execução
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Obras Ativas</CardTitle>
            <Building2 className="icon-md text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{obrasAtivas}</div>
                <p className="text-xs text-muted-foreground">
                  Em mobilização, execução ou acabamento
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="icon-md text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{obrasConcluidas}</div>
                <p className="text-xs text-muted-foreground">
                  Obras finalizadas
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso Médio</CardTitle>
            <TrendingUp className="icon-md text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{progressoMedio}%</div>
                <p className="text-xs text-muted-foreground">
                  Das obras em andamento
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Obras</CardTitle>
            <Clock className="icon-md text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{obras.length}</div>
                <p className="text-xs text-muted-foreground">
                  Todas as obras registradas
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="mobilizacao">Mobilização</SelectItem>
            <SelectItem value="execucao">Em Execução</SelectItem>
            <SelectItem value="acabamento">Acabamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="finalizada">Finalizada</SelectItem>
            <SelectItem value="pausada">Pausada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Obras */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredObras.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma obra encontrada"
          description={
            statusFilter !== "all"
              ? "Nenhuma obra encontrada com este status."
              : "As obras serão criadas automaticamente quando você fechar contratos."
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredObras.map((obra) => (
            <Card
              key={obra.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleViewDetails(obra)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {obra.contratos?.clientes?.nome || "Cliente não identificado"}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {obra.contratos?.clientes?.endereco || "Endereço não informado"}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`${STATUS_COLORS[obra.status]} text-white`}
                  >
                    {STATUS_LABELS[obra.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{obra.progresso_pct}%</span>
                  </div>
                  <Progress value={obra.progresso_pct} className="h-2" />
                </div>

                {obra.responsavel_obra && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Responsável: </span>
                    <span className="font-medium">{obra.responsavel_obra}</span>
                  </div>
                )}

                {obra.started_at && (
                  <div className="text-sm text-muted-foreground">
                    Iniciada em{" "}
                    {new Date(obra.started_at).toLocaleDateString("pt-BR")}
                  </div>
                )}

                {obra.completed_at && (
                  <div className="text-sm text-muted-foreground">
                    Concluída em{" "}
                    {new Date(obra.completed_at).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Detalhes */}
      {selectedObra && (
        <ObraDetailsDialog
          obra={selectedObra}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
        />
      )}
    </div>
  );
}
