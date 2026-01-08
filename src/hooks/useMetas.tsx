import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Meta {
  id: string;
  user_id: string;
  tipo: string;
  valor_alvo: number;
  periodo_inicio: string;
  periodo_fim: string;
  progresso: number;
  responsavel: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MetaFilters {
  search?: string;
  status?: string;
  tipo?: string;
  responsavel?: string;
  periodo?: 'mes' | 'trimestre' | 'ano' | 'custom';
  dataInicio?: string;
  dataFim?: string;
}

export interface MetaKPIs {
  totalMetas: number;
  metasAtivas: number;
  metasConcluidas: number;
  metasCanceladas: number;
  performanceGeral: number;
  metasNoAlvo: number;
  metasEmAlerta: number;
  metasAtrasadas: number;
}

export interface MetaComInsights extends Meta {
  tempoDecorrido: number; // porcentagem
  progressoEsperado: number; // porcentagem baseada no tempo
  situacao: 'acima' | 'no_ritmo' | 'atrasado' | 'concluido' | 'cancelado';
  diasRestantes: number;
  alertas: string[];
}

export const useMetas = (filters?: MetaFilters) => {
  const queryClient = useQueryClient();

  // Função para calcular progresso real (movida para fora da query para reutilização)
  const calcularProgressoReal = async (meta: Meta): Promise<number> => {
    const { user_id, tipo, periodo_inicio, periodo_fim } = meta;
    
    try {
      switch (tipo.toLowerCase()) {
        case 'vendas':
        case 'vendas (r$)': {
          const { data: contratos } = await supabase
            .from('contratos')
            .select('valor_negociado')
            .eq('user_id', user_id)
            .gte('data_inicio', periodo_inicio)
            .lte('data_inicio', periodo_fim)
            .in('status', ['ativo', 'concluido']);
          
          const total = contratos?.reduce((sum, c) => sum + Number(c.valor_negociado || 0), 0) || 0;
          return Math.min((total / meta.valor_alvo) * 100, 999);
        }

        case 'propostas (r$)': {
          // Soma o valor total de todas as propostas no período
          const { data: propostas } = await supabase
            .from('propostas')
            .select('valor_total')
            .eq('user_id', user_id)
            .gte('created_at', periodo_inicio)
            .lte('created_at', periodo_fim);
          
          const total = propostas?.reduce((sum, p) => sum + Number(p.valor_total || 0), 0) || 0;
          return Math.min((total / meta.valor_alvo) * 100, 999);
        }

        case 'propostas':
        case 'propostas (#)': {
          const { count } = await supabase
            .from('propostas')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .gte('created_at', periodo_inicio)
            .lte('created_at', periodo_fim);
          
          return Math.min(((count || 0) / meta.valor_alvo) * 100, 999);
        }

        case 'conversão':
        case 'conversão (%)': {
          const { count: totalPropostas } = await supabase
            .from('propostas')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .gte('created_at', periodo_inicio)
            .lte('created_at', periodo_fim);

          const { count: totalContratos } = await supabase
            .from('contratos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .gte('data_inicio', periodo_inicio)
            .lte('data_inicio', periodo_fim);
          
          if (!totalPropostas) return 0;
          const taxaConversao = ((totalContratos || 0) / totalPropostas) * 100;
          return Math.min((taxaConversao / meta.valor_alvo) * 100, 999);
        }

        case 'contratos':
        case 'contratos (#)': {
          const { count } = await supabase
            .from('contratos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .gte('data_inicio', periodo_inicio)
            .lte('data_inicio', periodo_fim);
          
          return Math.min(((count || 0) / meta.valor_alvo) * 100, 999);
        }

        case 'novos clientes':
        case 'novos clientes (#)': {
          const { count } = await supabase
            .from('clientes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .gte('created_at', periodo_inicio)
            .lte('created_at', periodo_fim);
          
          return Math.min(((count || 0) / meta.valor_alvo) * 100, 999);
        }

        default:
          return meta.progresso;
      }
    } catch (error) {
      console.error('Erro ao calcular progresso:', error);
      return meta.progresso;
    }
  };

  // Query principal de metas com cálculo automático de progresso
  const { data: metas = [], isLoading } = useQuery({
    queryKey: ['metas', filters],
    queryFn: async () => {
      let query = supabase
        .from('metas')
        .select('*')
        .order('periodo_fim', { ascending: false });

      // Aplicar filtros
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.responsavel) {
        query = query.eq('responsavel', filters.responsavel);
      }

      // Filtro de período
      if (filters?.periodo) {
        const hoje = new Date();
        let dataInicio: Date;
        
        switch (filters.periodo) {
          case 'mes':
            dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            break;
          case 'trimestre':
            const mesAtual = hoje.getMonth();
            const inicioTrimestre = Math.floor(mesAtual / 3) * 3;
            dataInicio = new Date(hoje.getFullYear(), inicioTrimestre, 1);
            break;
          case 'ano':
            dataInicio = new Date(hoje.getFullYear(), 0, 1);
            break;
          default:
            dataInicio = hoje;
        }
        
        query = query.gte('periodo_inicio', dataInicio.toISOString().split('T')[0]);
      }

      if (filters?.dataInicio) {
        query = query.gte('periodo_inicio', filters.dataInicio);
      }
      if (filters?.dataFim) {
        query = query.lte('periodo_fim', filters.dataFim);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Calcular progresso real automaticamente para metas ativas
      const metasComProgresso = await Promise.all(
        (data as Meta[]).map(async (meta) => {
          if (meta.status === 'ativa') {
            const progressoReal = await calcularProgressoReal(meta);
            // Atualizar no banco se houver diferença significativa (>0.1%)
            if (Math.abs(progressoReal - meta.progresso) > 0.1) {
              await supabase
                .from('metas')
                .update({ 
                  progresso: progressoReal,
                  status: progressoReal >= 100 ? 'concluida' : 'ativa'
                })
                .eq('id', meta.id);
              return { ...meta, progresso: progressoReal, status: progressoReal >= 100 ? 'concluida' : meta.status };
            }
          }
          return meta;
        })
      );
      
      return metasComProgresso;
    },
    staleTime: 30000, // Cache por 30 segundos para evitar recálculos excessivos
  });


  // Enriquecer metas com insights
  const metasComInsights: MetaComInsights[] = metas.map((meta) => {
    const hoje = new Date();
    const inicio = new Date(meta.periodo_inicio);
    const fim = new Date(meta.periodo_fim);
    
    const totalDias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const diasDecorridos = Math.ceil((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const diasRestantes = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    const tempoDecorrido = Math.min(Math.max((diasDecorridos / totalDias) * 100, 0), 100);
    const progressoEsperado = tempoDecorrido;
    
    const progresso = meta.progresso;
    
    let situacao: MetaComInsights['situacao'];
    const alertas: string[] = [];
    
    if (meta.status === 'cancelada') {
      situacao = 'cancelado';
    } else if (meta.status === 'concluida' || progresso >= 100) {
      situacao = 'concluido';
    } else if (progresso >= progressoEsperado + 10) {
      situacao = 'acima';
    } else if (progresso >= progressoEsperado - 10) {
      situacao = 'no_ritmo';
    } else {
      situacao = 'atrasado';
      alertas.push('Atrás do planejado');
    }
    
    // Alertas adicionais
    if (progresso < 50 && tempoDecorrido > 50 && meta.status === 'ativa') {
      alertas.push('Meta em risco');
    }
    
    if (diasRestantes <= 7 && diasRestantes > 0 && meta.status === 'ativa') {
      alertas.push('Vencimento próximo');
    }
    
    if (diasRestantes < 0 && meta.status === 'ativa') {
      alertas.push('Meta vencida');
    }
    
    return {
      ...meta,
      tempoDecorrido,
      progressoEsperado,
      situacao,
      diasRestantes,
      alertas,
    };
  });

  // KPIs calculados
  const kpis: MetaKPIs = {
    totalMetas: metas.length,
    metasAtivas: metas.filter(m => m.status === 'ativa').length,
    metasConcluidas: metas.filter(m => m.status === 'concluida').length,
    metasCanceladas: metas.filter(m => m.status === 'cancelada').length,
    performanceGeral: metas.length > 0 
      ? metas.filter(m => m.status === 'ativa').reduce((sum, m) => sum + m.progresso, 0) / metas.filter(m => m.status === 'ativa').length 
      : 0,
    metasNoAlvo: metasComInsights.filter(m => m.progresso >= 100).length,
    metasEmAlerta: metasComInsights.filter(m => m.alertas.length > 0).length,
    metasAtrasadas: metasComInsights.filter(m => m.situacao === 'atrasado').length,
  };

  // Mutation: Criar meta
  const createMeta = useMutation({
    mutationFn: async (novaMeta: Omit<Meta, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('metas')
        .insert([{ ...novaMeta, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] });
      toast({ title: "Meta criada com sucesso!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao criar meta",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Mutation: Atualizar meta
  const updateMeta = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Meta> & { id: string }) => {
      const { data, error } = await supabase
        .from('metas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] });
      toast({ title: "Meta atualizada com sucesso!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao atualizar meta",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Mutation: Deletar meta (soft delete)
  const deleteMeta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('metas')
        .update({ status: 'cancelada' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] });
      toast({ title: "Meta cancelada com sucesso!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao cancelar meta",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Mutation: Recalcular progresso de uma meta
  const recalcularProgresso = useMutation({
    mutationFn: async (id: string) => {
      const meta = metas.find(m => m.id === id);
      if (!meta) throw new Error('Meta não encontrada');

      const novoProgresso = await calcularProgressoReal(meta);
      
      const { error } = await supabase
        .from('metas')
        .update({ 
          progresso: novoProgresso,
          status: novoProgresso >= 100 ? 'concluida' : meta.status
        })
        .eq('id', id);

      if (error) throw error;
      return novoProgresso;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] });
      toast({ title: "Progresso recalculado!" });
    },
  });

  // Mutation: Recalcular todas as metas ativas
  const recalcularTodas = useMutation({
    mutationFn: async () => {
      const metasAtivas = metas.filter(m => m.status === 'ativa');
      
      for (const meta of metasAtivas) {
        const novoProgresso = await calcularProgressoReal(meta);
        await supabase
          .from('metas')
          .update({ 
            progresso: novoProgresso,
            status: novoProgresso >= 100 ? 'concluida' : 'ativa'
          })
          .eq('id', meta.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] });
      toast({ title: "Todas as metas foram recalculadas!" });
    },
  });

  return {
    metas,
    metasComInsights,
    kpis,
    isLoading,
    createMeta,
    updateMeta,
    deleteMeta,
    recalcularProgresso,
    recalcularTodas,
  };
};
