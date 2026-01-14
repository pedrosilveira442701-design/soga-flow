import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, MapPin, Edit, Trash2, UserRoundPlus, ExternalLink, Loader2, Navigation, Check, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Visita } from "@/hooks/useVisitas";
import { useClientes, type Cliente } from "@/hooks/useClientes";
import { ClienteForm } from "@/components/forms/ClienteForm";
import { VisitaDetailsDialog } from "./VisitaDetailsDialog";
import { calcularDistancia } from "@/lib/distance";

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

// Hook para calcular distâncias
function useDistancias(visitas: Visita[]) {
  const [distancias, setDistancias] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    visitas.forEach(async (visita) => {
      const endereco = getEnderecoCompleto(visita);
      if (!endereco || distancias[visita.id]) return;

      setLoading((prev) => ({ ...prev, [visita.id]: true }));

      try {
        const result = await calcularDistancia(endereco);
        setDistancias((prev) => ({ ...prev, [visita.id]: result.distanceText }));
      } catch {
        setDistancias((prev) => ({ ...prev, [visita.id]: "—" }));
      } finally {
        setLoading((prev) => ({ ...prev, [visita.id]: false }));
      }
    });
  }, [visitas]);

  return { distancias, loading };
}

// Helper function fora do componente
function getEnderecoCompleto(visita: Visita): string | null {
  if (visita.endereco) return visita.endereco;
  const cliente = visita.clientes;
  if (cliente?.endereco) {
    const parts = [cliente.endereco, cliente.bairro, cliente.cidade].filter(Boolean);
    return parts.join(", ");
  }
  return null;
}

export function VisitasListView({ visitas, onEdit, onToggleRealizada, onDelete }: VisitasListViewProps) {
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [visitaParaCliente, setVisitaParaCliente] = useState<Visita | null>(null);
  const [selectedVisita, setSelectedVisita] = useState<Visita | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  const { createCliente } = useClientes();

  // Hook para calcular distâncias
  const { distancias, loading: distanciasLoading } = useDistancias(visitas);

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

  const getBairro = (visita: Visita): string | null => {
    return visita.clientes?.bairro || null;
  };

  const handleOpenDetails = (visita: Visita) => {
    setSelectedVisita(visita);
    setDetailsDialogOpen(true);
  };

  const handleAdicionarCliente = (visita: Visita) => {
    setVisitaParaCliente(visita);
    setClienteDialogOpen(true);
  };

  const handleClienteSubmit = async (data: any) => {
    createCliente.mutate(data, {
      onSuccess: () => {
        setClienteDialogOpen(false);
        setVisitaParaCliente(null);
      },
    });
  };

  const getClienteDefaultValues = (): Partial<Cliente> | undefined => {
    if (!visitaParaCliente) return undefined;
    
    const clienteNome = getClienteNome(visitaParaCliente);
    const telefone = getTelefone(visitaParaCliente);
    const endereco = getEnderecoCompleto(visitaParaCliente);
    
    return {
      nome: clienteNome !== "—" ? clienteNome : "",
      telefone: telefone || "",
      endereco: endereco || "",
      bairro: visitaParaCliente.clientes?.bairro || "",
      cidade: visitaParaCliente.clientes?.cidade || "",
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
              <TableHead>Bairro</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Distância</TableHead>
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
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhuma visita encontrada
                </TableCell>
              </TableRow>
            ) : (
              visitas.map((visita) => {
                const telefone = getTelefone(visita);
                const endereco = getEnderecoCompleto(visita);
                const bairro = getBairro(visita);
                
                return (
                  <TableRow key={visita.id}>
                    {/* Nome - Clicável para ver detalhes */}
                    <TableCell 
                      className="font-medium cursor-pointer hover:text-primary hover:underline"
                      onClick={() => handleOpenDetails(visita)}
                    >
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

                    {/* Bairro */}
                    <TableCell>
                      {bairro || <span className="text-muted-foreground">—</span>}
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

                    {/* Distância da Sede */}
                    <TableCell>
                      {distanciasLoading[visita.id] ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Navigation className="h-4 w-4 text-muted-foreground" />
                          <span>{distancias[visita.id] || "—"}</span>
                        </div>
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
                      <div className="flex items-center justify-center">
                        {visita.realizada ? (
                          <Badge 
                            className="bg-green-500/15 text-green-700 border-green-500/30 cursor-pointer hover:bg-green-500/25 transition-colors"
                            onClick={() => onToggleRealizada(visita.id, false)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Sim
                          </Badge>
                        ) : (
                          <Badge 
                            variant="outline" 
                            className="cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => onToggleRealizada(visita.id, true)}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </div>
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
                                onClick={() => handleAdicionarCliente(visita)}
                                disabled={!!visita.cliente_id}
                              >
                                <UserRoundPlus className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {visita.cliente_id ? "Cliente já cadastrado" : "Adicionar Cliente"}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(visita)}
                              >
                                <Edit className="h-5 w-5" />
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
                                <Trash2 className="h-5 w-5 text-destructive" />
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

      {/* Dialog para Ver Detalhes da Visita */}
      <VisitaDetailsDialog
        visita={selectedVisita}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onEdit={(visita) => {
          setDetailsDialogOpen(false);
          onEdit(visita);
        }}
        onToggleRealizada={onToggleRealizada}
      />

      {/* Dialog para Adicionar Cliente */}
      <Dialog open={clienteDialogOpen} onOpenChange={setClienteDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Cliente a partir da Visita</DialogTitle>
          </DialogHeader>
          <ClienteForm
            onSubmit={handleClienteSubmit}
            isLoading={createCliente.isPending}
            initialData={getClienteDefaultValues() as any}
            mode="create"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
