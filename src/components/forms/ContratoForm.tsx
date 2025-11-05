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
import { Textarea } from "@/components/ui/textarea";
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
import { CalendarIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useClientes } from "@/hooks/useClientes";
import { usePropostasFechadas } from "@/hooks/useContratos";
import { Alert, AlertDescription } from "@/components/ui/alert";

const contratoSchema = z.object({
  cliente_id: z.string().min(1, "Cliente é obrigatório"),
  proposta_id: z.string().optional(),
  valor_negociado: z.number().min(1, "Valor deve ser maior que zero"),
  cpf_cnpj: z.string().min(11, "CPF/CNPJ inválido"),
  forma_pagamento: z.string().min(1, "Forma de pagamento é obrigatória"),
  data_inicio: z.string().min(1, "Data de início é obrigatória"),
  numero_parcelas: z.number().min(1).max(48, "Máximo 48 parcelas"),
  dia_vencimento: z.number().min(1).max(31, "Dia deve estar entre 1 e 31"),
  observacoes: z.string().optional(),
});

type ContratoFormValues = z.infer<typeof contratoSchema>;

interface ContratoFormProps {
  onSubmit: (data: ContratoFormValues) => Promise<void>;
  initialData?: Partial<ContratoFormValues>;
  mode?: "create" | "fromProposta";
}

export function ContratoForm({ onSubmit, initialData, mode = "create" }: ContratoFormProps) {
  const { clientes = [], isLoading: isLoadingClientes } = useClientes();
  const { data: propostasFechadas = [], isLoading: isLoadingPropostas } = usePropostasFechadas();

  const form = useForm<ContratoFormValues>({
    resolver: zodResolver(contratoSchema),
    defaultValues: {
      cliente_id: initialData?.cliente_id || "",
      proposta_id: initialData?.proposta_id || "",
      valor_negociado: initialData?.valor_negociado || 0,
      cpf_cnpj: initialData?.cpf_cnpj || "",
      forma_pagamento: initialData?.forma_pagamento || "",
      data_inicio: initialData?.data_inicio || new Date().toISOString().split("T")[0],
      numero_parcelas: initialData?.numero_parcelas || 1,
      dia_vencimento: initialData?.dia_vencimento || 10,
      observacoes: initialData?.observacoes || "",
    },
  });

  const handleSubmit = async (data: ContratoFormValues) => {
    await onSubmit(data);
    form.reset();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const propostaIdWatch = form.watch("proposta_id");
  const valorWatch = form.watch("valor_negociado");
  const parcelasWatch = form.watch("numero_parcelas");
  const diaVencimentoWatch = form.watch("dia_vencimento");
  const dataInicioWatch = form.watch("data_inicio");

  const selectedProposta = propostasFechadas.find((p) => p.id === propostaIdWatch);
  const valorParcela = valorWatch / parcelasWatch;

  // Calcular previsão de parcelas
  const previewParcelas = Array.from({ length: Math.min(parcelasWatch, 5) }, (_, i) => {
    const vencimento = new Date(dataInicioWatch);
    vencimento.setMonth(vencimento.getMonth() + i);
    vencimento.setDate(diaVencimentoWatch);
    return {
      numero: i + 1,
      vencimento: format(vencimento, "dd/MM/yyyy", { locale: ptBR }),
      valor: valorParcela,
    };
  });

  // Quando seleciona uma proposta, preencher dados automaticamente
  const handlePropostaChange = (propostaId: string) => {
    const proposta = propostasFechadas.find((p) => p.id === propostaId);
    if (proposta) {
      form.setValue("proposta_id", propostaId);
      form.setValue("cliente_id", proposta.cliente_id);
      form.setValue("valor_negociado", Number(proposta.liquido || proposta.valor_total));
    }
  };

  const formasPagamento = [
    "À Vista",
    "Boleto",
    "Cartão de Crédito",
    "Cartão de Débito",
    "Pix",
    "Transferência Bancária",
    "Cheque",
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna Esquerda - Formulário */}
          <div className="space-y-4">
            {mode === "fromProposta" && (
              <FormField
                control={form.control}
                name="proposta_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proposta Fechada *</FormLabel>
                    <Select
                      onValueChange={handlePropostaChange}
                      value={field.value}
                      disabled={isLoadingPropostas}
                    >
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
                          propostasFechadas.map((proposta) => (
                            <SelectItem key={proposta.id} value={proposta.id}>
                              {proposta.cliente?.nome} - {formatCurrency(Number(proposta.liquido || proposta.valor_total))}
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingClientes || !!selectedProposta}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
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
                  <FormLabel>Valor Negociado *</FormLabel>
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
              name="forma_pagamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento *</FormLabel>
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
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP", { locale: ptBR })
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
                        onSelect={(date) =>
                          field.onChange(date?.toISOString().split("T")[0])
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numero_parcelas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcelas *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="48"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dia_vencimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia Vencimento *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

          {/* Coluna Direita - Preview */}
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-4">Resumo do Contrato</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Total:</span>
                  <span className="font-semibold">{formatCurrency(valorWatch)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parcelas:</span>
                  <span>{parcelasWatch}x de {formatCurrency(valorParcela)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencimento:</span>
                  <span>Todo dia {diaVencimentoWatch}</span>
                </div>
              </div>

              {parcelasWatch > 24 && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Muitas parcelas podem dificultar o controle financeiro
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-4">Previsão de Parcelas</h3>
              <div className="space-y-2">
                {previewParcelas.map((parcela) => (
                  <div key={parcela.numero} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {parcela.numero}ª - {parcela.vencimento}
                    </span>
                    <span className="font-medium">{formatCurrency(parcela.valor)}</span>
                  </div>
                ))}
                {parcelasWatch > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    ... e mais {parcelasWatch - 5} parcelas
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="submit">Criar Contrato</Button>
        </div>
      </form>
    </Form>
  );
}
