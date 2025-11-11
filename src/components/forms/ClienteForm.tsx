import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Cliente } from "@/hooks/useClientes";
import { cn } from "@/lib/utils";

const ESTADOS_BR = [
  { uf: "AC", nome: "Acre" },
  { uf: "AL", nome: "Alagoas" },
  { uf: "AP", nome: "Amapá" },
  { uf: "AM", nome: "Amazonas" },
  { uf: "BA", nome: "Bahia" },
  { uf: "CE", nome: "Ceará" },
  { uf: "DF", nome: "Distrito Federal" },
  { uf: "ES", nome: "Espírito Santo" },
  { uf: "GO", nome: "Goiás" },
  { uf: "MA", nome: "Maranhão" },
  { uf: "MT", nome: "Mato Grosso" },
  { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" },
  { uf: "PA", nome: "Pará" },
  { uf: "PB", nome: "Paraíba" },
  { uf: "PR", nome: "Paraná" },
  { uf: "PE", nome: "Pernambuco" },
  { uf: "PI", nome: "Piauí" },
  { uf: "RJ", nome: "Rio de Janeiro" },
  { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", nome: "Rondônia" },
  { uf: "RR", nome: "Roraima" },
  { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" },
  { uf: "SE", nome: "Sergipe" },
  { uf: "TO", nome: "Tocantins" },
];

const clienteFormSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  contato: z.string().optional(),
  telefone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        const cleaned = val.replace(/\D/g, "");
        return cleaned.length === 10 || cleaned.length === 11;
      },
      { message: "Telefone deve ter 10 ou 11 dígitos" }
    ),
  cpf_cnpj: z.string().optional(),
  // Campos estruturados de endereço
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  pais: z.string().optional(),
  // Campo legado concatenado para compatibilidade
  endereco: z.string().optional(),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
  created_at: z.date().optional(),
});

type ClienteFormValues = z.infer<typeof clienteFormSchema>;

interface ClienteFormProps {
  initialData?: Cliente;
  onSubmit: (data: ClienteFormValues) => void;
  isLoading?: boolean;
  mode?: "create" | "edit";
  onCancel?: () => void;
}

export function ClienteForm({
  initialData,
  onSubmit,
  isLoading,
  mode = "create",
  onCancel,
}: ClienteFormProps) {
  const { toast } = useToast();
  const [loadingCep, setLoadingCep] = useState(false);

  // Parse endereço legado para campos estruturados
  const parseEndereco = (endereco?: string | null) => {
    if (!endereco) return {};
    // Tentar extrair informações básicas do endereço legado
    return {
      endereco: endereco,
    };
  };

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: initialData
      ? {
          nome: initialData.nome,
          contato: initialData.contato || "",
          telefone: initialData.telefone || "",
          cpf_cnpj: initialData.cpf_cnpj || "",
          cep: initialData.cep || "",
          logradouro: initialData.logradouro || "",
          numero: initialData.numero || "",
          complemento: initialData.complemento || "",
          bairro: initialData.bairro || "",
          cidade: initialData.cidade || "",
          uf: initialData.uf || "",
          pais: initialData.pais || "Brasil",
          endereco: initialData.endereco || "",
          status: (initialData.status as "ativo" | "inativo") || "ativo",
        }
      : {
          nome: "",
          contato: "",
          telefone: "",
          cpf_cnpj: "",
          cep: "",
          logradouro: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          uf: "",
          pais: "Brasil",
          endereco: "",
          status: "ativo",
          created_at: new Date(),
        },
  });

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    const match2 = cleaned.match(/^(\d{2})(\d{4})(\d{4})$/);
    if (match2) {
      return `(${match[1]}) ${match2[2]}-${match2[3]}`;
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (...event: any[]) => void) => {
    const value = e.target.value;
    const cleaned = value.replace(/\D/g, "");
    
    if (cleaned.length <= 11) {
      let formatted = "";
      if (cleaned.length > 0) {
        formatted = `(${cleaned.substring(0, 2)}`;
        if (cleaned.length > 2) {
          formatted += `) ${cleaned.substring(2, 7)}`;
          if (cleaned.length > 7) {
            formatted += `-${cleaned.substring(7, 11)}`;
          }
        }
      }
      onChange(formatted || "");
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (...event: any[]) => void) => {
    const value = e.target.value;
    const cleaned = value.replace(/\D/g, "");
    
    if (cleaned.length <= 8) {
      let formatted = cleaned;
      if (cleaned.length > 5) {
        formatted = `${cleaned.substring(0, 5)}-${cleaned.substring(5, 8)}`;
      }
      onChange(formatted);
    }
  };

  const buscarCep = async () => {
    const cep = form.getValues("cep")?.replace(/\D/g, "");
    
    if (!cep || cep.length !== 8) {
      toast({
        title: "CEP inválido",
        description: "Por favor, digite um CEP válido com 8 dígitos",
        variant: "destructive",
      });
      return;
    }

    setLoadingCep(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "O CEP informado não foi encontrado",
          variant: "destructive",
        });
        return;
      }

      // Preencher campos automaticamente
      form.setValue("logradouro", data.logradouro || "");
      form.setValue("bairro", data.bairro || "");
      form.setValue("cidade", data.localidade || "");
      form.setValue("uf", data.uf || "");
      
      toast({
        title: "CEP encontrado",
        description: "Endereço preenchido automaticamente",
      });

      // Focar no campo número
      setTimeout(() => {
        document.getElementById("numero")?.focus();
      }, 100);
      
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível buscar o CEP. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingCep(false);
    }
  };

  // Função para formatar endereço completo
  const formatarEnderecoCompleto = (values: ClienteFormValues) => {
    const partes = [];
    
    if (values.logradouro) partes.push(values.logradouro);
    if (values.numero) partes.push(values.numero);
    if (values.complemento) partes.push(values.complemento);
    if (values.bairro) partes.push(values.bairro);
    if (values.cidade && values.uf) {
      partes.push(`${values.cidade}/${values.uf}`);
    } else if (values.cidade) {
      partes.push(values.cidade);
    }
    if (values.cep) partes.push(`CEP: ${values.cep}`);
    
    return partes.join(", ");
  };

  const handleSubmit = (data: ClienteFormValues) => {
    // Formatar endereço completo para o campo legado
    const enderecoCompleto = formatarEnderecoCompleto(data);
    onSubmit({
      ...data,
      endereco: enderecoCompleto,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome *</FormLabel>
              <FormControl>
                <Input placeholder="Nome do cliente" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contato"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contato</FormLabel>
              <FormControl>
                <Input placeholder="Nome da pessoa de contato" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input
                  placeholder="(11) 98765-4321"
                  type="tel"
                  value={field.value}
                  onChange={(e) => handlePhoneChange(e, field.onChange)}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cpf_cnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF/CNPJ</FormLabel>
              <FormControl>
                <Input placeholder="000.000.000-00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CEP com busca automática */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
          <FormField
            control={form.control}
            name="cep"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CEP *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="00000-000"
                    maxLength={9}
                    value={field.value}
                    onChange={(e) => handleCepChange(e, field.onChange)}
                    onBlur={field.onBlur}
                    name={field.name}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={buscarCep}
              disabled={loadingCep}
              className="w-full md:w-auto"
            >
              <Search className="h-4 w-4 mr-2" />
              {loadingCep ? "Buscando..." : "Buscar CEP"}
            </Button>
          </div>
        </div>

        {/* Logradouro e Número */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
          <FormField
            control={form.control}
            name="logradouro"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logradouro *</FormLabel>
                <FormControl>
                  <Input placeholder="Rua, Avenida, Alameda..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="numero"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número *</FormLabel>
                <FormControl>
                  <Input
                    id="numero"
                    placeholder="123 ou s/n"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Complemento */}
        <FormField
          control={form.control}
          name="complemento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Complemento</FormLabel>
              <FormControl>
                <Input placeholder="Apto, Bloco, Sala..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Bairro e Cidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="bairro"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bairro *</FormLabel>
                <FormControl>
                  <Input placeholder="Centro" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade *</FormLabel>
                <FormControl>
                  <Input placeholder="São Paulo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Estado e País */}
        <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-4">
          <FormField
            control={form.control}
            name="uf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UF *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[200px]">
                    {ESTADOS_BR.map((estado) => (
                      <SelectItem key={estado.uf} value={estado.uf}>
                        {estado.uf}
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
            name="pais"
            render={({ field }) => (
              <FormItem>
                <FormLabel>País</FormLabel>
                <FormControl>
                  <Input placeholder="Brasil" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
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
                <FormLabel>Data de Cadastro</FormLabel>
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
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione a data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("2020-01-01")
                      }
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

        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Voltar
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? "Salvando..."
              : mode === "edit"
              ? "Atualizar Cliente"
              : "Criar Cliente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
