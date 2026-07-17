import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface KanbanControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  viewMode: "compact" | "normal" | "detailed";
  onViewModeChange: (mode: "compact" | "normal" | "detailed") => void;
  onNavigateLeft: () => void;
  onNavigateRight: () => void;
  canNavigateLeft: boolean;
  canNavigateRight: boolean;
  stages: Array<{ id: string; title: string; count: number; color: string }>;
  activeStageIndex: number;
  onStageClick: (index: number) => void;
}

export function KanbanControls({
  zoom,
  onZoomChange,
  viewMode,
  onViewModeChange,
  onNavigateLeft,
  onNavigateRight,
  canNavigateLeft,
  canNavigateRight,
  stages,
  activeStageIndex,
  onStageClick,
}: KanbanControlsProps) {
  const zoomLevels = [50, 75, 90, 100, 110, 125];

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && canNavigateLeft) {
        onNavigateLeft();
      } else if (e.key === "ArrowRight" && canNavigateRight) {
        onNavigateRight();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [canNavigateLeft, canNavigateRight, onNavigateLeft, onNavigateRight]);

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border pb-4 mb-4">
      {/* Main Controls Row */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onNavigateLeft}
            disabled={!canNavigateLeft}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onNavigateRight}
            disabled={!canNavigateRight}
            className="h-9 w-9"
          >
            <ChevronRight className="h-[18px] w-[18px]" />
          </Button>
          <div className="hidden lg:block text-caption text-muted-foreground ml-2">
            Use ← → para navegar
          </div>
        </div>

        {/* Center: View Mode */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Select value={viewMode} onValueChange={(v) => onViewModeChange(v as any)}>
            <SelectTrigger className="w-full sm:w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">
                <div className="flex items-center gap-2">
                  <Minimize2 className="h-[18px] w-[18px]" />
                  Compacta
                </div>
              </SelectItem>
              <SelectItem value="normal">
                <div className="flex items-center gap-2">
                  <Maximize2 className="h-[18px] w-[18px]" />
                  Normal
                </div>
              </SelectItem>
              <SelectItem value="detailed">
                <div className="flex items-center gap-2">
                  <Maximize2 className="h-[18px] w-[18px]" />
                  Detalhada
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right: Zoom Controls */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const currentIndex = zoomLevels.indexOf(zoom);
              if (currentIndex > 0) {
                onZoomChange(zoomLevels[currentIndex - 1]);
              }
            }}
            disabled={zoom <= zoomLevels[0]}
            className="h-9 w-9 shrink-0"
          >
            <ZoomOut className="h-[18px] w-[18px]" />
          </Button>
          <div className="flex flex-1 gap-1 overflow-x-auto no-scrollbar sm:flex-none">
            {zoomLevels.map((level) => (
              <Button
                key={level}
                variant={zoom === level ? "default" : "ghost"}
                size="sm"
                onClick={() => onZoomChange(level)}
                className="h-9 min-w-[50px] shrink-0"
              >
                {level}%
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const currentIndex = zoomLevels.indexOf(zoom);
              if (currentIndex < zoomLevels.length - 1) {
                onZoomChange(zoomLevels[currentIndex + 1]);
              }
            }}
            disabled={zoom >= zoomLevels[zoomLevels.length - 1]}
            className="h-9 w-9 shrink-0"
          >
            <ZoomIn className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </div>

      {/* Minimapa - Visual Overview */}
      <div className="flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-2 [-webkit-overflow-scrolling:touch]">
        {stages.map((stage, index) => {
          const colorClasses = {
            contato: "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20",
            qualificado: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20",
            proposta: "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20",
            ganho: "bg-green-500/10 border-green-500/30 hover:bg-green-500/20",
            perdido: "bg-red-500/10 border-red-500/30 hover:bg-red-500/20",
          };

          return (
            <button
              key={stage.id}
              onClick={() => onStageClick(index)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all min-w-fit",
                activeStageIndex === index
                  ? "border-primary bg-primary/10 shadow-sm"
                  : colorClasses[stage.color as keyof typeof colorClasses] || "bg-muted border-border hover:bg-muted/80"
              )}
            >
              <span className="text-caption font-medium text-foreground whitespace-nowrap">
                {stage.title}
              </span>
              <Badge variant="secondary" className="text-[11px]">
                {stage.count}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
