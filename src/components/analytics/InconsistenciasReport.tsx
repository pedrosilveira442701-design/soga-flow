import { useInconsistencias, Inconsistencia } from "@/hooks/useInconsistencias";
import { usePropostas } from "@/hooks/usePropostas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, RefreshCw, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ESTAGIO_LABELS: Record<string, string> = {
  contato: "Contato",
  visita_agendada: "Visita Agendada",
  visita_realizada: "Visita Realizada",
  proposta_pendente: "Proposta Pendente",
  proposta: "Proposta",
  contrato: "Contrato",
  execucao: "Execução",
  finalizado: "Finalizado",
  perdido: "Perdido",
  em_analise: "Em Análise",
  repouso: "Repouso",
};

const STATUS_LABELS: Record<string, string> = {
  aberta: "Aberta",
  fechada: "Fechada",
  perdida: "Perdida",
  repouso: "Repouso",
};

const TIPO_COLORS: Record<string, string> = {
  lead_perdido_proposta_nao: "bg-red-500/10 text-red-600 border-red-500/20",
  lead_repouso_proposta_nao: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  lead_finalizado_proposta_nao: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  outro: "bg-muted text-muted-foreground",
};

export function InconsistenciasReport() {
  const { data: inconsistencias, isLoading, refetch, isRefetching } = useInconsistencias();
  const { updateStatus } = usePropostas();

  const handleCorrigir = async (item: Inconsistencia) => {
    try {
      await updateStatus.mutateAsync({
        id: item.proposta_id,
        status: item.status_esperado,
      });
      toast.success(`Proposta atualizada para "${STATUS_LABELS[item.status_esperado]}"`);
      refetch();
    } catch (error) {
      toast.error("Erro ao corrigir proposta");
    }
  };

  const handleCorrigirTodas = async () => {
    if (!inconsistencias || inconsistencias.length === 0) return;

    let corrigidas = 0;
    let erros = 0;

    for (const item of inconsistencias) {
      try {
        await updateStatus.mutateAsync({
          id: item.proposta_id,
          status: item.status_esperado,
        });
        corrigidas++;
      } catch {
        erros++;
      }
    }

    if (corrigidas > 0) {
      toast.success(`${corrigidas} proposta(s) corrigida(s) com sucesso`);
    }
    if (erros > 0) {
      toast.error(`${erros} proposta(s) não puderam ser corrigidas`);
    }

    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasInconsistencias = inconsistencias && inconsistencias.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            {hasInconsistencias ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            Relatório de Inconsistências
          </CardTitle>
          <CardDescription>
            Leads e propostas com status divergentes que precisam de atenção
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          {hasInconsistencias && (
            <Button
              variant="default"
              size="sm"
              onClick={handleCorrigirTodas}
              disabled={updateStatus.isPending}
            >
              Corrigir Todas ({inconsistencias.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasInconsistencias ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Nenhuma inconsistência encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Todos os leads e propostas estão com status sincronizados
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumo por tipo */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(
                inconsistencias.reduce((acc, item) => {
                  acc[item.tipo] = (acc[item.tipo] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([tipo, count]) => (
                <Badge key={tipo} variant="outline" className={TIPO_COLORS[tipo]}>
                  {tipo === "lead_perdido_proposta_nao" && "Lead perdido, proposta não"}
                  {tipo === "lead_repouso_proposta_nao" && "Lead em repouso, proposta não"}
                  {tipo === "lead_finalizado_proposta_nao" && "Lead finalizado, proposta não fechada"}
                  {tipo === "outro" && "Outros"}
                  : {count}
                </Badge>
              ))}
            </div>

            {/* Tabela de inconsistências */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Lead (Estágio)</TableHead>
                    <TableHead className="text-center">
                      <ArrowRight className="h-4 w-4 mx-auto" />
                    </TableHead>
                    <TableHead>Proposta (Status)</TableHead>
                    <TableHead>Status Esperado</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inconsistencias.map((item) => (
                    <TableRow key={`${item.lead_id}-${item.proposta_id}`}>
                      <TableCell className="font-medium">{item.cliente_nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ESTAGIO_LABELS[item.lead_estagio] || item.lead_estagio}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {STATUS_LABELS[item.proposta_status] || item.proposta_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          {STATUS_LABELS[item.status_esperado] || item.status_esperado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCorrigir(item)}
                          disabled={updateStatus.isPending}
                        >
                          Corrigir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
