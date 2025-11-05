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
import { useLeads } from "@/hooks/useLeads";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Leads() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { leads, isLoading, createLead, updateLeadStage } = useLeads();
  const { user } = useAuth();

  const handleCreateLead = async (values: any) => {
    await createLead.mutateAsync({
      ...values,
      valor_potencial: parseFloat(values.valor_potencial),
      estagio: "novo",
      user_id: user?.id,
      ultima_interacao: new Date().toISOString(),
    });
    setDialogOpen(false);
  };

  const handleStageChange = async (leadId: string, newStage: any) => {
    await updateLeadStage.mutateAsync({ id: leadId, stage: newStage });
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Lead</DialogTitle>
              <DialogDescription>
                Adicione um novo lead ao funil de vendas
              </DialogDescription>
            </DialogHeader>
            <LeadForm
              onSubmit={handleCreateLead}
              isLoading={createLead.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <KanbanBoard leads={leads} onStageChange={handleStageChange} />
    </div>
  );
}
