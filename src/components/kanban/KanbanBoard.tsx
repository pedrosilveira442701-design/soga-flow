import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { ContatoMiniCard } from "@/components/contatos/ContatoMiniCard";
import type { Database } from "@/integrations/supabase/types";
import type { Contato } from "@/hooks/useContatos";

type Lead = Database["public"]["Tables"]["leads"]["Row"] & {
  clientes?: {
    nome: string;
    telefone?: string;
    endereco?: string;
  } | null;
};

type LeadStage = Database["public"]["Enums"]["lead_stage"];

interface KanbanBoardProps {
  leads: Lead[];
  onStageChange: (leadId: string, newStage: LeadStage, motivo?: string) => void;
  onCardClick: (lead: Lead) => void;
  contatosNaoConvertidos?: Contato[];
  onConvertContato?: (contato: Contato) => void;
  onEditContato?: (contato: Contato) => void;
  onDeleteContato?: (contato: Contato) => void;
  onLossReasonRequired?: (leadId: string, onConfirm: (motivo: string) => void) => void;
  zoom?: number;
  viewMode?: "compact" | "normal" | "detailed";
  onNavigateToColumn?: (index: number) => void;
}

const STAGES = [
  // COMERCIAL
  { id: "contato", title: "Entrou em Contato", color: "contato", section: "comercial" },
  { id: "visita_agendada", title: "Visita Agendada", color: "contato", section: "comercial" },
  { id: "visita_realizada", title: "Visita Realizada", color: "contato", section: "comercial" },
  { id: "proposta_pendente", title: "Proposta Pendente", color: "proposta", section: "comercial" },
  { id: "proposta", title: "Gerou Proposta", color: "proposta", section: "comercial" },
  { id: "em_analise", title: "Em análise", color: "qualificado", section: "comercial" },
  { id: "contrato", title: "Fechou Contrato", color: "ganho", section: "comercial" },

  // OPERACIONAL
  { id: "execucao", title: "Em Execução", color: "qualificado", section: "operacional" },
  { id: "finalizado", title: "Finalizado", color: "ganho", section: "operacional" },

  // REPOUSO
  { id: "repouso", title: "Repouso", color: "repouso", section: "perdido" },

  // PERDIDOS
  { id: "perdido", title: "Perdido", color: "perdido", section: "perdido" },
] as const;

function SortableCard({
  lead,
  onClick,
  onMoveToStage,
  onMarkAsLost,
  viewMode,
}: {
  lead: Lead;
  onClick: () => void;
  onMoveToStage: (stageId: string) => void;
  onMarkAsLost: () => void;
  viewMode?: "compact" | "normal" | "detailed";
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard
        cliente={lead.clientes?.nome || "Cliente não identificado"}
        lastInteraction={lead.ultima_interacao ? new Date(lead.ultima_interacao) : new Date(lead.created_at)}
        valorEstimado={Number(lead.valor_potencial) || 0}
        produtos={lead.produtos as Array<{ tipo: string; medida: number | null }> | null}
        tipoPiso={lead.tipo_piso}
        responsavel={{
          name: lead.responsavel || "Não atribuído",
        }}
        onWhatsApp={() => {
          if (lead.clientes?.telefone) {
            window.open(`https://wa.me/${lead.clientes.telefone.replace(/\D/g, "")}`, "_blank");
          }
        }}
        onClick={onClick}
        currentStage={lead.estagio}
        onMoveToStage={onMoveToStage}
        onMarkAsLost={onMarkAsLost}
        stages={STAGES.map((s) => ({ id: s.id, title: s.title, section: s.section }))}
        viewMode={viewMode}
      />
    </div>
  );
}

export function KanbanBoard({
  leads,
  onStageChange,
  onCardClick,
  contatosNaoConvertidos = [],
  onConvertContato,
  onEditContato,
  onDeleteContato,
  onLossReasonRequired,
  zoom = 100,
  viewMode = "normal",
  onNavigateToColumn,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingNearEdge, setIsDraggingNearEdge] = useState<"left" | "right" | null>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // Auto-scroll durante drag
  useEffect(() => {
    if (!isDraggingNearEdge || !containerRef.current) return;

    const scrollSpeed = 15;
    const interval = setInterval(() => {
      if (!containerRef.current) return;

      if (isDraggingNearEdge === "left") {
        containerRef.current.scrollLeft -= scrollSpeed;
      } else if (isDraggingNearEdge === "right") {
        containerRef.current.scrollLeft += scrollSpeed;
      }
    }, 16);

    return () => clearInterval(interval);
  }, [isDraggingNearEdge]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragMove = (event: any) => {
    if (!containerRef.current) return;

    const { activatorEvent } = event;
    if (!activatorEvent) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const clientX = activatorEvent.clientX;
    const edgeThreshold = 100;

    if (clientX < containerRect.left + edgeThreshold) {
      setIsDraggingNearEdge("left");
    } else if (clientX > containerRect.right - edgeThreshold) {
      setIsDraggingNearEdge("right");
    } else {
      setIsDraggingNearEdge(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as LeadStage;

    // Debug: Log values before update
    console.log("🔄 Kanban Drag End:", {
      leadId,
      newStage,
      isValidStage: STAGES.some((stage) => stage.id === newStage),
      validStages: STAGES.map((s) => s.id),
    });

    if (STAGES.some((stage) => stage.id === newStage)) {
      // Se estiver movendo para "perdido", solicitar motivo
      if (newStage === "perdido" && onLossReasonRequired) {
        onLossReasonRequired(leadId, (motivo: string) => {
          onStageChange(leadId, newStage, motivo);
        });
      } else {
        onStageChange(leadId, newStage);
      }
    }

    setActiveId(null);
    setIsDraggingNearEdge(null);
  };

  const getLeadsByStage = (stage: string) => {
    return leads.filter((lead) => lead.estagio === stage);
  };

  const handleMoveToStage = (leadId: string, newStage: string) => {
    if (newStage === "perdido" && onLossReasonRequired) {
      onLossReasonRequired(leadId, (motivo: string) => {
        onStageChange(leadId, newStage as LeadStage, motivo);
      });
    } else {
      onStageChange(leadId, newStage as LeadStage);
    }
  };

  const handleMarkAsLost = (leadId: string) => {
    if (onLossReasonRequired) {
      onLossReasonRequired(leadId, (motivo: string) => {
        onStageChange(leadId, "perdido", motivo);
      });
    }
  };

  const activeLead = activeId ? leads.find((lead) => lead.id === activeId) : null;

  // Expor função de navegação para componente pai
  useEffect(() => {
    if (onNavigateToColumn) {
      (window as any).__kanbanNavigateToColumn = (index: number) => {
        const column = columnRefs.current[index];
        if (column && containerRef.current) {
          column.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
        }
      };
    }
    return () => {
      delete (window as any).__kanbanNavigateToColumn;
    };
  }, [onNavigateToColumn]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragMove={handleDragMove}>
      <div
        ref={containerRef}
        className="flex gap-6 overflow-x-auto pb-6 min-h-[calc(100vh-12rem)] scroll-smooth"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "top left",
          width: `${100 / (zoom / 100)}%`,
        }}
      >
        {STAGES.map((stage, index) => {
          const stageLeads = getLeadsByStage(stage.id);
          const isFirstOperacional =
            stage.section === "operacional" && (index === 0 || STAGES[index - 1].section !== "operacional");
          const isFirstPerdido =
            stage.section === "perdido" && (index === 0 || STAGES[index - 1].section !== "perdido");

          return (
            <div key={stage.id} className="flex gap-6">
              {isFirstOperacional && (
                <div className="flex items-center">
                  <div className="h-full w-px bg-border" />
                  <div className="mx-2 px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Operacional →
                  </div>
                  <div className="h-full w-px bg-border" />
                </div>
              )}
              {isFirstPerdido && (
                <div className="flex items-center">
                  <div className="h-full w-px bg-border" />
                  <div className="mx-2 px-3 py-1 bg-destructive/10 rounded-full text-xs font-medium text-destructive whitespace-nowrap">
                    Perdidos
                  </div>
                  <div className="h-full w-px bg-border" />
                </div>
              )}
              <KanbanColumn
                id={stage.id}
                title={stage.title}
                count={stageLeads.length}
                color={stage.color}
                viewMode={viewMode}
                columnRef={(el) => {
                  columnRefs.current[index] = el;
                }}
                additionalContent={
                  stage.id === "contato" &&
                  contatosNaoConvertidos.length > 0 &&
                  onConvertContato &&
                  onEditContato &&
                  onDeleteContato ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-border/50" />
                        <span className="text-xs font-medium text-muted-foreground">
                          Contatos Não Convertidos ({contatosNaoConvertidos.length})
                        </span>
                        <div className="h-px flex-1 bg-border/50" />
                      </div>
                      {contatosNaoConvertidos.slice(0, 5).map((contato) => (
                        <ContatoMiniCard
                          key={contato.id}
                          contato={contato}
                          onConvertToLead={onConvertContato}
                          onEdit={onEditContato}
                          onDelete={onDeleteContato}
                        />
                      ))}
                      {contatosNaoConvertidos.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center py-1">
                          + {contatosNaoConvertidos.length - 5} contatos não exibidos
                        </p>
                      )}
                    </div>
                  ) : undefined
                }
              >
                {stageLeads.map((lead) => (
                  <SortableCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => onCardClick(lead)}
                    onMoveToStage={(newStage) => handleMoveToStage(lead.id, newStage)}
                    onMarkAsLost={() => handleMarkAsLost(lead.id)}
                    viewMode={viewMode}
                  />
                ))}
              </KanbanColumn>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeLead && (
          <div className="rotate-3 scale-105 shadow-2xl">
            <KanbanCard
              cliente={activeLead.clientes?.nome || "Cliente não identificado"}
              lastInteraction={
                activeLead.ultima_interacao ? new Date(activeLead.ultima_interacao) : new Date(activeLead.created_at)
              }
              valorEstimado={Number(activeLead.valor_potencial) || 0}
              produtos={activeLead.produtos as Array<{ tipo: string; medida: number | null }> | null}
              tipoPiso={activeLead.tipo_piso}
              responsavel={{
                name: activeLead.responsavel || "Não atribuído",
              }}
              viewMode={viewMode}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
