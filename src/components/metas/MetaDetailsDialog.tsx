import { MetaComInsights } from "@/hooks/useMetas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  User,
  Target,
  Clock,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MetaDetailsDialogProps {
  meta: MetaComInsights | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function MetaDetailsDialog({ meta, open, onOpenChange, onEdit }: MetaDetailsDialogProps) {
  if (!meta) return null;

  const formatarValor = (valor: number) => {
    if (meta.tipo.includes("R$")) {
      return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    if (meta.tipo.includes("%")) {
      return `${valor.toFixed(1)}%`;
    }
    return Math.round(valor).toString();
  };

  const valorAtual = (meta.valor_alvo * meta.progresso) / 100;
  const valorRestante = meta.valor_alvo - valorAtual;
  
  const diasTotais = Math.ceil(
    (new Date(meta.periodo_fim).getTime() - new Date(meta.periodo_inicio).getTime()) / (1000 * 60 * 60 * 24)
  );
  const diasDecorridos = diasTotais - meta.diasRestantes;
  
  const mediaDiariaNecessaria = meta.diasRestantes > 0 ? valorRestante / meta.diasRestantes : 0;
  const mediaAtual = diasDecorridos > 0 ? valorAtual / diasDecorridos : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-2xl">{meta.tipo}</DialogTitle>
              <Badge variant={meta.status === 'ativa' ? 'default' : 'secondary'}>
                {meta.status}
              </Badge>
            </div>
            <Button variant="outline" onClick={onEdit}>
              Editar
            </Button>
          </div>
          <DialogDescription>
            Período: {format(new Date(meta.periodo_inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} até {format(new Date(meta.periodo_fim), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="visao-geral" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral" className="space-y-6 mt-6">
            {/* Progresso Visual Grande */}
            <div className="bg-muted/30 rounded-lg p-6">
              <div className="text-center mb-4">
                <div className="text-5xl font-bold mb-2">
                  {meta.progresso.toFixed(1)}%
                </div>
                <div className="text-muted-foreground">
                  {formatarValor(valorAtual)} de {formatarValor(meta.valor_alvo)}
                </div>
              </div>
              
              <Progress value={Math.min(meta.progresso, 100)} className="h-4 mb-2" />
              
              <div className="flex items-center justify-center gap-2 mt-4">
                {meta.situacao === 'acima' && (
                  <>
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span className="text-green-500 font-medium">Acima do esperado</span>
                  </>
                )}
                {meta.situacao === 'no_ritmo' && (
                  <>
                    <Activity className="h-5 w-5 text-blue-500" />
                    <span className="text-blue-500 font-medium">No ritmo esperado</span>
                  </>
                )}
                {meta.situacao === 'atrasado' && (
                  <>
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    <span className="text-red-500 font-medium">Atrás do planejado</span>
                  </>
                )}
              </div>
            </div>

            {/* Informações Básicas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Target className="h-5 w-5" />
                  <span className="text-sm">Meta</span>
                </div>
                <div className="text-2xl font-bold">{formatarValor(meta.valor_alvo)}</div>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-sm">Falta</span>
                </div>
                <div className="text-2xl font-bold">{formatarValor(Math.max(0, valorRestante))}</div>
              </div>

              {meta.responsavel && (
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <User className="h-5 w-5" />
                    <span className="text-sm">Responsável</span>
                  </div>
                  <div className="font-medium">{meta.responsavel}</div>
                </div>
              )}

              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Clock className="h-5 w-5" />
                  <span className="text-sm">Tempo Restante</span>
                </div>
                <div className="text-xl font-bold">
                  {meta.diasRestantes > 0 ? `${meta.diasRestantes} dias` : 'Encerrada'}
                </div>
              </div>
            </div>

            {/* Timeline de Tempo */}
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Linha do Tempo</span>
                <span className="text-sm text-muted-foreground">
                  {meta.tempoDecorrido.toFixed(0)}% do tempo consumido
                </span>
              </div>
              <Progress value={Math.min(meta.tempoDecorrido, 100)} className="h-3 mb-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-5 w-5" />
                  {format(new Date(meta.periodo_inicio), "dd/MM/yy")}
                </div>
                <div>Hoje</div>
                <div className="flex items-center gap-1">
                  {format(new Date(meta.periodo_fim), "dd/MM/yy")}
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6 mt-6">
            {/* Insights Inteligentes */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Análise de Performance</h3>
              
              <div className="bg-card border rounded-lg p-4">
                <div className="font-medium mb-2">📊 Para atingir a meta:</div>
                <ul className="space-y-2 text-sm">
                  {valorRestante > 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>Faltam <strong>{formatarValor(valorRestante)}</strong> para atingir o objetivo</span>
                    </li>
                  )}
                  
                  {meta.diasRestantes > 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>
                        Média necessária: <strong>{formatarValor(mediaDiariaNecessaria)}/dia</strong> pelos próximos {meta.diasRestantes} dias
                      </span>
                    </li>
                  )}
                  
                  {diasDecorridos > 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>Média atual: <strong>{formatarValor(mediaAtual)}/dia</strong></span>
                    </li>
                  )}
                  
                  {meta.progresso > meta.progressoEsperado && (
                    <li className="flex items-start gap-2 text-green-600 dark:text-green-500">
                      <span>✓</span>
                      <span>
                        Você está <strong>{(meta.progresso - meta.progressoEsperado).toFixed(1)}%</strong> acima do esperado
                      </span>
                    </li>
                  )}
                  
                  {meta.progresso < meta.progressoEsperado && meta.status === 'ativa' && (
                    <li className="flex items-start gap-2 text-red-600 dark:text-red-500">
                      <span>⚠</span>
                      <span>
                        Você está <strong>{(meta.progressoEsperado - meta.progresso).toFixed(1)}%</strong> abaixo do esperado
                      </span>
                    </li>
                  )}
                </ul>
              </div>

              {meta.alertas.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="font-medium mb-2 flex items-center gap-2">
                    <span className="text-yellow-600 dark:text-yellow-500">⚠️</span>
                    Alertas
                  </div>
                  <ul className="space-y-1 text-sm">
                    {meta.alertas.map((alerta, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{alerta}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-card border rounded-lg p-4">
                <div className="font-medium mb-2">📈 Comparação Temporal</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progresso Atual</span>
                    <span className="font-medium">{meta.progresso.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progresso Esperado</span>
                    <span className="font-medium">{meta.progressoEsperado.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Diferença</span>
                    <span className={`font-medium ${
                      meta.progresso >= meta.progressoEsperado ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {meta.progresso >= meta.progressoEsperado ? '+' : ''}
                      {(meta.progresso - meta.progressoEsperado).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
