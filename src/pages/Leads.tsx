import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { LeadForm } from "@/components/forms/LeadForm";
import { LeadDetailsDialog } from "@/components/leads/LeadDetailsDialog";
import { useLeads } from "@/hooks/useLeads";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"] & {
  clientes?: {
    nome: string;
    telefone?: string;
    endereco?: string;
  } | null;
};

export default function Leads() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { leads, isLoading, createLead, updateLeadStage, updateLead, deleteLead } = useLeads();
  const { user } = useAuth();

  const handleCreateLead = async (values: any) => {
    // Processar tipos de piso
    let tiposPisoFinal = [...values.tipo_piso];
    if (values.tipo_piso.includes("Outro") && values.tipo_piso_outro) {
      tiposPisoFinal = tiposPisoFinal.filter(t => t !== "Outro");
      tiposPisoFinal.push(`Outro: ${values.tipo_piso_outro}`);
    }
    
    const leadData: any = {
      cliente_id: values.cliente_id,
      tipo_piso: tiposPisoFinal.join(", "),
      valor_potencial: parseFloat(values.valor_potencial),
      observacoes: values.observacoes || null,
      origem: values.origem || null,
      responsavel: values.responsavel || null,
      estagio: values.estagio,
      user_id: user?.id,
      ultima_interacao: new Date().toISOString(),
    };

    // Se forneceu created_at, converter Date para string ISO
    if (values.created_at) {
      leadData.created_at = values.created_at.toISOString();
    }

    await createLead.mutateAsync(leadData);
    setCreateDialogOpen(false);
  };

  const handleUpdateLead = async (values: any) => {
    if (!selectedLead) return;
    
    // Processar tipos de piso
    let tiposPisoFinal = [...values.tipo_piso];
    if (values.tipo_piso.includes("Outro") && values.tipo_piso_outro) {
      tiposPisoFinal = tiposPisoFinal.filter(t => t !== "Outro");
      tiposPisoFinal.push(`Outro: ${values.tipo_piso_outro}`);
    }
    
    await updateLead.mutateAsync({
      id: selectedLead.id,
      updates: {
        cliente_id: values.cliente_id,
        tipo_piso: tiposPisoFinal.join(", "),
        valor_potencial: parseFloat(values.valor_potencial),
        observacoes: values.observacoes || null,
        origem: values.origem || null,
        responsavel: values.responsavel || null,
        estagio: values.estagio,
        ultima_interacao: new Date().toISOString(),
      },
    });
    setEditDialogOpen(false);
    setDetailsOpen(false);
  };

  const handleStageChange = async (leadId: string, newStage: any) => {
    await updateLeadStage.mutateAsync({ id: leadId, stage: newStage });
  };

  const handleCardClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsOpen(false);
    setEditDialogOpen(true);
  };

  const handleDeleteLead = async (leadId: string) => {
    await deleteLead.mutateAsync(leadId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 text-foreground mb-2">Leads</h1>
          <p className="text-body text-muted-foreground">
            Gerencie o funil de vendas com drag & drop
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
            <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
              <DialogTitle>Criar Novo Lead</DialogTitle>
              <DialogDescription>
                Adicione um novo lead ao funil de vendas
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto px-6 pb-6">
              <LeadForm
                onSubmit={handleCreateLead}
                isLoading={createLead.isPending}
                mode="create"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <KanbanBoard 
        leads={leads} 
        onStageChange={handleStageChange}
        onCardClick={handleCardClick}
      />

      {/* Edit Lead Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>Editar Lead</DialogTitle>
            <DialogDescription>
              Atualize as informações do lead
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6">
            {selectedLead && (
              <LeadForm
                onSubmit={handleUpdateLead}
                isLoading={updateLead.isPending}
                mode="edit"
                initialData={{
                  cliente_id: selectedLead.cliente_id || "",
                  tipo_piso: (() => {
                    if (!selectedLead.tipo_piso) return [];
                    const tipos = selectedLead.tipo_piso.split(",").map(t => t.trim());
                    return tipos.map(t => {
                      if (t.startsWith("Outro:")) return "Outro";
                      return t;
                    });
                  })(),
                  tipo_piso_outro: (() => {
                    if (!selectedLead.tipo_piso) return "";
                    const tipos = selectedLead.tipo_piso.split(",").map(t => t.trim());
                    const outro = tipos.find(t => t.startsWith("Outro:"));
                    return outro ? outro.replace("Outro:", "").trim() : "";
                  })(),
                  valor_potencial: selectedLead.valor_potencial?.toString() || "",
                  observacoes: selectedLead.observacoes || "",
                  origem: selectedLead.origem || "",
                  responsavel: selectedLead.responsavel || "",
                  estagio: selectedLead.estagio,
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Details Dialog */}
      <LeadDetailsDialog
        lead={selectedLead}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={handleEditLead}
        onDelete={handleDeleteLead}
      />
    </div>
  );
}
