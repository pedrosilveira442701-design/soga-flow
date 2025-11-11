import { MoreVertical, ChevronRight, ChevronLeft, MoveRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface QuickActionsMenuProps {
  currentStage: string;
  onMoveToStage: (stageId: string) => void;
  onMarkAsLost: () => void;
  stages: Array<{ id: string; title: string; section?: string }>;
}

export function QuickActionsMenu({
  currentStage,
  onMoveToStage,
  onMarkAsLost,
  stages,
}: QuickActionsMenuProps) {
  const currentIndex = stages.findIndex((s) => s.id === currentStage);
  const canMoveForward = currentIndex < stages.length - 1 && stages[currentIndex + 1]?.id !== "perdido";
  const canMoveBackward = currentIndex > 0;

  const handleMoveForward = () => {
    if (canMoveForward) {
      onMoveToStage(stages[currentIndex + 1].id);
    }
  };

  const handleMoveBackward = () => {
    if (canMoveBackward) {
      onMoveToStage(stages[currentIndex - 1].id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {canMoveForward && (
          <DropdownMenuItem onClick={handleMoveForward}>
            <ChevronRight className="mr-2 h-4 w-4" />
            Avançar Etapa
            <span className="ml-auto text-caption text-muted-foreground">
              {stages[currentIndex + 1]?.title}
            </span>
          </DropdownMenuItem>
        )}
        {canMoveBackward && (
          <DropdownMenuItem onClick={handleMoveBackward}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Retroceder Etapa
            <span className="ml-auto text-caption text-muted-foreground">
              {stages[currentIndex - 1]?.title}
            </span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <MoveRight className="mr-2 h-4 w-4" />
            Ir para...
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            {stages
              .filter((s) => s.id !== currentStage && s.id !== "perdido")
              .map((stage) => (
                <DropdownMenuItem
                  key={stage.id}
                  onClick={() => onMoveToStage(stage.id)}
                >
                  {stage.title}
                  {stage.section && (
                    <span className="ml-auto text-caption text-muted-foreground">
                      {stage.section}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onMarkAsLost} className="text-destructive">
          <XCircle className="mr-2 h-4 w-4" />
          Marcar como Perdido
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
