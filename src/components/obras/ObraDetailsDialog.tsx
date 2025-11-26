import { useState } from "react";
import { Play, CheckCircle2, Plus, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useObras, type Obra } from "@/hooks/useObras";
import { toast } from "sonner";

const STATUS_LABELS = {
  mobilizacao: "Mobilização",
  execucao: "Em Execução",
  acabamento: "Acabamento",
  concluida: "Concluída",
  pausada: "Pausada",
};

interface ObraDetailsDialogProps {
  obra: Obra;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ObraDetailsDialog({ obra, open, onOpenChange }: ObraDetailsDialogProps) {
  const { updateObra, iniciarObra, finalizarObra, adicionarOcorrencia, adicionarMarco } = useObras();
  const [progresso, setProgresso] = useState(obra.progresso_pct.toString());
  const [novaOcorrencia, setNovaOcorrencia] = useState({ descricao: "", tipo: "info" });
  const [novoMarco, setNovoMarco] = useState({ descricao: "" });

  const handleIniciar = () => {
    iniciarObra(obra.id);
  };

  const handleFinalizar = () => {
    finalizarObra({ id: obra.id });
  };

  const handleUpdateProgresso = () => {
    const progressoNum = parseFloat(progresso);
    if (isNaN(progressoNum) || progressoNum < 0 || progressoNum > 100) {
      toast.error("Progresso deve ser entre 0 e 100");
      return;
    }
    updateObra({ id: obra.id, progresso_pct: progressoNum });
  };

  const handleUpdateStatus = (status: string) => {
    updateObra({ id: obra.id, status: status as any });
  };

  const handleAdicionarOcorrencia = () => {
    if (!novaOcorrencia.descricao.trim()) {
      toast.error("Descrição da ocorrência é obrigatória");
      return;
    }
    adicionarOcorrencia({
      id: obra.id,
      ocorrencia: {
        data: new Date().toISOString(),
        descricao: novaOcorrencia.descricao,
        tipo: novaOcorrencia.tipo,
      },
    });
    setNovaOcorrencia({ descricao: "", tipo: "info" });
  };

  const handleAdicionarMarco = () => {
    if (!novoMarco.descricao.trim()) {
      toast.error("Descrição do marco é obrigatória");
      return;
    }
    adicionarMarco({
      id: obra.id,
      marco: {
        data: new Date().toISOString(),
        descricao: novoMarco.descricao,
        concluido: true,
      },
    });
    setNovoMarco({ descricao: "" });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{obra.contratos?.clientes?.nome || "Obra"}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {obra.contratos?.clientes?.endereco || "Endereço não informado"}
              </p>
            </div>
            <Badge variant="secondary" className="text-sm">
              {STATUS_LABELS[obra.status]}
            </Badge>
          </div>
        </DialogHeader>

        {/* Ações Rápidas */}
        <div className="flex gap-2">
          {!obra.started_at && (
            <Button onClick={handleIniciar} size="sm">
              <Play className="mr-2 h-4 w-4" />
              Iniciar Obra
            </Button>
          )}
          {obra.started_at && !obra.completed_at && obra.progresso_pct >= 100 && (
            <Button onClick={handleFinalizar} size="sm" variant="default">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Finalizar Obra
            </Button>
          )}
        </div>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="progresso">Progresso</TabsTrigger>
            <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
            <TabsTrigger value="marcos">Marcos</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Contrato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Valor Negociado</Label>
                    <p className="text-lg font-semibold">{formatCurrency(obra.contratos?.valor_negociado || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data de Início</Label>
                    <p className="text-lg font-semibold">
                      {obra.contratos?.data_inicio
                        ? new Date(obra.contratos.data_inicio).toLocaleDateString("pt-BR")
                        : "Não definida"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status da Obra</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Status Atual</Label>
                  <Select value={obra.status} onValueChange={handleUpdateStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobilizacao">Mobilização</SelectItem>
                      <SelectItem value="execucao">Em Execução</SelectItem>
                      <SelectItem value="acabamento">Acabamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="pausada">Pausada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {obra.responsavel_obra && (
                  <div>
                    <Label className="text-muted-foreground">Responsável</Label>
                    <p className="font-medium">{obra.responsavel_obra}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progresso" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Progresso da Obra</CardTitle>
                <CardDescription>Acompanhe o andamento da execução</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Progresso Atual</Label>
                    <span className="text-2xl font-bold">{obra.progresso_pct}%</span>
                  </div>
                  <Progress value={obra.progresso_pct} className="h-3" />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="progresso">Atualizar Progresso (%)</Label>
                    <Input
                      id="progresso"
                      type="number"
                      min="0"
                      max="100"
                      value={progresso}
                      onChange={(e) => setProgresso(e.target.value)}
                      placeholder="0-100"
                    />
                  </div>
                  <Button onClick={handleUpdateProgresso} className="mt-auto">
                    Atualizar
                  </Button>
                </div>

                {obra.started_at && (
                  <div className="text-sm text-muted-foreground">
                    Iniciada em {new Date(obra.started_at).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ocorrencias" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Registrar Ocorrência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="ocorrencia-tipo">Tipo</Label>
                  <Select
                    value={novaOcorrencia.tipo}
                    onValueChange={(tipo) => setNovaOcorrencia({ ...novaOcorrencia, tipo })}
                  >
                    <SelectTrigger id="ocorrencia-tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Informação</SelectItem>
                      <SelectItem value="alerta">Alerta</SelectItem>
                      <SelectItem value="problema">Problema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ocorrencia-desc">Descrição</Label>
                  <Textarea
                    id="ocorrencia-desc"
                    value={novaOcorrencia.descricao}
                    onChange={(e) => setNovaOcorrencia({ ...novaOcorrencia, descricao: e.target.value })}
                    placeholder="Descreva a ocorrência..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleAdicionarOcorrencia} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Ocorrência
                </Button>
              </CardContent>
            </Card>

            {obra.ocorrencias && obra.ocorrencias.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Ocorrências</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {obra.ocorrencias.map((occ: any, index: number) => (
                      <div key={index} className="flex gap-3 border-l-2 border-muted pl-3">
                        <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{occ.tipo}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(occ.data).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{occ.descricao}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="marcos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Marco</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="marco-desc">Descrição do Marco</Label>
                  <Input
                    id="marco-desc"
                    value={novoMarco.descricao}
                    onChange={(e) => setNovoMarco({ descricao: e.target.value })}
                    placeholder="Ex: Fundação concluída"
                  />
                </div>

                <Button onClick={handleAdicionarMarco} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Marco
                </Button>
              </CardContent>
            </Card>

            {obra.marcos && obra.marcos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Marcos Registrados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {obra.marcos.map((marco: any, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{marco.descricao}</p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(marco.data).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
