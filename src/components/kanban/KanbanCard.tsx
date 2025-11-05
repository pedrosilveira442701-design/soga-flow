import { MessageSquare, Paperclip, CheckSquare } from "lucide-react";
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
  tipoPiso: string;
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

        {/* Value and Type */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-body font-semibold text-primary">
            {formatCurrency(valorEstimado)}
          </span>
          <Badge variant="secondary" className="text-caption">
            {tipoPiso}
          </Badge>
        </div>

        {/* Footer - Actions and Avatar */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1">
            {onWhatsApp && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onWhatsApp();
                }}
              >
                <MessageSquare className="h-4 w-4 icon-thin" />
              </Button>
            )}
            {onAttachment && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onAttachment();
                }}
              >
                <Paperclip className="h-4 w-4 icon-thin" />
              </Button>
            )}
            {onTask && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onTask();
                }}
              >
                <CheckSquare className="h-4 w-4 icon-thin" />
              </Button>
            )}
          </div>
          <Avatar className="h-8 w-8">
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
