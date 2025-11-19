import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, MapPin, Phone, User } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { Visita } from '@/hooks/useVisitas';
import { useEffect } from 'react';
import ClienteCombobox from '@/components/forms/ClienteCombobox';

const visitaFormSchema = z.object({
  cliente_id: z.string().uuid('Selecione um cliente válido'),
  marcacao_tipo: z.string().min(1, 'Tipo de visita é obrigatório'),
  assunto: z.string().min(3, 'Mínimo 3 caracteres').max(200, 'Máximo 200 caracteres'),
  data: z.string().nullable(),
  hora: z.string().nullable(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  responsavel: z.string().optional(),
  observacao: z.string().max(500, 'Máximo 500 caracteres').optional(),
  realizada: z.boolean().default(false),
});

type VisitaFormData = z.infer<typeof visitaFormSchema>;

const TIPOS_VISITA = [
  { value: 'medicao', label: 'Medição', icon: '📏' },
  { value: 'instalacao', label: 'Instalação', icon: '🔨' },
  { value: 'followup', label: 'Follow-up', icon: '📞' },
  { value: 'orcamento', label: 'Orçamento', icon: '💰' },
  { value: 'manutencao', label: 'Manutenção', icon: '🛠️' },
  { value: 'reuniao', label: 'Reunião', icon: '🤝' },
  { value: 'outro', label: 'Outro', icon: '📋' },
];

interface VisitaFormProps {
  visita?: Visita;
  onSubmit: (data: VisitaFormData) => void;
  isLoading?: boolean;
}

export function VisitaForm({ visita, onSubmit, isLoading }: VisitaFormProps) {
  const { clientes } = useClientes();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VisitaFormData>({
    resolver: zodResolver(visitaFormSchema),
    defaultValues: visita
      ? {
          cliente_id: visita.cliente_id,
          marcacao_tipo: visita.marcacao_tipo,
          assunto: visita.assunto,
          data: visita.data,
          hora: visita.hora,
          endereco: visita.endereco || '',
          telefone: visita.telefone || '',
          responsavel: visita.responsavel || '',
          observacao: visita.observacao || '',
          realizada: visita.realizada,
        }
      : {
          realizada: false,
        },
  });

  const clienteId = watch('cliente_id');
  const selectedCliente = clientes?.find((c) => c.id === clienteId);

  // Pre-fill endereço e telefone ao selecionar cliente
  useEffect(() => {
    if (selectedCliente && !visita) {
      if (selectedCliente.endereco) {
        setValue('endereco', selectedCliente.endereco);
      }
      if (selectedCliente.telefone) {
        setValue('telefone', selectedCliente.telefone);
      }
    }
  }, [selectedCliente, setValue, visita]);

  const preencherEndecoCliente = () => {
    if (selectedCliente?.endereco) {
      setValue('endereco', selectedCliente.endereco);
    }
  };

  const setDataRapida = (dias: number) => {
    const data = new Date();
    data.setDate(data.getDate() + dias);
    setValue('data', data.toISOString().split('T')[0]);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Cliente */}
      <div className="space-y-2">
        <Label>Cliente *</Label>
        <ClienteCombobox
          clientes={clientes || []}
          value={watch('cliente_id') || ''}
          onChange={(value) => setValue('cliente_id', value)}
        />
        {errors.cliente_id && (
          <p className="text-sm text-destructive">{errors.cliente_id.message}</p>
        )}
      </div>

      {/* Tipo de Visita */}
      <div className="space-y-2">
        <Label>Tipo de Visita *</Label>
        <Select
          value={watch('marcacao_tipo') || ''}
          onValueChange={(value) => setValue('marcacao_tipo', value)}
        >
          <SelectTrigger className={errors.marcacao_tipo ? 'border-destructive' : ''}>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_VISITA.map((tipo) => (
              <SelectItem key={tipo.value} value={tipo.value}>
                <span>
                  {tipo.icon} {tipo.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.marcacao_tipo && (
          <p className="text-sm text-destructive">{errors.marcacao_tipo.message}</p>
        )}
      </div>

      {/* Assunto */}
      <div className="space-y-2">
        <Label>Assunto *</Label>
        <Input
          {...register('assunto')}
          placeholder="Ex: Medição para instalação de porcelanato"
          className={errors.assunto ? 'border-destructive' : ''}
        />
        {errors.assunto && (
          <p className="text-sm text-destructive">{errors.assunto.message}</p>
        )}
      </div>

      {/* Data e Hora */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Data
          </Label>
          <Input type="date" {...register('data')} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDataRapida(0)}
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDataRapida(1)}
            >
              Amanhã
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Hora
          </Label>
          <Input type="time" {...register('hora')} />
        </div>
      </div>

      {/* Endereço */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Endereço
          </Label>
          {selectedCliente?.endereco && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={preencherEndecoCliente}
            >
              Usar endereço do cliente
            </Button>
          )}
        </div>
        <Textarea {...register('endereco')} rows={2} placeholder="Rua, número, bairro..." />
      </div>

      {/* Telefone */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Telefone
        </Label>
        <Input {...register('telefone')} placeholder="(00) 00000-0000" />
      </div>

      {/* Responsável */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Responsável
        </Label>
        <Input {...register('responsavel')} placeholder="Nome do responsável" />
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          {...register('observacao')}
          rows={3}
          placeholder="Detalhes adicionais, materiais necessários, etc"
        />
        {errors.observacao && (
          <p className="text-sm text-destructive">{errors.observacao.message}</p>
        )}
      </div>

      {/* Realizada (apenas em modo edit) */}
      {visita && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="realizada"
            checked={watch('realizada')}
            onCheckedChange={(checked) => setValue('realizada', checked as boolean)}
          />
          <Label htmlFor="realizada" className="cursor-pointer">
            Marcar como realizada
          </Label>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : visita ? 'Atualizar Visita' : 'Agendar Visita'}
        </Button>
      </div>
    </form>
  );
}
