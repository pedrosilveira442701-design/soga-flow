import { useState } from "react";
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
  onStageChange: (leadId: string, newStage: LeadStage) => void;
  onCardClick: (lead: Lead) => void;
  contatosNaoConvertidos?: Contato[];
  onConvertContato?: (contato: Contato) => void;
  onEditContato?: (contato: Contato) => void;
}

const STAGES = [
  // COMERCIAL
  { id: "contato", title: "Entrou em Contato", color: "novo", section: "comercial" },
  { id: "visita_agendada", title: "Visita Agendada", color: "contato", section: "comercial" },
  { id: "visita_realizada", title: "Visita Realizada", color: "contato", section: "comercial" },
  { id: "proposta_pendente", title: "Proposta Pendente", color: "contato", section: "comercial" },
  { id: "proposta", title: "Gerou Proposta", color: "proposta", section: "comercial" },
  { id: "contrato", title: "Fechou Contrato", color: "ganho", section: "comercial" },
  
  // OPERACIONAL
  { id: "execucao", title: "Em Execução", color: "qualificado", section: "operacional" },
  { id: "finalizado", title: "Finalizado", color: "ganho", section: "operacional" },
] as const;

function SortableCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

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
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as LeadStage;

    if (STAGES.some((stage) => stage.id === newStage)) {
      onStageChange(leadId, newStage);
    }

    setActiveId(null);
  };

  const getLeadsByStage = (stage: string) => {
    return leads.filter((lead) => lead.estagio === stage);
  };

  const activeLead = activeId ? leads.find((lead) => lead.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-6 min-h-[calc(100vh-12rem)]">
        {STAGES.map((stage, index) => {
          const stageLeads = getLeadsByStage(stage.id);
          const isFirstOperacional = stage.section === "operacional" && 
            (index === 0 || STAGES[index - 1].section !== "operacional");
          
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
              <KanbanColumn
                id={stage.id}
                title={stage.title}
                count={stageLeads.length}
                color={stage.color}
                additionalContent={
                  stage.id === "contato" && contatosNaoConvertidos.length > 0 && onConvertContato && onEditContato ? (
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
                  />
                ))}
              </KanbanColumn>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeLead && (
          <div className="rotate-3 scale-105">
            <KanbanCard
              cliente={activeLead.clientes?.nome || "Cliente não identificado"}
              lastInteraction={activeLead.ultima_interacao ? new Date(activeLead.ultima_interacao) : new Date(activeLead.created_at)}
              valorEstimado={Number(activeLead.valor_potencial) || 0}
              produtos={activeLead.produtos as Array<{ tipo: string; medida: number | null }> | null}
              tipoPiso={activeLead.tipo_piso}
              responsavel={{
                name: activeLead.responsavel || "Não atribuído",
              }}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
