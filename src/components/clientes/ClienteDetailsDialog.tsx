import { Cliente } from "@/hooks/useClientes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  MessageCircle,
  FileText,
  Users,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClienteDetailsDialogProps {
  cliente: Cliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (cliente: Cliente) => void;
  onDelete: (id: string) => void;
}

export function ClienteDetailsDialog({
  cliente,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ClienteDetailsDialogProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!cliente) return null;

  const handleWhatsApp = () => {
    if (cliente.telefone) {
      const phone = cliente.telefone.replace(/\D/g, "");
      window.open(`https://wa.me/55${phone}`, "_blank");
    }
  };

  const handleDelete = () => {
    onDelete(cliente.id);
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  const propostasCount = cliente.propostas?.[0]?.count || 0;
  const leadsCount = cliente.leads?.[0]?.count || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2">
                  {cliente.nome}
                </DialogTitle>
                <Badge variant={cliente.status === "ativo" ? "default" : "secondary"}>
                  {cliente.status === "ativo" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 mt-4"
          >
            {/* Informações de Contato */}
            <div className="space-y-3">
              {cliente.contato && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{cliente.contato}</span>
                </div>
              )}
              {cliente.telefone && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">{cliente.telefone}</span>
                </div>
              )}
              {(cliente.endereco || cliente.cidade || cliente.bairro) && (
                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <div className="text-sm">
                    {cliente.endereco && <div>{cliente.endereco}</div>}
                    {(cliente.bairro || cliente.cidade) && (
                      <div>
                        {cliente.bairro && `${cliente.bairro}, `}
                        {cliente.cidade}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {cliente.cpf_cnpj && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">CPF/CNPJ: {cliente.cpf_cnpj}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Estatísticas</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                  <FileText className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-2xl font-bold">{propostasCount}</span>
                  <span className="text-xs text-muted-foreground">Propostas</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                  <Users className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-2xl font-bold">{leadsCount}</span>
                  <span className="text-xs text-muted-foreground">Leads</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs font-medium mt-1">Cliente desde</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(cliente.created_at), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="text-sm">Cliente criado</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(cliente.created_at), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                {cliente.updated_at !== cliente.created_at && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground mt-2" />
                    <div className="flex-1">
                      <p className="text-sm">Última atualização</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(cliente.updated_at), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => {
                  onEdit(cliente);
                  onOpenChange(false);
                }}
                variant="outline"
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                onClick={() => setDeleteDialogOpen(true)}
                variant="outline"
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
              </Button>
              {cliente.telefone && (
                <Button onClick={handleWhatsApp} className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              )}
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{cliente.nome}"? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
