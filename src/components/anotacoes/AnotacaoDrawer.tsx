import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Clock, Bell, Mail, Save, Trash2 } from "lucide-react";

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

import { useAnotacoes } from "@/hooks/useAnotacoes";
import { useClientes } from "@/hooks/useClientes";
import ClienteCombobox from "@/components/forms/ClienteCombobox";

const anotacaoSchema = z
  .object({
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
  })
  .refine(
    (data) => {
      const hasSomethingForReminder =
        !!data.reminder_date ||
        !!data.reminder_time ||
        data.notify_push ||
        data.notify_email;

      // Nenhum lembrete configurado -> ok (anotação simples)
      if (!hasSomethingForReminder) return true;

      // Se marcou algum lembrete ou preencheu parcialmente, obrigar data + hora completos
      return !!data.reminder_date && !!data.reminder_time;
    },
    {
      message: "Defina data e hora do lembrete",
      path: ["reminder_date"],
    }
  );

type AnotacaoFormData = z.infer<typeof anotacaoSchema>;

interface AnotacaoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anotacaoId: string | null;
}

export function AnotacaoDrawer({
  open,
  onOpenChange,
  anotacaoId,
}: AnotacaoDrawerProps) {
  const {
    anotacoes,
    createAnotacao,
    updateAnotacao,
    deleteAnotacao,
    isCreating,
    isUpdating,
  } = useAnotacoes();
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
      // anotação simples por padrão: sem lembretes
      notify_push: false,
      notify_email: false,
      tags: "",
    },
  });

  // Carregar dados ao editar
  useEffect(() => {
    if (currentAnotacao) {
      const reminderDate = currentAnotacao.reminder_datetime
        ? new Date(currentAnotacao.reminder_datetime)
            .toISOString()
            .split("T")[0]
        : "";
      const reminderTime = currentAnotacao.reminder_datetime
        ? new Date(currentAnotacao.reminder_datetime)
            .toTimeString()
            .slice(0, 5)
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
        notify_push: currentAnotacao.notify_push ?? false,
        notify_email: currentAnotacao.notify_email ?? false,
        tags: currentAnotacao.tags?.join(", ") || "",
      });
      setSelectedClientId(currentAnotacao.client_id || "");
    } else {
      form.reset({
        title: "",
        note: "",
        status: "aberta",
        priority: "media",
        type: "outro",
        client_id: "",
        client_name: "",
        reminder_date: "",
        reminder_time: "",
        notify_push: false,
        notify_email: false,
        tags: "",
      });
      setSelectedClientId("");
    }
  }, [currentAnotacao, form]);

  const onSubmit = (data: AnotacaoFormData) => {
    const tagsArray = data.tags
      ? data.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    let reminderDatetime: string | null = null;

    if (data.reminder_date && data.reminder_time) {
      reminderDatetime = new Date(
        `${data.reminder_date}T${data.reminder_time}`
      ).toISOString();
    }

    const hasReminder = !!reminderDatetime;

    const payload = {
      title: data.title,
      note: data.note,
      status: data.status,
      priority: data.priority,
      type: data.type,
      client_id: data.client_id || null,
      client_name: data.client_name || null,
      // se não tiver data/hora, grava null e garante notificações desligadas
      reminder_datetime: hasReminder ? reminderDatetime : null,
      notify_push: hasReminder ? data.notify_push : false,
      notify_email: hasReminder ? data.notify_email : false,
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
          <SheetTitle>
            {anotacaoId ? "Editar Anotação" : "Nova Anotação"}
          </SheetTitle>
          <SheetDescription>
            Preencha os detalhes da anotação e, se quiser, configure um
            lembrete.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 mt-6"
        >
          {/* TÍTULO */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ex: Ligar para João..."
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* DESCRIÇÃO */}
          <div className="space-y-2">
            <Label htmlFor="note">Descrição</Label>
            <Textarea
              id="note"
              placeholder="Detalhes adicionais..."
              rows={4}
              {...form.register("note")}
            />
          </div>

          {/* STATUS / PRIORIDADE / TIPO */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) =>
                  form.setValue("status", value as any)
                }
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
                onValueChange={(value) =>
                  form.setValue("priority", value as any)
                }
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

          {/* CLIENTE */}
          <div className="space-y-2">
            <Label>Cliente (opcional)</Label>
            <ClienteCombobox
              clientes={clientes}
              value={selectedClientId}
              onChange={(value) => {
                setSelectedClientId(value);
                form.setValue("client_id", value);
                const selected = clientes.find((c) => c.id === value);
                if (selected) {
                  form.setValue("client_name", selected.nome);
                }
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

          {/* LEMBRETE */}
          <div className="space-y-4">
            <Label>Lembrete (opcional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Data
                </div>
                <Input type="date" {...form.register("reminder_date")} />
                {form.formState.errors.reminder_date && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.reminder_date.message as string}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Hora
                </div>
                <Input type="time" {...form.register("reminder_time")} />
              </div>
            </div>

            {/* CANAIS DE NOTIFICAÇÃO */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <Label htmlFor="notify_push_
