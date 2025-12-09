import { MetaComInsights } from "@/hooks/useMetas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  User, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MetaCardProps {
  meta: MetaComInsights;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
  onRecalcular: () => void;
}

const TIPO_COLORS: Record<string, string> = {
  "Vendas (R$)": "bg-green-500/10 text-green-500 border-green-500/20",
  "Propostas (#)": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Conversão (%)": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "Contratos (#)": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Novos Clientes (#)": "bg-pink-500/10 text-pink-500 border-pink-500/20",
};

const STATUS_CONFIG = {
  ativa: { label: "Ativa", variant: "default" as const },
  concluida: { label: "Concluída", variant: "secondary" as const },
  cancelada: { label: "Cancelada", variant: "destructive" as const },
};

export function MetaCard({ meta, onEdit, onDelete, onViewDetails, onRecalcular }: MetaCardProps) {
  const getProgressColor = (progresso: number) => {
    if (progresso >= 100) return "bg-green-500";
    if (progresso >= 75) return "bg-blue-500";
    if (progresso >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getSituacaoIcon = () => {
    switch (meta.situacao) {
      case 'acima':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'no_ritmo':
        return <Activity className="h-5 w-5 text-blue-500" />;
      case 'atrasado':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'concluido':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'cancelado':
        return <XCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getSituacaoText = () => {
    switch (meta.situacao) {
      case 'acima':
        return "Acima do esperado";
      case 'no_ritmo':
        return "No ritmo esperado";
      case 'atrasado':
        return "Atrás do planejado";
      case 'concluido':
        return "Meta concluída!";
      case 'cancelado':
        return "Meta cancelada";
    }
  };

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

  return (
    <div className="group relative bg-card border rounded-lg p-6 hover:shadow-lg transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-2">
          <Badge className={TIPO_COLORS[meta.tipo] || "bg-muted"}>
            {meta.tipo}
          </Badge>
          <Badge variant={STATUS_CONFIG[meta.status as keyof typeof STATUS_CONFIG]?.variant || "default"}>
            {STATUS_CONFIG[meta.status as keyof typeof STATUS_CONFIG]?.label || meta.status}
          </Badge>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewDetails}>
              Ver Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRecalcular}>
              Recalcular Progresso
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              Cancelar Meta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Título */}
      <h3 className="text-lg font-semibold mb-2">
        {meta.tipo} - {format(new Date(meta.periodo_inicio), "MMM/yy", { locale: ptBR })}
      </h3>

      {/* Responsável */}
      {meta.responsavel && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <User className="h-5 w-5" />
          <span>{meta.responsavel}</span>
        </div>
      )}

      {/* Progresso */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Progresso</span>
          <span className="text-2xl font-bold">{meta.progresso.toFixed(1)}%</span>
        </div>
        
        <Progress 
          value={Math.min(meta.progresso, 100)} 
          className="h-3"
        />
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatarValor(valorAtual)}</span>
          <span>de {formatarValor(meta.valor_alvo)}</span>
        </div>
      </div>

      {/* Tempo */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tempo</span>
          <span className="font-medium">
            {meta.diasRestantes > 0 
              ? `${meta.diasRestantes} dias restantes`
              : meta.diasRestantes === 0
              ? "Último dia!"
              : `Encerrada há ${Math.abs(meta.diasRestantes)} dias`
            }
          </span>
        </div>
        
        <Progress 
          value={Math.min(meta.tempoDecorrido, 100)} 
          className="h-2"
        />
      </div>

      {/* Insight de Situação */}
      <div className={`flex items-center gap-2 p-3 rounded-md mb-4 ${
        meta.situacao === 'acima' ? 'bg-green-500/10' :
        meta.situacao === 'no_ritmo' ? 'bg-blue-500/10' :
        meta.situacao === 'atrasado' ? 'bg-red-500/10' :
        meta.situacao === 'concluido' ? 'bg-green-500/10' :
        'bg-muted'
      }`}>
        {getSituacaoIcon()}
        <span className="text-sm font-medium">{getSituacaoText()}</span>
      </div>

      {/* Alertas */}
      {meta.alertas.length > 0 && (
        <div className="space-y-1 mb-4">
          {meta.alertas.map((alerta, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              <span>{alerta}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {format(new Date(meta.periodo_inicio), "dd/MM/yy")} → {format(new Date(meta.periodo_fim), "dd/MM/yy")}
          </span>
        </div>
        
        <Button variant="outline" size="sm" onClick={onViewDetails}>
          Ver Detalhes
        </Button>
      </div>
    </div>
  );
}
