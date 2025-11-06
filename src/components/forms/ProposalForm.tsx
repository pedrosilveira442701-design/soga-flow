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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useClientes } from "@/hooks/useClientes";

const TIPOS_PRODUTO = [
  "Pintura Epóxi",
  "Pintura PU",
  "Pintura PU Quadra",
  "Pintura Acrílica",
  "Pintura Acrílica Quadra",
  "Pintura de Parede",
  "Outro",
] as const;

const proposalSchema = z.object({
  cliente_id: z.string().min(1, "Cliente é obrigatório"),
  m2: z.number().positive("Área deve ser maior que zero"),
  valor_m2: z.number().positive("Preço deve ser maior que zero"),
  custo_m2: z.number().positive("Custo deve ser maior que zero"),
  tipo_piso: z.string().min(1, "Tipo de serviço é obrigatório"),
  tipo_piso_outro: z.string().optional(),
  data: z.string().optional(),
  status: z.string().optional(),
}).refine(
  (data) => {
    if (data.tipo_piso === "Outro") {
      return data.tipo_piso_outro && data.tipo_piso_outro.trim().length > 0;
    }
    return true;
  },
  {
    message: "Descreva o tipo de serviço",
    path: ["tipo_piso_outro"],
  },
);

type ProposalFormValues = z.infer<typeof proposalSchema>;

interface ProposalFormProps {
  onSubmit: (data: ProposalFormValues) => void;
  initialData?: Partial<ProposalFormValues>;
}

export default function ProposalForm({
  onSubmit,
  initialData,
}: ProposalFormProps) {
  const { clientes = [], isLoading: isLoadingClientes } = useClientes();
  
  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      cliente_id: initialData?.cliente_id || "",
      m2: initialData?.m2 || 0,
      valor_m2: initialData?.valor_m2 || 0,
      custo_m2: initialData?.custo_m2 || 0,
      tipo_piso: initialData?.tipo_piso || "",
      tipo_piso_outro: initialData?.tipo_piso_outro || "",
      data: initialData?.data || new Date().toISOString().split('T')[0],
      status: initialData?.status || "aberta",
    },
  });

  const m2 = form.watch("m2");
  const valor_m2 = form.watch("valor_m2");
  const custo_m2 = form.watch("custo_m2");

  const totalBruto = m2 * valor_m2;
  const totalCusto = m2 * custo_m2;
  const valorLiquido = totalBruto - totalCusto;
  const margem = totalBruto > 0 ? (valorLiquido / totalBruto) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const selectedCliente = clientes?.find(c => c.id === form.watch("cliente_id"));
  const tipoServicoSelecionado = form.watch("tipo_piso");

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

            <FormField
              control={form.control}
              name="tipo_piso"
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

            {tipoServicoSelecionado === "Outro" && (
              <FormField
                control={form.control}
                name="tipo_piso_outro"
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

            <FormField
              control={form.control}
              name="m2"
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
              name="valor_m2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço por m² (R$) *</FormLabel>
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
              name="custo_m2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custo por m² (R$) *</FormLabel>
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
