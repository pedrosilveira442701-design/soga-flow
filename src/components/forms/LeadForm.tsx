import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClienteForm } from "./ClienteForm";
import { useClientes } from "@/hooks/useClientes";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import ClienteCombobox from "@/components/forms/ClienteCombobox";

const TIPOS_PRODUTO = [
  "Pintura Epóxi",
  "Pintura PU",
  "Pintura PU Quadra",
  "Pintura Acrílica",
  "Pintura Acrílica Quadra",
  "Pintura de Parede",
  "Piso Autonivelante",
  "Piso Uretano",
  "Uretano Vertical",
  "Rodapé Abaulado",
  "Concretagem",
  "Outro",
] as const;

const ORIGENS = ["Instagram", "Orgânico", "Indicação", "Sindico Profissional", "Google", "Outro"] as const;

const produtoSchema = z
  .object({
    tipo: z.string().min(1, "Selecione o tipo"),
    tipo_outro: z.string().optional(),
    medida: z.string().optional(),
    valor: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.tipo === "Outro") {
        return data.tipo_outro && data.tipo_outro.trim().length > 0;
      }
      return true;
    },
    {
      message: "Descreva o tipo de produto",
      path: ["tipo_outro"],
    },
  );

const leadFormSchema = z
  .object({
    cliente_id: z.string().min(1, "Selecione um cliente"),
    produtos: z.array(produtoSchema).min(1, "Adicione pelo menos um produto"),
    valor_potencial: z.string().optional(),
    observacoes: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
    origem: z.string().optional(),
    origem_descricao: z.string().trim().max(200, "Máximo 200 caracteres").optional(),
    responsavel: z.string().trim().max(100, "Máximo 100 caracteres").optional(),
    estagio: z.enum([
      "contato",
      "visita_agendada",
      "visita_realizada",
      "proposta_pendente",
      "proposta",
      "em_analise",
      "contrato",
      "execucao",
      "finalizado",
      "repouso",
      "perdido",
    ]),
    created_at: z.date().optional(),
    ultima_interacao: z.date().optional(),
  })
  .refine(
    (data) => {
      if (data.origem === "Indicação" || data.origem === "Outro") {
        return data.origem_descricao && data.origem_descricao.trim().length > 0;
      }
      return true;
    },
    {
      message: "Informe a descrição",
      path: ["origem_descricao"],
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
  const queryClient = useQueryClient();
  const { clientes = [], isLoading: isLoadingClientes, createCliente } = useClientes();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      cliente_id: initialData?.cliente_id || "",
      produtos: initialData?.produtos || [{ tipo: "", tipo_outro: "", medida: "", valor: "" }],
      valor_potencial: initialData?.valor_potencial || "",
      observacoes: initialData?.observacoes || "",
      origem: initialData?.origem || "",
      origem_descricao: initialData?.origem_descricao || "",
      responsavel: initialData?.responsavel || "",
      estagio: initialData?.estagio || "contato",
      created_at: initialData?.created_at || new Date(),
      ultima_interacao: initialData?.ultima_interacao || new Date(),
    },
  });

  // Calcular valor_potencial como soma dos valores totais de cada produto
  const calcularValorTotal = () => {
    const produtosAtuais = form.getValues("produtos");
    const total = produtosAtuais.reduce((acc, p) => {
      const valor = parseFloat(p.valor || "0") || 0;
      return acc + valor;
    }, 0);
    form.setValue("valor_potencial", total.toString());
  };

  const produtos = form.watch("produtos") || [];
  const origemSelecionada = form.watch("origem");
  const mostrarOrigemDescricao = origemSelecionada === "Indicação" || origemSelecionada === "Outro";

  const addProduto = () => {
    const currentProdutos = form.getValues("produtos");
    form.setValue("produtos", [...currentProdutos, { tipo: "", tipo_outro: "", medida: "", valor: "" }]);
  };

  const removeProduto = (index: number) => {
    const currentProdutos = form.getValues("produtos");
    if (currentProdutos.length > 1) {
      form.setValue(
        "produtos",
        currentProdutos.filter((_, i) => i !== index),
      );
      // Recalcular valor total após remover
      setTimeout(calcularValorTotal, 0);
    }
  };

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
                  <SelectItem value="proposta_pendente">Proposta Pendente</SelectItem>
                  <SelectItem value="proposta">Gerou Proposta</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="contrato">Fechou Contrato</SelectItem>
                  <SelectItem value="execucao">Em Execução</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="repouso">Repouso</SelectItem>
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
                <div className="flex-1">
                  <FormControl>
                    <ClienteCombobox
                      clientes={clientes}
                      value={field.value}
                      onChange={field.onChange}
                      isLoading={isLoadingClientes}
                    />
                  </FormControl>
                </div>
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Produtos</FormLabel>
            <Button type="button" variant="outline" size="sm" onClick={addProduto} className="gap-2">
              <Plus className="h-5 w-5" />
              Adicionar Produto
            </Button>
          </div>

          {produtos.map((_, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4 relative">
              {produtos.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => removeProduto(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              <FormField
                control={form.control}
                name={`produtos.${index}.tipo`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Produto {produtos.length > 1 ? `${index + 1}` : ""}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {TIPOS_PRODUTO.map((tipo) => (
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

              {produtos[index]?.tipo === "Outro" && (
                <FormField
                  control={form.control}
                  name={`produtos.${index}.tipo_outro`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descreva o tipo de produto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Concreto polido, Mármore..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`produtos.${index}.medida`}
                  render={({ field }) => {
                    const tipoSelecionado = produtos[index]?.tipo;
                    const label = tipoSelecionado === "Rodapé Abaulado" ? "Metros Lineares (ml)" : "Medida (m²)";
                    return (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            step="0.01" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              // Recalcular valor total quando a medida muda
                              setTimeout(calcularValorTotal, 0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name={`produtos.${index}.valor`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="R$ 0,00"
                          value={
                            field.value
                              ? new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(parseFloat(field.value) || 0)
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            const numericValue = parseFloat(value) / 100;
                            field.onChange(numericValue.toString());
                            // Recalcular valor total
                            setTimeout(calcularValorTotal, 0);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>

        <FormField
          control={form.control}
          name="valor_potencial"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Orçamento Total (calculado)</FormLabel>
              <FormControl>
                <Input
                  placeholder="R$ 0,00"
                  readOnly
                  className="bg-muted cursor-not-allowed"
                  value={
                    field.value
                      ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(parseFloat(field.value) || 0)
                      : "R$ 0,00"
                  }
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Soma dos valores de cada produto
              </p>
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
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-background">
                  {ORIGENS.map((origem) => (
                    <SelectItem key={origem} value={origem}>
                      {origem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {mostrarOrigemDescricao && (
          <FormField
            control={form.control}
            name="origem_descricao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{origemSelecionada === "Indicação" ? "Quem indicou?" : "Descreva a origem"}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={origemSelecionada === "Indicação" ? "Nome de quem indicou..." : "Descreva a origem..."}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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

        {/* Data de Criação do Lead */}
        <div className="space-y-2">
          <FormLabel>Data de Criação do Lead</FormLabel>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="created_at"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value instanceof Date ? format(field.value, "dd/MM/yyyy") : "Selecione a data"}
                          <CalendarIcon className="ml-auto h-5 w-5 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value instanceof Date ? field.value : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const currentDate = field.value instanceof Date ? field.value : new Date();
                            date.setHours(currentDate.getHours(), currentDate.getMinutes());
                            field.onChange(date);
                          }
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="created_at"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormControl>
                    <Input
                      type="time"
                      value={field.value instanceof Date ? format(field.value, "HH:mm") : ""}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(":").map(Number);
                        const currentDate = field.value instanceof Date ? new Date(field.value) : new Date();
                        currentDate.setHours(hours, minutes);
                        field.onChange(currentDate);
                      }}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Última Interação */}
        <div className="space-y-2">
          <FormLabel>Última Interação</FormLabel>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="ultima_interacao"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value instanceof Date ? format(field.value, "dd/MM/yyyy") : "Selecione a data"}
                          <CalendarIcon className="ml-auto h-5 w-5 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value instanceof Date ? field.value : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const currentDate = field.value instanceof Date ? field.value : new Date();
                            date.setHours(currentDate.getHours(), currentDate.getMinutes());
                            field.onChange(date);
                          }
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ultima_interacao"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormControl>
                    <Input
                      type="time"
                      value={field.value instanceof Date ? format(field.value, "HH:mm") : ""}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(":").map(Number);
                        const currentDate = field.value instanceof Date ? new Date(field.value) : new Date();
                        currentDate.setHours(hours, minutes);
                        field.onChange(currentDate);
                      }}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
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
