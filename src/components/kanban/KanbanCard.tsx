import { Phone, Paperclip, CheckSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { QuickActionsMenu } from "./QuickActionsMenu";

interface KanbanCardProps {
  cliente: string;
  lastInteraction: Date;
  valorEstimado: number;
  produtos?: Array<{
    tipo: string;
    medida: number | null;
  }> | null;
  tipoPiso?: string; // Fallback para dados legados
  responsavel: {
    name: string;
    avatar?: string;
  };
  onWhatsApp?: () => void;
  onAttachment?: () => void;
  onTask?: () => void;
  onClick?: () => void;
  currentStage?: string;
  onMoveToStage?: (stageId: string) => void;
  onMarkAsLost?: () => void;
  stages?: Array<{ id: string; title: string; section?: string }>;
  viewMode?: "compact" | "normal" | "detailed";
}

export function KanbanCard({
  cliente,
  lastInteraction,
  valorEstimado,
  produtos,
  tipoPiso,
  responsavel,
  onWhatsApp,
  onAttachment,
  onTask,
  onClick,
  currentStage,
  onMoveToStage,
  onMarkAsLost,
  stages = [],
  viewMode = "normal",
}: KanbanCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Renderizar serviços como chips
  const renderServicos = () => {
    // Processar produtos do campo JSONB
    if (produtos && Array.isArray(produtos) && produtos.length > 0) {
      const servicosTexto = produtos.map(p => {
        if (p.tipo?.startsWith("Outro:")) {
          return p.tipo.replace("Outro:", "Outro —");
        }
        return p.tipo;
      }).join(", ");

      return (
        <div className="flex flex-wrap gap-1.5" title={servicosTexto}>
          {produtos.slice(0, 2).map((produto, index) => {
            let displayTipo = produto.tipo;
            if (produto.tipo?.startsWith("Outro:")) {
              displayTipo = produto.tipo.replace("Outro:", "Outro —");
            }
            
            // Adicionar metragem se existir (verificar tanto number quanto string)
            const medidaValue = produto.medida;
            const medidaText = medidaValue && Number(medidaValue) > 0 ? ` - ${medidaValue}m²` : '';
            
            return (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-[11px] px-2 py-0.5 font-normal"
              >
                {displayTipo}{medidaText}
              </Badge>
            );
          })}
          {produtos.length > 2 && (
            <Badge 
              variant="secondary" 
              className="text-[11px] px-2 py-0.5 font-normal"
              title={servicosTexto}
            >
              +{produtos.length - 2}
            </Badge>
          )}
        </div>
      );
    }
    
    // Fallback para dados legados (tipo_piso)
    if (tipoPiso && tipoPiso !== "Não especificado") {
      const tipos = tipoPiso.split(",").map(t => t.trim());
      const servicosTexto = tipos.map(t => {
        if (t?.startsWith("Outro:")) {
          return t.replace("Outro:", "Outro —");
        }
        return t;
      }).join(", ");

      return (
        <div className="flex flex-wrap gap-1.5" title={servicosTexto}>
          {tipos.slice(0, 2).map((tipo, index) => {
            let displayTipo = tipo;
            if (tipo?.startsWith("Outro:")) {
              displayTipo = tipo.replace("Outro:", "Outro —");
            }
            
            return (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-[11px] px-2 py-0.5 font-normal"
              >
                {displayTipo}
              </Badge>
            );
          })}
          {tipos.length > 2 && (
            <Badge 
              variant="secondary" 
              className="text-[11px] px-2 py-0.5 font-normal"
              title={servicosTexto}
            >
              +{tipos.length - 2}
            </Badge>
          )}
        </div>
      );
    }
    
    // Sem dados
    return <span className="text-caption text-muted-foreground">—</span>;
  };

  const cardPadding = viewMode === "compact" ? "p-3" : viewMode === "detailed" ? "p-5" : "p-4";
  const headerSize = viewMode === "compact" ? "text-caption" : "text-body";
  const showAvatar = viewMode !== "compact";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.02 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 28,
      }}
    >
      <Card 
        className={`${cardPadding} cursor-grab active:cursor-grabbing hover:shadow-elev2 transition-shadow group`}
        onClick={(e) => {
          if (onClick && !(e.target as HTMLElement).closest('button')) {
            onClick();
          }
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h4 className={`${headerSize} font-medium text-foreground flex-1`}>{cliente}</h4>
          <div className="flex items-center gap-1">
            {currentStage && onMoveToStage && onMarkAsLost && (
              <QuickActionsMenu
                currentStage={currentStage}
                onMoveToStage={onMoveToStage}
                onMarkAsLost={onMarkAsLost}
                stages={stages}
              />
            )}
            <span className="text-caption text-muted-foreground">
              {formatDistanceToNow(lastInteraction, { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        </div>

        {/* Value and Services */}
        <div className="flex items-start gap-2 mb-4">
          <span className="text-body font-semibold text-primary whitespace-nowrap">
            {formatCurrency(valorEstimado)}
          </span>
          {renderServicos()}
        </div>

        {/* Footer - Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            {onWhatsApp && (
              <Button
                variant="ghost"
                size="icon"
                className={`${viewMode === "compact" ? "h-7 w-7" : "h-9 w-9"} hover:bg-green-500/10 hover:text-green-600 transition-colors`}
                onClick={(e) => {
                  e.stopPropagation();
                  onWhatsApp();
                }}
              >
                <Phone className={viewMode === "compact" ? "h-3.5 w-3.5" : "h-5 w-5"} />
              </Button>
            )}
            {onAttachment && (
              <Button
                variant="ghost"
                size="icon"
                className={`${viewMode === "compact" ? "h-7 w-7" : "h-9 w-9"} hover:bg-primary/10 transition-colors`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAttachment();
                }}
              >
                <Paperclip className={viewMode === "compact" ? "h-3.5 w-3.5" : "h-5 w-5"} />
              </Button>
            )}
            {onTask && (
              <Button
                variant="ghost"
                size="icon"
                className={`${viewMode === "compact" ? "h-7 w-7" : "h-9 w-9"} hover:bg-primary/10 transition-colors`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTask();
                }}
              >
                <CheckSquare className={viewMode === "compact" ? "h-3.5 w-3.5" : "h-5 w-5"} />
              </Button>
            )}
          </div>
          {showAvatar && (
            <Avatar className="h-7 w-7">
              <AvatarImage src={responsavel.avatar} />
              <AvatarFallback className="text-[11px]">
                {getInitials(responsavel.name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
