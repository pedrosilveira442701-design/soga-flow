import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ORIGENS = [
  "Instagram",
  "Facebook",
  "Google",
  "Indicação",
  "Site",
  "WhatsApp",
  "Telefone",
  "Orgânico",
  "Outro",
];

const contatoSchema = z.object({
  telefone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  nome: z.string().trim().max(100, "Nome deve ter no máximo 100 caracteres").optional(),
  data: z.date(),
  hora: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  origem: z.string().min(1, "Selecione a origem do contato"),
  gerouLead: z.boolean().default(false),
});

type ContatoFormValues = z.infer<typeof contatoSchema>;

interface ContatoQuickFormProps {
  onSubmit: (data: ContatoFormValues) => void;
  onOpenLeadForm: (telefone: string, origem: string) => void;
  isLoading?: boolean;
}

export function ContatoQuickForm({ onSubmit, onOpenLeadForm, isLoading }: ContatoQuickFormProps) {
  const [showLeadCheckbox, setShowLeadCheckbox] = useState(false);

  const form = useForm<ContatoFormValues>({
    resolver: zodResolver(contatoSchema),
    defaultValues: {
      telefone: "",
      nome: "",
      data: new Date(),
      hora: format(new Date(), "HH:mm"),
      origem: "",
      gerouLead: false,
    },
  });

  const handleSubmit = (data: ContatoFormValues) => {
    if (data.gerouLead) {
      // Se marcou que gerou lead, abre o formulário completo
      onOpenLeadForm(data.telefone, data.origem);
    } else {
      // Se não gerou lead, apenas registra o contato
      onSubmit(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone *</FormLabel>
              <FormControl>
                <Input
                  placeholder="(00) 00000-0000"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    setShowLeadCheckbox(true);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input
                  placeholder="Nome do contato (opcional)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="data"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data *</FormLabel>
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
                          <span>Selecione</span>
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
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hora"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type="time" {...field} />
                    <Clock className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="origem"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Origem *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
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

        {showLeadCheckbox && (
          <FormField
            control={form.control}
            name="gerouLead"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4 bg-muted/50">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-medium">
                    Gerou lead?
                  </FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Marque se este contato se qualificou como um lead
                  </p>
                </div>
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {form.watch("gerouLead") ? "Continuar para Lead" : "Registrar Contato"}
        </Button>
      </form>
    </Form>
  );
}
