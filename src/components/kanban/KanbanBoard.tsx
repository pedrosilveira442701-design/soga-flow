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
import type { Database } from "@/integrations/supabase/types";

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
}

const STAGES = [
  { id: "novo", title: "Novo", color: "novo" },
  { id: "contato", title: "Contato", color: "contato" },
  { id: "qualificado", title: "Qualificado", color: "qualificado" },
  { id: "proposta", title: "Proposta", color: "proposta" },
  { id: "ganho", title: "Ganho", color: "ganho" },
] as const;

function SortableCard({ lead }: { lead: Lead }) {
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
        tipoPiso={lead.tipo_piso || "Não especificado"}
        responsavel={{
          name: lead.responsavel || "Não atribuído",
        }}
        onWhatsApp={() => {
          if (lead.clientes?.telefone) {
            window.open(`https://wa.me/${lead.clientes.telefone.replace(/\D/g, "")}`, "_blank");
          }
        }}
      />
    </div>
  );
}

export function KanbanBoard({ leads, onStageChange }: KanbanBoardProps) {
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
        {STAGES.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          return (
            <KanbanColumn
              key={stage.id}
              id={stage.id}
              title={stage.title}
              count={stageLeads.length}
              color={stage.color}
            >
              {stageLeads.map((lead) => (
                <SortableCard key={lead.id} lead={lead} />
              ))}
            </KanbanColumn>
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
              tipoPiso={activeLead.tipo_piso || "Não especificado"}
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
