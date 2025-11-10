import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { formatDateToLocal } from "@/lib/utils";

const TIPOS_INTERACAO = [
  "Ligação",
  "Email",
  "WhatsApp",
  "Reunião",
  "Visita",
  "Outro",
] as const;

const interacaoSchema = z.object({
  tipo_interacao: z.string().min(1, "Selecione o tipo de interação"),
  data_hora: z.string().min(1, "Data e hora são obrigatórios"),
  observacao: z.string().optional(),
});

type InteracaoFormValues = z.infer<typeof interacaoSchema>;

interface LeadTimelineFormProps {
  leadId: string;
  onSubmit: (data: InteracaoFormValues & { lead_id: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function LeadTimelineForm({ leadId, onSubmit, onCancel, isLoading }: LeadTimelineFormProps) {
  const form = useForm<InteracaoFormValues>({
    resolver: zodResolver(interacaoSchema),
    defaultValues: {
      tipo_interacao: "",
      data_hora: new Date().toISOString().slice(0, 16),
      observacao: "",
    },
  });

  const handleSubmit = (data: InteracaoFormValues) => {
    onSubmit({
      ...data,
      lead_id: leadId,
    });
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="tipo_interacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Interação *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TIPOS_INTERACAO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
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
          name="data_hora"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data e Hora *</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observação</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva os detalhes da interação..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Salvando..." : "Adicionar Interação"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
