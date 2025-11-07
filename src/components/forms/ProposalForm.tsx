import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, X, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useClientes } from "@/hooks/useClientes";
import ArquivosList from "@/components/arquivos/ArquivosList";
import { Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TIPOS_PRODUTO = [
  "Pintura Epóxi",
  "Pintura PU",
  "Pintura PU Quadra",
  "Pintura Acrílica",
  "Pintura Acrílica Quadra",
  "Pintura de Parede",
  "Piso Autonivelante",
  "Outro",
] as const;

const servicoSchema = z.object({
  tipo: z.string().min(1, "Selecione o tipo"),
  tipo_outro: z.string().optional(),
  m2: z.number().positive("Área deve ser maior que zero"),
  valor_m2: z.number().positive("Preço deve ser maior que zero"),
  custo_m2: z.number().positive("Custo deve ser maior que zero"),
}).refine(
  (data) => {
    if (data.tipo === "Outro") {
      return data.tipo_outro && data.tipo_outro.trim().length > 0;
    }
    return true;
  },
  {
    message: "Descreva o tipo de serviço",
    path: ["tipo_outro"],
  },
);

const proposalSchema = z.object({
  cliente_id: z.string().min(1, "Cliente é obrigatório"),
  lead_id: z.string().optional(),
  servicos: z.array(servicoSchema).min(1, "Adicione pelo menos um serviço"),
  desconto: z.number().min(0, "Desconto não pode ser negativo").default(0),
  data: z.string().optional(),
  status: z.string().optional(),
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

interface ProposalFormProps {
  onSubmit: (data: ProposalFormValues) => void;
  initialData?: Partial<ProposalFormValues> & { id?: string };
}

export default function ProposalForm({
  onSubmit,
  initialData,
}: ProposalFormProps) {
  const { clientes = [], isLoading: isLoadingClientes } = useClientes();
  const [autoFilledFromLead, setAutoFilledFromLead] = useState(false);
  const [leadInfo, setLeadInfo] = useState<{ id: string; name: string } | null>(null);
  
  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      cliente_id: initialData?.cliente_id || "",
      lead_id: initialData?.lead_id || "",
      servicos: initialData?.servicos || [{ tipo: "", tipo_outro: "", m2: 0, valor_m2: 0, custo_m2: 0 }],
      desconto: initialData?.desconto || 0,
      data: initialData?.data || new Date().toISOString().split('T')[0],
      status: initialData?.status || "aberta",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "servicos",
  });

  const servicos = form.watch("servicos");
  const desconto = form.watch("desconto") || 0;
  const selectedClienteId = form.watch("cliente_id");

  // Buscar leads do cliente selecionado
  const { data: leadsDoCliente } = useQuery({
    queryKey: ["leads-by-cliente", selectedClienteId],
    queryFn: async () => {
      if (!selectedClienteId) return null;
      
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("cliente_id", selectedClienteId)
        .not("produtos", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!selectedClienteId && !initialData,
  });

  // Auto-preencher serviços do lead quando cliente for selecionado
  useEffect(() => {
    if (leadsDoCliente && !autoFilledFromLead && !initialData) {
      const lead = leadsDoCliente;
      const produtos = lead.produtos as Array<{ tipo: string; medida: number | null }>;
      
      if (produtos && Array.isArray(produtos) && produtos.length > 0) {
        // Mapear produtos do lead para serviços da proposta
        const servicosPreenchidos = produtos.map(p => {
          let tipo = p.tipo;
          let tipo_outro = "";
          
          // Se começar com "Outro:", extrair a descrição
          if (p.tipo?.startsWith("Outro:")) {
            tipo = "Outro";
            tipo_outro = p.tipo.replace("Outro:", "").trim();
          }
          
          return {
            tipo,
            tipo_outro,
            m2: p.medida || 0,
            valor_m2: 0,
            custo_m2: 0,
          };
        });
        
        form.setValue("servicos", servicosPreenchidos);
        form.setValue("lead_id", lead.id);
        setAutoFilledFromLead(true);
        setLeadInfo({ id: lead.id, name: `Lead #${lead.id.slice(0, 8)}` });
      }
    }
  }, [leadsDoCliente, autoFilledFromLead, initialData, form]);

  const totalBruto = servicos.reduce((acc, s) => acc + (s.m2 * s.valor_m2), 0);
  const totalCusto = servicos.reduce((acc, s) => acc + (s.m2 * s.custo_m2), 0);
  const totalComDesconto = totalBruto - desconto;
  const valorLiquido = totalComDesconto - totalCusto;
  const margem = totalComDesconto > 0 ? (valorLiquido / totalComDesconto) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const selectedCliente = clientes?.find(c => c.id === form.watch("cliente_id"));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingClientes}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingClientes ? "Carregando clientes..." : "Selecione um cliente"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientes.length === 0 ? (
                        <SelectItem value="no-clients" disabled>
                          Nenhum cliente cadastrado
                        </SelectItem>
                      ) : (
                        clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome} {cliente.cidade && `- ${cliente.cidade}`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Serviços</h3>
                  {leadInfo && (
                    <Badge variant="secondary" className="gap-1">
                      <Info className="w-3 h-3" />
                      Preenchido do {leadInfo.name}
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ tipo: "", tipo_outro: "", m2: 0, valor_m2: 0, custo_m2: 0 })}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Serviço
                </Button>
              </div>

              {fields.map((field, index) => {
                const tipoSelecionado = form.watch(`servicos.${index}.tipo`);
                
                return (
                  <Card key={field.id} className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Serviço {index + 1}</h4>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name={`servicos.${index}.tipo`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Serviço *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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

                    {tipoSelecionado === "Outro" && (
                      <FormField
                        control={form.control}
                        name={`servicos.${index}.tipo_outro`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descreva o tipo de serviço *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: Pintura especial, revestimento customizado..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`servicos.${index}.m2`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Área (m²) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`servicos.${index}.valor_m2`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preço/m² (R$) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`servicos.${index}.custo_m2`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custo/m² (R$) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">
                          {formatCurrency(form.watch(`servicos.${index}.m2`) * form.watch(`servicos.${index}.valor_m2`))}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Campo de Desconto */}
            <FormField
              control={form.control}
              name="desconto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desconto (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data da Proposta</FormLabel>
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
                          {field.value ? (
                            format(new Date(field.value), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />


            {initialData && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="aberta">Aberta</SelectItem>
                        <SelectItem value="fechada">Fechada</SelectItem>
                        <SelectItem value="perdida">Perdida</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Seção de Arquivos - apenas em edição */}
            {initialData?.id && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Arquivos Anexados</h3>
                </div>
                <ArquivosList 
                  entidade="proposta"
                  entidadeId={initialData.id}
                  showUpload={true}
                  compact={false}
                />
              </Card>
            )}

            <Button type="submit" className="w-full">
              Salvar Proposta
            </Button>
          </form>
        </Form>
      </div>

      <div className="space-y-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Resumo Financeiro</h3>
          {selectedCliente && (
            <div className="mb-4 pb-4 border-b">
              <div className="text-sm text-muted-foreground">Cliente</div>
              <div className="font-medium">{selectedCliente.nome}</div>
              {selectedCliente.cidade && (
                <div className="text-xs text-muted-foreground">{selectedCliente.cidade}</div>
              )}
            </div>
          )}
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-muted-foreground">Total Bruto</span>
              <span className="font-semibold text-primary">{formatCurrency(totalBruto)}</span>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Desconto</span>
                <span className="font-semibold text-destructive">-{formatCurrency(desconto)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-muted-foreground">Total com Desconto</span>
              <span className="font-semibold text-primary">{formatCurrency(totalComDesconto)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-muted-foreground">Total Custo</span>
              <span className="font-semibold text-muted-foreground">{formatCurrency(totalCusto)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm font-medium">Valor Líquido</span>
              <span className="text-xl font-bold text-success">{formatCurrency(valorLiquido)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-medium">Margem</span>
              <span className={`text-xl font-bold ${margem < 20 ? 'text-destructive' : margem < 35 ? 'text-yellow-600' : 'text-success'}`}>
                {margem.toFixed(1)}%
              </span>
            </div>
            {margem < 20 && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded mt-2">
                ⚠️ Atenção: margem abaixo do recomendado (mín. 20%)
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
