import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, formatDateToLocal } from "@/lib/utils";
import { useClientes } from "@/hooks/useClientes";
import { usePropostasFechadas } from "@/hooks/useContratos";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ClienteCombobox from "@/components/forms/ClienteCombobox";
import { ParcelasFormEditor, ParcelaPreview } from "./ParcelasFormEditor";

const contratoSchema = z
  .object({
    cliente_id: z.string().min(1, "Cliente é obrigatório"),
    proposta_id: z.string().optional(),
    valor_negociado: z.number().min(1, "Valor deve ser maior que zero"),
    margem_pct: z.number().min(0).max(100, "Margem deve estar entre 0 e 100").optional(),
    cpf_cnpj: z.string().min(11, "CPF/CNPJ inválido"),
    valor_entrada: z.number().min(0, "Valor de entrada não pode ser negativo").optional(),
    forma_pagamento_entrada: z.string().optional(),
    forma_pagamento: z.string().min(1, "Forma de pagamento é obrigatória"),
    data_inicio: z.string().min(1, "Data de início é obrigatória"),
    observacoes: z.string().optional(),
  })
  .refine(
    (data) => {
      // Se houver entrada, a forma de pagamento da entrada é obrigatória
      if (data.valor_entrada && data.valor_entrada > 0) {
        return !!data.forma_pagamento_entrada;
      }
      return true;
    },
    {
      message: "Forma de pagamento da entrada é obrigatória quando há valor de entrada",
      path: ["forma_pagamento_entrada"],
    },
  )
  .refine(
    (data) => {
      // Entrada não pode ser maior ou igual ao valor total
      if (data.valor_entrada && data.valor_entrada >= data.valor_negociado) {
        return false;
      }
      return true;
    },
    {
      message: "Entrada não pode ser maior ou igual ao valor total",
      path: ["valor_entrada"],
    },
  );

type ContratoFormValues = z.infer<typeof contratoSchema>;

export interface ContratoFormSubmitData extends ContratoFormValues {
  parcelas: ParcelaPreview[];
}

interface ContratoFormProps {
  onSubmit: (data: ContratoFormSubmitData) => Promise<void>;
  initialData?: Partial<ContratoFormValues> & { parcelas?: ParcelaPreview[] };
  mode?: "create" | "fromProposta" | "edit";
}

export function ContratoForm({ onSubmit, initialData, mode = "create" }: ContratoFormProps) {
  const { clientes = [], isLoading: isLoadingClientes } = useClientes();
  const { data: propostasFechadas = [], isLoading: isLoadingPropostas } = usePropostasFechadas();

  const [parcelas, setParcelas] = useState<ParcelaPreview[]>(initialData?.parcelas || []);
  const [parcelasErrors, setParcelasErrors] = useState<string[]>([]);

  const form = useForm<ContratoFormValues>({
    resolver: zodResolver(contratoSchema),
    defaultValues: {
      cliente_id: initialData?.cliente_id || "",
      proposta_id: initialData?.proposta_id || "",
      valor_negociado: initialData?.valor_negociado || 0,
      margem_pct: initialData?.margem_pct || 0,
      cpf_cnpj: initialData?.cpf_cnpj || "",
      valor_entrada: initialData?.valor_entrada || 0,
      forma_pagamento_entrada: initialData?.forma_pagamento_entrada || "",
      forma_pagamento: initialData?.forma_pagamento || "",
      data_inicio: initialData?.data_inicio || formatDateToLocal(new Date()),
      observacoes: initialData?.observacoes || "",
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const clienteIdWatch = form.watch("cliente_id");
  const propostaIdWatch = form.watch("proposta_id");
  const valorWatch = form.watch("valor_negociado");
  const valorEntradaWatch = form.watch("valor_entrada") || 0;
  const dataInicioWatch = form.watch("data_inicio");

  const selectedProposta = propostasFechadas.find((p: any) => p.id === propostaIdWatch);
  const valorRestante = valorWatch - valorEntradaWatch;

  // Carregar dados da proposta automaticamente quando o componente monta com proposta_id
  useEffect(() => {
    if (initialData?.proposta_id && propostasFechadas.length > 0 && clientes.length > 0) {
      const proposta = propostasFechadas.find((p: any) => p.id === initialData.proposta_id);
      if (proposta) {
        form.setValue("proposta_id", proposta.id);
        form.setValue("cliente_id", proposta.cliente_id);
        form.setValue("valor_negociado", Number(proposta.valor_total));
        form.setValue("margem_pct", Number(proposta.margem_pct || 0));
        
        // Preencher forma de pagamento da proposta
        if (proposta.forma_pagamento) {
          form.setValue("forma_pagamento", proposta.forma_pagamento);
        }
        
        // Buscar CPF/CNPJ do cliente
        const cliente = clientes.find((c) => c.id === proposta.cliente_id);
        if (cliente?.cpf_cnpj) {
          form.setValue("cpf_cnpj", cliente.cpf_cnpj);
        }
        
        // Definir observação padrão
        const servicosArr = proposta.servicos && Array.isArray(proposta.servicos) 
          ? proposta.servicos 
          : [];
        const totalM2 = servicosArr.length > 0 
          ? servicosArr.reduce((acc: number, s: any) => acc + (Number(s.m2) || 0), 0)
          : Number(proposta.m2) || 0;
        form.setValue("observacoes", `Contrato gerado a partir da proposta - ${Number(totalM2).toFixed(2)}m²`);
      }
    }
  }, [initialData?.proposta_id, propostasFechadas, clientes, form]);

  // Filtrar propostas fechadas por cliente selecionado
  const propostasPorCliente = useMemo(() => {
    if (!clienteIdWatch) return [];
    return propostasFechadas.filter((p: any) => p.cliente_id === clienteIdWatch);
  }, [clienteIdWatch, propostasFechadas]);

  // Verificar se a proposta selecionada já tem contrato
  const propostaJaTemContrato = useMemo(() => {
    if (!propostaIdWatch) return false;
    const proposta: any = propostasFechadas.find((p: any) => p.id === propostaIdWatch);
    return proposta?.has_contrato || false;
  }, [propostaIdWatch, propostasFechadas]);

  // Quando seleciona uma proposta, preencher dados automaticamente
  const handlePropostaChange = (propostaId: string) => {
    const proposta = propostasFechadas.find((p: any) => p.id === propostaId);
    if (proposta) {
      form.setValue("proposta_id", propostaId);

      // No modo fromProposta, também seta o cliente
      if (mode === "fromProposta") {
        form.setValue("cliente_id", proposta.cliente_id);
      }

      // Valor negociado deve ser o valor bruto (valor_total)
      form.setValue("valor_negociado", Number(proposta.valor_total));
      form.setValue("margem_pct", Number(proposta.margem_pct || 0));

      // Preencher forma de pagamento da proposta
      if (proposta.forma_pagamento) {
        form.setValue("forma_pagamento", proposta.forma_pagamento);
      }

      // Buscar CPF/CNPJ do cliente
      const cliente = clientes.find((c) => c.id === proposta.cliente_id);
      if (cliente?.cpf_cnpj) {
        form.setValue("cpf_cnpj", cliente.cpf_cnpj);
      }
    }
  };

  const formasPagamento = [
    "À Vista",
    "Boleto",
    "Cartão de Crédito",
    "Cartão de Débito",
    "PIX",
    "Transferência Bancária",
    "Cheque",
  ];

  // Validar parcelas antes de submeter
  const validateParcelas = (): boolean => {
    const errors: string[] = [];
    
    if (parcelas.length === 0 && valorRestante > 0) {
      errors.push("É necessário gerar o cronograma de parcelas");
    }

    const somaParcelas = parcelas.reduce((sum, p) => sum + p.valor, 0);
    if (Math.abs(somaParcelas - valorRestante) > 0.01) {
      errors.push(`A soma das parcelas (${formatCurrency(somaParcelas)}) deve ser igual ao saldo (${formatCurrency(valorRestante)})`);
    }

    // Verificar datas duplicadas
    const datas = parcelas.map(p => p.vencimento);
    const duplicadas = datas.filter((data, idx) => datas.indexOf(data) !== idx);
    if (duplicadas.length > 0) {
      errors.push("Existem datas de vencimento duplicadas");
    }

    // Verificar se a 1ª parcela é >= data de início
    if (parcelas.length > 0 && parcelas[0].vencimento < dataInicioWatch) {
      errors.push("A data da 1ª parcela não pode ser anterior à data de início");
    }

    // Verificar valores zerados
    const parcelasZeradas = parcelas.filter(p => p.valor <= 0);
    if (parcelasZeradas.length > 0) {
      errors.push("Existem parcelas com valor zerado ou negativo");
    }

    setParcelasErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (data: ContratoFormValues) => {
    if (!validateParcelas()) {
      return;
    }

    await onSubmit({
      ...data,
      parcelas,
    });
    form.reset();
    setParcelas([]);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda - Dados do Contrato */}
          <div className="space-y-4">
            {mode === "fromProposta" && (
              <FormField
                control={form.control}
                name="proposta_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proposta Fechada *</FormLabel>
                    <Select onValueChange={handlePropostaChange} value={field.value} disabled={isLoadingPropostas}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma proposta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {propostasFechadas.length === 0 ? (
                          <SelectItem value="no-propostas" disabled>
                            Nenhuma proposta fechada disponível
                          </SelectItem>
                        ) : (
                          propostasFechadas.map((proposta: any) => (
                            <SelectItem key={proposta.id} value={proposta.id}>
                              {proposta.cliente?.nome} -{" "}
                              {formatCurrency(Number(proposta.liquido || proposta.valor_total))}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <FormControl>
                    <ClienteCombobox
                      clientes={clientes}
                      value={field.value}
                      onChange={(clienteId) => {
                        field.onChange(clienteId);
                        const cliente = clientes.find((c) => c.id === clienteId);
                        if (cliente?.cpf_cnpj) {
                          form.setValue("cpf_cnpj", cliente.cpf_cnpj);
                        } else {
                          form.setValue("cpf_cnpj", "");
                        }
                      }}
                      disabled={isLoadingClientes || !!selectedProposta}
                      isLoading={isLoadingClientes}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo Proposta do Cliente - só aparece no modo create quando cliente for selecionado */}
            {mode === "create" && clienteIdWatch && propostasPorCliente.length > 0 && (
              <>
                <FormField
                  control={form.control}
                  name="proposta_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proposta do Cliente (opcional)</FormLabel>
                      <Select onValueChange={handlePropostaChange} value={field.value} disabled={isLoadingPropostas}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma proposta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {propostasPorCliente.map((proposta: any) => (
                            <SelectItem key={proposta.id} value={proposta.id} disabled={proposta.has_contrato}>
                              #{proposta.id.substring(0, 8)} - {proposta.tipo_piso} -{" "}
                              {formatCurrency(Number(proposta.valor_total))}
                              {proposta.has_contrato && " (já tem contrato)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {propostaJaTemContrato && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-5 w-5" />
                    <AlertDescription>
                      Esta proposta já possui um contrato vinculado. Não é possível criar múltiplos contratos da mesma
                      proposta.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            <FormField
              control={form.control}
              name="cpf_cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF/CNPJ *</FormLabel>
                  <FormControl>
                    <Input placeholder="000.000.000-00 ou 00.000.000/0000-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valor_negociado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Total *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
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
              name="margem_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Margem (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="0,00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <h4 className="font-medium text-sm">Entrada</h4>

              <FormField
                control={form.control}
                name="valor_entrada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da Entrada</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {valorEntradaWatch > 0 && (
                <FormField
                  control={form.control}
                  name="forma_pagamento_entrada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Pagamento da Entrada *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {formasPagamento.map((forma) => (
                            <SelectItem key={forma} value={forma}>
                              {forma}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <h4 className="font-medium text-sm">Parcelas do Restante</h4>

              <FormField
                control={form.control}
                name="forma_pagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de Pagamento das Parcelas *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {formasPagamento.map((forma) => (
                          <SelectItem key={forma} value={forma}>
                            {forma}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="data_inicio"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Início *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? (
                            format(new Date(field.value + "T00:00:00"), "PPP", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-5 w-5 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value + "T00:00:00") : undefined}
                        onSelect={(date) => field.onChange(date ? formatDateToLocal(date) : undefined)}
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
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais sobre o contrato..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Coluna Direita - Resumo e Parcelas */}
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-4">Resumo do Contrato</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">Valor Total:</span>
                  <span className="font-semibold">{formatCurrency(valorWatch)}</span>
                </div>

                {valorEntradaWatch > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entrada:</span>
                    <span className="font-medium text-primary">{formatCurrency(valorEntradaWatch)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo a Parcelar:</span>
                  <span className="font-medium">{formatCurrency(valorRestante)}</span>
                </div>

                {parcelas.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Parcelas Configuradas:</span>
                    <span>{parcelas.length}x</span>
                  </div>
                )}
              </div>

              {valorEntradaWatch >= valorWatch && (
                <Alert className="mt-4">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription>Entrada não pode ser maior ou igual ao valor total</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>

        {/* Seção de Parcelas - Full Width */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Cronograma de Parcelas</h3>
          
          <ParcelasFormEditor
            valorTotal={valorWatch}
            valorEntrada={valorEntradaWatch}
            dataInicio={dataInicioWatch}
            parcelas={parcelas}
            onChange={setParcelas}
            errors={parcelasErrors}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="submit">
            {mode === "edit" ? "Salvar Alterações" : "Criar Contrato"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
