import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const leadFormSchema = z.object({
  cliente_id: z.string().min(1, "Selecione um cliente"),
  tipo_piso: z.string().trim().min(1, "Informe o tipo de piso").max(100, "Máximo 100 caracteres"),
  valor_potencial: z.string().min(1, "Informe o valor potencial"),
  origem: z.string().trim().max(100, "Máximo 100 caracteres").optional(),
  responsavel: z.string().trim().max(100, "Máximo 100 caracteres").optional(),
  estagio: z.enum(["novo", "contato", "negociacao", "proposta_enviada", "fechado_ganho", "perdido"]),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  onSubmit: (values: LeadFormValues) => void;
  isLoading?: boolean;
  initialData?: Partial<LeadFormValues>;
  mode?: "create" | "edit";
}

export function LeadForm({ onSubmit, isLoading, initialData, mode = "create" }: LeadFormProps) {
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: initialData || {
      cliente_id: "",
      tipo_piso: "",
      valor_potencial: "",
      origem: "",
      responsavel: "",
      estagio: "novo",
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="estagio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estágio</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estágio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="contato">Contato</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                  <SelectItem value="fechado_ganho">Fechado Ganho</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cliente_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
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
          name="tipo_piso"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Piso</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Porcelanato, Granilite..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="valor_potencial"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor Potencial</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  step="0.01"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="origem"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Origem</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Indicação, Site, WhatsApp..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="responsavel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsável</FormLabel>
              <FormControl>
                <Input placeholder="Nome do responsável" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 justify-end pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading 
              ? (mode === "edit" ? "Salvando..." : "Criando...") 
              : (mode === "edit" ? "Salvar Alterações" : "Criar Lead")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
