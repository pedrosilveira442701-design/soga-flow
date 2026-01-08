import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Meta } from "@/hooks/useMetas";
import { DollarSign, Hash, Percent, Calendar } from "lucide-react";

const formSchema = z.object({
  tipo: z.string().min(1, "Selecione um tipo de meta"),
  valor_alvo: z.coerce.number().positive("O valor deve ser maior que zero"),
  periodo_inicio: z.string().min(1, "Selecione a data de início"),
  periodo_fim: z.string().min(1, "Selecione a data de fim"),
  responsavel: z.string().optional(),
  observacoes: z.string().optional(),
}).refine(
  (data) => new Date(data.periodo_fim) > new Date(data.periodo_inicio),
  {
    message: "A data de fim deve ser posterior à data de início",
    path: ["periodo_fim"],
  }
);

type FormData = z.infer<typeof formSchema>;

interface MetaFormProps {
  meta?: Meta;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}

const TIPOS_META = [
  { value: "Vendas (R$)", label: "Vendas (R$)", icon: DollarSign, description: "Meta de faturamento (contratos)" },
  { value: "Propostas (R$)", label: "Propostas (R$)", icon: DollarSign, description: "Valor total de propostas" },
  { value: "Propostas (#)", label: "Propostas (#)", icon: Hash, description: "Quantidade de propostas" },
  { value: "Conversão (%)", label: "Conversão (%)", icon: Percent, description: "Taxa de conversão" },
  { value: "Contratos (#)", label: "Contratos (#)", icon: Hash, description: "Quantidade de contratos" },
  { value: "Novos Clientes (#)", label: "Novos Clientes (#)", icon: Hash, description: "Novos clientes captados" },
];

export function MetaForm({ meta, onSubmit, onCancel }: MetaFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: meta?.tipo || "",
      valor_alvo: meta?.valor_alvo || 0,
      periodo_inicio: meta?.periodo_inicio || "",
      periodo_fim: meta?.periodo_fim || "",
      responsavel: meta?.responsavel || "",
      observacoes: "",
    },
  });

  const tipoSelecionado = form.watch("tipo");
  const tipoInfo = TIPOS_META.find(t => t.value === tipoSelecionado);

  const handleSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      progresso: meta?.progresso || 0,
      status: meta?.status || "ativa",
    } as any);
  };

  // Sugestões rápidas de período
  const setPeriodo = (tipo: 'mes' | 'trimestre' | 'ano') => {
    const hoje = new Date();
    const inicio = new Date();
    let fim = new Date();

    switch (tipo) {
      case 'mes':
        inicio.setDate(1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        break;
      case 'trimestre':
        const mesAtual = hoje.getMonth();
        const inicioTrimestre = Math.floor(mesAtual / 3) * 3;
        inicio.setMonth(inicioTrimestre);
        inicio.setDate(1);
        fim = new Date(hoje.getFullYear(), inicioTrimestre + 3, 0);
        break;
      case 'ano':
        inicio.setMonth(0);
        inicio.setDate(1);
        fim = new Date(hoje.getFullYear(), 11, 31);
        break;
    }

    form.setValue('periodo_inicio', inicio.toISOString().split('T')[0]);
    form.setValue('periodo_fim', fim.toISOString().split('T')[0]);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Meta</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de meta" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TIPOS_META.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      <div className="flex items-center gap-2">
                        <tipo.icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{tipo.label}</div>
                          <div className="text-xs text-muted-foreground">{tipo.description}</div>
                        </div>
                      </div>
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
          name="valor_alvo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor Alvo</FormLabel>
              <FormControl>
                <div className="relative">
                  {tipoInfo && (
                    <tipoInfo.icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  )}
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Digite o valor da meta"
                    className={tipoInfo ? "pl-9" : ""}
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription>
                {tipoSelecionado.includes("R$") && "Valor em reais"}
                {tipoSelecionado.includes("#") && "Quantidade"}
                {tipoSelecionado.includes("%") && "Porcentagem (ex: 35 para 35%)"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Período</span>
          </div>
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setPeriodo('mes')}>
              Este Mês
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setPeriodo('trimestre')}>
              Este Trimestre
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setPeriodo('ano')}>
              Este Ano
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="periodo_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Início</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="periodo_fim"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Fim</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="responsavel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsável (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Nome do responsável" {...field} />
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
              <FormLabel>Observações (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detalhes adicionais sobre esta meta..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1">
            {meta ? "Atualizar Meta" : "Criar Meta"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
