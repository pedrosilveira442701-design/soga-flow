import { Phone, Paperclip, CheckSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

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
        className="p-4 cursor-grab active:cursor-grabbing hover:shadow-elev2 transition-shadow"
        onClick={(e) => {
          if (onClick && !(e.target as HTMLElement).closest('button')) {
            onClick();
          }
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h4 className="text-body font-medium text-foreground">{cliente}</h4>
          <span className="text-caption text-muted-foreground">
            {formatDistanceToNow(lastInteraction, { addSuffix: true, locale: ptBR })}
          </span>
        </div>

        {/* Value and Services */}
        <div className="flex items-start gap-2 mb-4">
          <span className="text-body font-semibold text-primary whitespace-nowrap">
            {formatCurrency(valorEstimado)}
          </span>
          {renderServicos()}
        </div>

        {/* Footer - Actions and Avatar */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            {onWhatsApp && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-green-500/10 hover:text-green-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onWhatsApp();
                }}
              >
                <Phone className="h-5 w-5" />
              </Button>
            )}
            {onAttachment && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-primary/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onAttachment();
                }}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            )}
            {onTask && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-primary/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onTask();
                }}
              >
                <CheckSquare className="h-5 w-5" />
              </Button>
            )}
          </div>
          <Avatar className="h-9 w-9">
            <AvatarImage src={responsavel.avatar} alt={responsavel.name} />
            <AvatarFallback className="text-[11px]">
              {getInitials(responsavel.name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </Card>
    </motion.div>
  );
}
