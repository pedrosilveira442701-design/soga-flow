import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, MapPin, Edit, Trash2, UserPlus, ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Visita } from "@/hooks/useVisitas";
import { useLeads } from "@/hooks/useLeads";
import { useClientes } from "@/hooks/useClientes";
import { LeadForm } from "@/components/forms/LeadForm";

const TIPOS_VISITA_LABELS: Record<string, string> = {
  medicao: "Medição",
  instalacao: "Instalação",
  followup: "Follow-up",
  orcamento: "Orçamento",
  manutencao: "Manutenção",
  reuniao: "Reunião",
  outro: "Outro",
  fechamento: "Fechamento",
};

interface VisitasListViewProps {
  visitas: Visita[];
  onEdit: (visita: Visita) => void;
  onToggleRealizada: (id: string, realizada: boolean) => void;
  onDelete: (id: string) => void;
}

export function VisitasListView({ visitas, onEdit, onToggleRealizada, onDelete }: VisitasListViewProps) {
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [visitaParaLead, setVisitaParaLead] = useState<Visita | null>(null);
  
  const { createLead } = useLeads();
  const { createCliente } = useClientes();

  const formatPhoneForWhatsApp = (phone: string | null): string => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
  };

  const formatGoogleMapsUrl = (endereco: string | null): string => {
    if (!endereco) return "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
  };

  const getClienteNome = (visita: Visita): string => {
    return visita.clientes?.nome || visita.cliente_manual_name || "—";
  };

  const getTelefone = (visita: Visita): string | null => {
    return visita.telefone || visita.clientes?.telefone || null;
  };

  const getEndereco = (visita: Visita): string | null => {
    if (visita.endereco) return visita.endereco;
    const cliente = visita.clientes;
    if (cliente?.endereco) {
      const parts = [cliente.endereco, cliente.bairro, cliente.cidade].filter(Boolean);
      return parts.join(", ");
    }
    return null;
  };

  const handleGerarLead = (visita: Visita) => {
    setVisitaParaLead(visita);
    setLeadDialogOpen(true);
  };

  const handleLeadSubmit = async (data: any) => {
    // First, create the cliente if needed
    const clienteNome = getClienteNome(visitaParaLead!);
    const telefone = getTelefone(visitaParaLead!);
    const endereco = getEndereco(visitaParaLead!);
    
    let clienteId = visitaParaLead?.cliente_id;
    
    // If there's no cliente_id but we have manual name, create a new cliente
    if (!clienteId && clienteNome !== "—") {
      try {
        const newCliente = await createCliente.mutateAsync({
          nome: clienteNome,
          telefone: telefone || undefined,
          endereco: endereco || undefined,
          bairro: visitaParaLead?.clientes?.bairro || undefined,
          cidade: visitaParaLead?.clientes?.cidade || undefined,
        });
        clienteId = newCliente.id;
      } catch (error) {
        console.error("Erro ao criar cliente:", error);
      }
    }

    // Create the lead
    createLead.mutate(
      {
        ...data,
        cliente_id: clienteId || data.cliente_id,
      },
      {
        onSuccess: () => {
          setLeadDialogOpen(false);
          setVisitaParaLead(null);
        },
      }
    );
  };

  const getLeadDefaultValues = () => {
    if (!visitaParaLead) return undefined;
    
    return {
      cliente_id: visitaParaLead.cliente_id || undefined,
      origem: "Visita" as const,
      observacoes: `Originado da visita: ${visitaParaLead.assunto}${visitaParaLead.observacao ? `\n${visitaParaLead.observacao}` : ""}`,
      estagio: "contato" as const,
    };
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Data Sugerida</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Realizada</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visitas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhuma visita encontrada
                </TableCell>
              </TableRow>
            ) : (
              visitas.map((visita) => {
                const telefone = getTelefone(visita);
                const endereco = getEndereco(visita);
                
                return (
                  <TableRow key={visita.id}>
                    {/* Nome */}
                    <TableCell className="font-medium">
                      {getClienteNome(visita)}
                    </TableCell>

                    {/* Telefone com link WhatsApp */}
                    <TableCell>
                      {telefone ? (
                        <a
                          href={`https://wa.me/${formatPhoneForWhatsApp(telefone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <Phone className="h-4 w-4" />
                          {telefone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Endereço com link Google Maps */}
                    <TableCell>
                      {endereco ? (
                        <a
                          href={formatGoogleMapsUrl(endereco)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline max-w-[200px] truncate"
                        >
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{endereco}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Data Sugerida */}
                    <TableCell>
                      {visita.data ? (
                        format(new Date(visita.data), "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <Badge variant="outline">Não definida</Badge>
                      )}
                    </TableCell>

                    {/* Horário Sugerido */}
                    <TableCell>
                      {visita.hora ? (
                        visita.hora
                      ) : (
                        <Badge variant="outline">Não definida</Badge>
                      )}
                    </TableCell>

                    {/* Tipo de Visita */}
                    <TableCell>
                      <Badge variant="secondary">
                        {TIPOS_VISITA_LABELS[visita.marcacao_tipo] || visita.marcacao_tipo}
                      </Badge>
                    </TableCell>

                    {/* Checkbox Realizada */}
                    <TableCell className="text-center">
                      <Checkbox
                        checked={visita.realizada}
                        onCheckedChange={(checked) => 
                          onToggleRealizada(visita.id, checked as boolean)
                        }
                      />
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleGerarLead(visita)}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Gerar Lead</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(visita)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(visita.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog para Gerar Lead */}
      <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar Lead a partir da Visita</DialogTitle>
          </DialogHeader>
          <LeadForm
            onSubmit={handleLeadSubmit}
            isLoading={createLead.isPending}
            initialData={getLeadDefaultValues()}
            mode="create"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
