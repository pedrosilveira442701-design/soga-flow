import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { ClienteForm } from "./ClienteForm";
import { useClientes } from "@/hooks/useClientes";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const TIPOS_PISO = [
  "Pintura Epóxi",
  "Pintura PU",
  "Pintura PU Quadra",
  "Pintura Acrílica",
  "Pintura Acrílica Quadra",
  "Outro",
] as const;

const leadFormSchema = z
  .object({
    cliente_id: z.string().min(1, "Selecione um cliente"),
    tipo_piso: z.array(z.string()).min(1, "Selecione pelo menos um tipo de piso"),
    tipo_piso_outro: z.string().trim().max(200, "Máximo 200 caracteres").optional(),
    medida: z.string().optional(),
    valor_potencial: z.string().min(1, "Informe o valor potencial"),
    observacoes: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
    origem: z.string().trim().max(100, "Máximo 100 caracteres").optional(),
    responsavel: z.string().trim().max(100, "Máximo 100 caracteres").optional(),
    estagio: z.enum([
      "contato",
      "visita_agendada",
      "visita_realizada",
      "proposta",
      "contrato",
      "execucao",
      "finalizado",
      "perdido",
    ]),
    created_at: z.date().optional(),
  })
  .refine(
    (data) => {
      if (data.tipo_piso.includes("Outro")) {
        return data.tipo_piso_outro && data.tipo_piso_outro.trim().length > 0;
      }
      return true;
    },
    {
      message: "Descreva o tipo de piso",
      path: ["tipo_piso_outro"],
    },
  );

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  onSubmit: (values: LeadFormValues) => void;
  isLoading?: boolean;
  initialData?: Partial<LeadFormValues>;
  mode?: "create" | "edit";
}

export function LeadForm({ onSubmit, isLoading, initialData, mode = "create" }: LeadFormProps) {
  const [isClienteDialogOpen, setIsClienteDialogOpen] = useState(false);
  const [openTipoPiso, setOpenTipoPiso] = useState(false);
  const queryClient = useQueryClient();
  const { createCliente } = useClientes();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: initialData || {
      cliente_id: "",
      tipo_piso: [],
      tipo_piso_outro: "",
      medida: "",
      valor_potencial: "",
      observacoes: "",
      origem: "",
      responsavel: "",
      estagio: "contato",
      created_at: new Date(),
    },
  });

  const selectedTipos = form.watch("tipo_piso");
  const showOutroField = selectedTipos.includes("Outro");

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id, nome").order("nome");

      if (error) throw error;
      return data;
    },
  });

  const handleCreateCliente = async (values: any) => {
    const novoCliente = await createCliente.mutateAsync(values);
    form.setValue("cliente_id", novoCliente.id);
    queryClient.invalidateQueries({ queryKey: ["clientes"] });
    setIsClienteDialogOpen(false);
  };

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
                  <SelectItem value="contato">Entrou em Contato</SelectItem>
                  <SelectItem value="visita_agendada">Visita Agendada</SelectItem>
                  <SelectItem value="visita_realizada">Visita Realizada</SelectItem>
                  <SelectItem value="proposta">Gerou Proposta</SelectItem>
                  <SelectItem value="contrato">Fechou Contrato</SelectItem>
                  <SelectItem value="execucao">Em Execução</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
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
              <div className="flex gap-2">
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="flex-1">
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
                <Button 
                  type="button" 
                  variant="default" 
                  size="icon" 
                  onClick={() => setIsClienteDialogOpen(true)} 
                  className="hover-scale shrink-0"
                >
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                </Button>
              </div>
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
              <Popover open={openTipoPiso} onOpenChange={setOpenTipoPiso}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between font-normal",
                        field.value.length === 0 && "text-muted-foreground",
                      )}
                    >
                      {field.value.length > 0
                        ? `${field.value.length} selecionado${field.value.length > 1 ? "s" : ""}`
                        : "Selecione os tipos de piso"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar tipo de piso..." />
                    <CommandList>
                      <CommandEmpty>Nenhum tipo encontrado.</CommandEmpty>
                      <CommandGroup>
                        {TIPOS_PISO.map((tipo) => {
                          const isSelected = field.value.includes(tipo);
                          return (
                            <CommandItem
                              key={tipo}
                              onSelect={() => {
                                const newValue = isSelected
                                  ? field.value.filter((v) => v !== tipo)
                                  : [...field.value, tipo];
                                field.onChange(newValue);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                              {tipo}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {field.value.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {field.value.map((tipo) => (
                    <Badge key={tipo} variant="secondary" className="gap-1">
                      {tipo}
                      <button
                        type="button"
                        onClick={() => {
                          field.onChange(field.value.filter((v) => v !== tipo));
                        }}
                        className="ml-1 hover:bg-muted rounded-sm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {showOutroField && (
          <FormField
            control={form.control}
            name="tipo_piso_outro"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descreva o tipo de piso</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Concreto polido, Mármore..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="medida"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medida (m²)</FormLabel>
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
          name="valor_potencial"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Orçamento</FormLabel>
              <FormControl>
                <Input 
                  placeholder="R$ 0,00" 
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    const numericValue = parseFloat(value) / 100;
                    field.onChange(numericValue.toString());
                  }}
                  value={
                    field.value 
                      ? new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(parseFloat(field.value) || 0)
                      : ''
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Observações sobre o lead..." {...field} />
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

        {mode === "create" && (
          <FormField
            control={form.control}
            name="created_at"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Criação do Lead</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione a data</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex gap-3 justify-end pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? mode === "edit"
                ? "Salvando..."
                : "Criando..."
              : mode === "edit"
                ? "Salvar Alterações"
                : "Criar Lead"}
          </Button>
        </div>
      </form>

      {/* Dialog para criar novo cliente */}
      <Dialog open={isClienteDialogOpen} onOpenChange={setIsClienteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>Criar Novo Cliente</DialogTitle>
            <DialogDescription>Preencha os dados do cliente para adicioná-lo rapidamente</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6">
            <ClienteForm 
              onSubmit={handleCreateCliente} 
              isLoading={createCliente.isPending} 
              mode="create"
              onCancel={() => setIsClienteDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
