import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const lossReasonSchema = z.object({
  motivo: z.string().min(1, "Selecione um motivo"),
  detalhes: z.string().max(500, "Detalhes devem ter no máximo 500 caracteres").optional(),
});

type LossReasonFormData = z.infer<typeof lossReasonSchema>;

interface LossReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (motivo: string, detalhes?: string) => void;
  isLoading?: boolean;
  clienteName?: string;
}

const MOTIVOS_PERDA = [
  { value: "preco", label: "Preço muito alto" },
  { value: "prazo", label: "Prazo de entrega" },
  { value: "concorrente", label: "Escolheu concorrente" },
  { value: "desistiu", label: "Cliente desistiu do projeto" },
  { value: "sem_resposta", label: "Sem resposta do cliente" },
  { value: "qualidade", label: "Questões de qualidade" },
  { value: "pagamento", label: "Condições de pagamento" },
  { value: "outro", label: "Outro motivo" },
];

export function LossReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  clienteName,
}: LossReasonDialogProps) {
  const form = useForm<LossReasonFormData>({
    resolver: zodResolver(lossReasonSchema),
    defaultValues: {
      motivo: "",
      detalhes: "",
    },
  });

  const handleSubmit = (data: LossReasonFormData) => {
    const motivoLabel = MOTIVOS_PERDA.find((m) => m.value === data.motivo)?.label || data.motivo;
    const motivoCompleto = data.detalhes 
      ? `${motivoLabel}: ${data.detalhes}`
      : motivoLabel;
    
    onConfirm(motivoCompleto, data.detalhes);
    form.reset();
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Motivo da Perda</DialogTitle>
          <DialogDescription>
            {clienteName 
              ? `Por que o lead "${clienteName}" foi perdido?`
              : "Por que este lead foi perdido?"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo principal *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MOTIVOS_PERDA.map((motivo) => (
                        <SelectItem key={motivo.value} value={motivo.value}>
                          {motivo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="detalhes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalhes adicionais (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione mais informações sobre a perda do lead..."
                      className="resize-none h-24"
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Confirmar Perda"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
