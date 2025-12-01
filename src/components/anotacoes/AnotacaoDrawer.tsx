import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Clock, Bell, Mail, X, Save, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAnotacoes, type Anotacao } from "@/hooks/useAnotacoes";
import ClienteCombobox from "@/components/forms/ClienteCombobox";
import { useClientes } from "@/hooks/useClientes";

const anotacaoSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  note: z.string().optional(),
  status: z.enum(["aberta", "em_andamento", "concluida", "arquivada"]),
  priority: z.enum(["baixa", "media", "alta"]),
  type: z.enum(["ligacao", "orcamento", "follow_up", "visita", "reuniao", "outro"]),
  client_id: z.string().optional(),
  client_name: z.string().optional(),
  reminder_date: z.string().optional(),
  reminder_time: z.string().optional(),
  notify_push: z.boolean().default(false),
  notify_email: z.boolean().default(false),
  tags: z.string().optional(),
});

type AnotacaoFormData = z.infer<typeof anotacaoSchema>;

interface AnotacaoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anotacaoId: string | null;
}

export function AnotacaoDrawer({ open, onOpenChange, anotacaoId }: AnotacaoDrawerProps) {
  const { anotacoes, createAnotacao, updateAnotacao, deleteAnotacao, isCreating, isUpdating } = useAnotacoes();
  const { clientes, isLoading: isLoadingClientes } = useClientes();
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const currentAnotacao = anotacoes.find((a) => a.id === anotacaoId);

  const form = useForm<AnotacaoFormData>({
    resolver: zodResolver(anotacaoSchema),
    defaultValues: {
      title: "",
      note: "",
      status: "aberta",
      priority: "media",
      type: "outro",
      client_id: "",
      client_name: "",
      reminder_date: "",
      reminder_time: "",
      notify_push: true,
      notify_email: false,
      tags: "",
    },
  });

  // Load current anotacao data when editing
  useEffect(() => {
    if (currentAnotacao) {
      const reminderDate = currentAnotacao.reminder_datetime 
        ? new Date(currentAnotacao.reminder_datetime).toISOString().split("T")[0]
        : "";
      const reminderTime = currentAnotacao.reminder_datetime
        ? new Date(currentAnotacao.reminder_datetime).toTimeString().slice(0, 5)
        : "";

      form.reset({
        title: currentAnotacao.title,
        note: currentAnotacao.note || "",
        status: currentAnotacao.status,
        priority: currentAnotacao.priority,
        type: currentAnotacao.type,
        client_id: currentAnotacao.client_id || "",
        client_name: currentAnotacao.client_name || "",
        reminder_date: reminderDate,
        reminder_time: reminderTime,
        notify_push: currentAnotacao.notify_push,
        notify_email: currentAnotacao.notify_email,
        tags: currentAnotacao.tags?.join(", ") || "",
      });
      setSelectedClientId(currentAnotacao.client_id || "");
    } else {
      form.reset();
      setSelectedClientId("");
    }
  }, [currentAnotacao, form]);

  const onSubmit = (data: AnotacaoFormData) => {
    const tagsArray = data.tags
      ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    let reminderDatetime: string | undefined;
    if (data.reminder_date && data.reminder_time) {
      reminderDatetime = new Date(`${data.reminder_date}T${data.reminder_time}`).toISOString();
    }

    const payload = {
      title: data.title,
      note: data.note,
      status: data.status,
      priority: data.priority,
      type: data.type,
      client_id: data.client_id || null,
      client_name: data.client_name || null,
      reminder_datetime: reminderDatetime,
      notify_push: data.notify_push,
      notify_email: data.notify_email,
      tags: tagsArray,
    };

    if (anotacaoId) {
      updateAnotacao({ id: anotacaoId, ...payload });
    } else {
      createAnotacao(payload);
    }

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (anotacaoId && confirm("Deseja realmente excluir esta anotação?")) {
      deleteAnotacao(anotacaoId);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{anotacaoId ? "Editar Anotação" : "Nova Anotação"}</SheetTitle>
          <SheetDescription>
            Preencha os detalhes da anotação e configure lembretes
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ex: Ligar para João..."
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Descrição</Label>
            <Textarea
              id="note"
              placeholder="Detalhes adicionais..."
              rows={4}
              {...form.register("note")}
            />
          </div>

          {/* Status, Priority, Type */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) => form.setValue("status", value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="arquivada">Arquivada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(value) => form.setValue("priority", value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(value) => form.setValue("type", value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ligacao">Ligação</SelectItem>
                  <SelectItem value="orcamento">Orçamento</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="visita">Visita</SelectItem>
                  <SelectItem value="reuniao">Reunião</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label>Cliente (opcional)</Label>
            <ClienteCombobox
              clientes={clientes}
              value={selectedClientId}
              onChange={(value) => {
                setSelectedClientId(value);
                form.setValue("client_id", value);
              }}
              isLoading={isLoadingClientes}
            />
            {!selectedClientId && (
              <Input
                placeholder="Ou digite o nome do cliente..."
                {...form.register("client_name")}
              />
            )}
          </div>

          {/* Reminder Date & Time */}
          <div className="space-y-4">
            <Label>Lembrete</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Data
                </div>
                <Input
                  type="date"
                  {...form.register("reminder_date")}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Hora
                </div>
                <Input
                  type="time"
                  {...form.register("reminder_time")}
                />
              </div>
            </div>

            {/* Notification Channels */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <Label htmlFor="notify_push">Notificar no navegador</Label>
                </div>
                <Switch
                  id="notify_push"
                  checked={form.watch("notify_push")}
                  onCheckedChange={(checked) => form.setValue("notify_push", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <Label htmlFor="notify_email">Notificar por e-mail</Label>
                </div>
                <Switch
                  id="notify_email"
                  checked={form.watch("notify_email")}
                  onCheckedChange={(checked) => form.setValue("notify_email", checked)}
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              placeholder="orçamento, urgente, cliente-vip"
              {...form.register("tags")}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            {anotacaoId && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
