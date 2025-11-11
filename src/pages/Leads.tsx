import { Plus, UserPlus } from "lucide-react";
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
import { ContatoQuickForm } from "@/components/forms/ContatoQuickForm";
import { ContatoMiniCard } from "@/components/contatos/ContatoMiniCard";
import { useLeads } from "@/hooks/useLeads";
import { useContatos, Contato } from "@/hooks/useContatos";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"] & {
  clientes?: {
    nome: string;
    telefone?: string;
    endereco?: string;
  } | null;
  produtos?: Array<{
    tipo: string;
    medida: number | null;
  }>;
};

export default function Leads() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [contatoDialogOpen, setContatoDialogOpen] = useState(false);
  const [editContatoDialogOpen, setEditContatoDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedContato, setSelectedContato] = useState<Contato | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [contatoToConvert, setContatoToConvert] = useState<{telefone: string; origem: string; contatoId?: string} | null>(null);
  
  const { leads, isLoading, createLead, updateLeadStage, updateLead, deleteLead } = useLeads();
  const { naoConvertidos, createContato, updateContato, convertToLead, deleteContato } = useContatos();
  const { user } = useAuth();

  const handleCreateLead = async (values: any, contatoId?: string) => {
    // Processar produtos
    const produtosProcessados = values.produtos.map((p: any) => ({
      tipo: p.tipo === "Outro" ? `Outro: ${p.tipo_outro}` : p.tipo,
      medida: p.medida ? parseFloat(p.medida) : null,
    }));

    // Processar origem
    let origemFinal = values.origem || null;
    if (values.origem && (values.origem === "Indicação" || values.origem === "Outro") && values.origem_descricao) {
      origemFinal = `${values.origem}: ${values.origem_descricao}`;
    }
    
    const leadData: any = {
      cliente_id: values.cliente_id,
      produtos: produtosProcessados,
      valor_potencial: parseFloat(values.valor_potencial),
      observacoes: values.observacoes || null,
      origem: origemFinal,
      responsavel: values.responsavel || null,
      estagio: values.estagio,
      user_id: user?.id,
    };

    // Se forneceu created_at, converter Date para string ISO
    if (values.created_at) {
      leadData.created_at = values.created_at.toISOString();
    }

    // Se forneceu ultima_interacao, converter Date para string ISO
    if (values.ultima_interacao) {
      leadData.ultima_interacao = values.ultima_interacao.toISOString();
    } else {
      // Se não forneceu, usar a data atual
      leadData.ultima_interacao = new Date().toISOString();
    }

    const newLead = await createLead.mutateAsync(leadData);
    
    // Se veio de um contato, marcar como convertido
    if (contatoId && newLead) {
      await convertToLead.mutateAsync({ contatoId, leadId: newLead.id });
    }
    
    setCreateDialogOpen(false);
    setContatoToConvert(null);
  };

  const handleContatoSubmit = async (data: any) => {
    const dataHora = `${format(data.data, "yyyy-MM-dd")}T${data.hora}:00`;
    
    await createContato.mutateAsync({
      telefone: data.telefone,
      nome: data.nome || undefined,
      data_hora: dataHora,
      origem: data.origem,
      observacoes: data.observacoes || undefined,
      tag: data.tag || undefined,
    });
    
    setContatoDialogOpen(false);
  };

  const handleOpenLeadFromContato = async (telefone: string, origem: string) => {
    // Primeiro, salvar o contato
    const dataHora = new Date().toISOString();
    const contato = await createContato.mutateAsync({
      telefone,
      data_hora: dataHora,
      origem,
    });
    
    // Guardar informações do contato e abrir formulário de lead
    setContatoToConvert({ telefone, origem, contatoId: contato.id });
    setContatoDialogOpen(false);
    setCreateDialogOpen(true);
  };

  const handleConvertContatoToLead = (contato: Contato) => {
    setContatoToConvert({ 
      telefone: contato.telefone, 
      origem: contato.origem,
      contatoId: contato.id 
    });
    setCreateDialogOpen(true);
  };

  const handleEditContato = (contato: Contato) => {
    setSelectedContato(contato);
    setEditContatoDialogOpen(true);
  };

  const handleUpdateContato = async (data: any) => {
    if (!selectedContato) return;
    
    const dataHora = `${format(data.data, "yyyy-MM-dd")}T${data.hora}:00`;
    
    await updateContato.mutateAsync({
      id: selectedContato.id,
      updates: {
        telefone: data.telefone,
        nome: data.nome || null,
        data_hora: dataHora,
        origem: data.origem,
        observacoes: data.observacoes || null,
        tag: data.tag || null,
      },
    });
    
    setEditContatoDialogOpen(false);
    setSelectedContato(null);
  };

  const handleUpdateLead = async (values: any) => {
    if (!selectedLead) return;
    
    // Processar produtos
    const produtosProcessados = values.produtos.map((p: any) => ({
      tipo: p.tipo === "Outro" ? `Outro: ${p.tipo_outro}` : p.tipo,
      medida: p.medida ? parseFloat(p.medida) : null,
    }));

    // Processar origem
    let origemFinal = values.origem || null;
    if (values.origem && (values.origem === "Indicação" || values.origem === "Outro") && values.origem_descricao) {
      origemFinal = `${values.origem}: ${values.origem_descricao}`;
    }
    
    await updateLead.mutateAsync({
      id: selectedLead.id,
      updates: {
        cliente_id: values.cliente_id,
        produtos: produtosProcessados,
        valor_potencial: parseFloat(values.valor_potencial),
        observacoes: values.observacoes || null,
        origem: origemFinal,
        responsavel: values.responsavel || null,
        estagio: values.estagio,
        created_at: values.created_at ? values.created_at.toISOString() : undefined,
        ultima_interacao: values.ultima_interacao ? values.ultima_interacao.toISOString() : undefined,
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

  const handleDeleteContato = async (contato: Contato) => {
    await deleteContato.mutateAsync(contato.id);
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

        <div className="flex gap-2">
          <Dialog open={contatoDialogOpen} onOpenChange={setContatoDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 h-11 px-5">
                <UserPlus className="h-5 w-5" />
                Registrar Contato
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Contato</DialogTitle>
                <DialogDescription>
                  Registre um contato inicial rapidamente
                </DialogDescription>
              </DialogHeader>
              <ContatoQuickForm
                onSubmit={handleContatoSubmit}
                onOpenLeadForm={handleOpenLeadFromContato}
                isLoading={createContato.isPending}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-11 px-5">
                <Plus className="h-5 w-5" />
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
                  onSubmit={(values) => handleCreateLead(values, contatoToConvert?.contatoId)}
                  isLoading={createLead.isPending}
                  mode="create"
                  initialData={contatoToConvert ? {
                    origem: contatoToConvert.origem,
                  } : undefined}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard 
        leads={leads} 
        onStageChange={handleStageChange}
        onCardClick={handleCardClick}
        contatosNaoConvertidos={naoConvertidos}
        onConvertContato={handleConvertContatoToLead}
        onEditContato={handleEditContato}
        onDeleteContato={handleDeleteContato}
      />

      {/* Edit Contato Dialog */}
      <Dialog open={editContatoDialogOpen} onOpenChange={setEditContatoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>
              Atualize as informações do contato
            </DialogDescription>
          </DialogHeader>
          {selectedContato && (
            <ContatoQuickForm
              onSubmit={handleUpdateContato}
              onOpenLeadForm={(telefone, origem) => {
                setContatoToConvert({ telefone, origem, contatoId: selectedContato.id });
                setEditContatoDialogOpen(false);
                setCreateDialogOpen(true);
              }}
              isLoading={updateContato.isPending}
              initialData={{
                telefone: selectedContato.telefone,
                nome: selectedContato.nome || "",
                data: new Date(selectedContato.data_hora),
                hora: format(new Date(selectedContato.data_hora), "HH:mm"),
                origem: selectedContato.origem,
                observacoes: selectedContato.observacoes || "",
                tag: selectedContato.tag || undefined,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

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
                  produtos: (() => {
                    // Se tem produtos no formato novo (JSONB)
                    if (selectedLead.produtos && Array.isArray(selectedLead.produtos) && selectedLead.produtos.length > 0) {
                      return selectedLead.produtos.map((p: any) => ({
                        tipo: p.tipo?.startsWith("Outro:") ? "Outro" : p.tipo,
                        tipo_outro: p.tipo?.startsWith("Outro:") ? p.tipo.replace("Outro:", "").trim() : "",
                        medida: p.medida?.toString() || "",
                      }));
                    }
                    // Fallback para formato antigo (tipo_piso string)
                    if (selectedLead.tipo_piso) {
                      const tipos = selectedLead.tipo_piso.split(",").map(t => t.trim());
                      return tipos.map(t => ({
                        tipo: t.startsWith("Outro:") ? "Outro" : t,
                        tipo_outro: t.startsWith("Outro:") ? t.replace("Outro:", "").trim() : "",
                        medida: selectedLead.medida?.toString() || "",
                      }));
                    }
                    return [{ tipo: "", tipo_outro: "", medida: "" }];
                  })(),
                  valor_potencial: selectedLead.valor_potencial?.toString() || "",
                  observacoes: selectedLead.observacoes || "",
                  origem: (() => {
                    if (!selectedLead.origem) return "";
                    // Extrair a origem base se tiver formato "Origem: Descrição"
                    if (selectedLead.origem.includes(":")) {
                      return selectedLead.origem.split(":")[0].trim();
                    }
                    return selectedLead.origem;
                  })(),
                  origem_descricao: (() => {
                    if (!selectedLead.origem || !selectedLead.origem.includes(":")) return "";
                    // Extrair a descrição se tiver formato "Origem: Descrição"
                    return selectedLead.origem.split(":").slice(1).join(":").trim();
                  })(),
                  responsavel: selectedLead.responsavel || "",
                  estagio: selectedLead.estagio,
                  created_at: selectedLead.created_at ? new Date(selectedLead.created_at) : new Date(),
                  ultima_interacao: selectedLead.ultima_interacao ? new Date(selectedLead.ultima_interacao) : new Date(),
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
