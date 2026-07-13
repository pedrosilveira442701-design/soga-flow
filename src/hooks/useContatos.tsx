import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Contato {
  id: string;
  user_id: string;
  telefone: string;
  nome?: string | null;
  data_hora: string;
  origem: string;
  observacoes?: string | null;
  tag?: 'anuncio' | 'descoberta' | 'orcamento' | null;
  converteu_lead: boolean;
  lead_id: string | null;
  triagem_status?: 'pendente' | 'potencial' | 'ruido' | null;
  triagem_motivo?: string | null;
  prioridade?: 'alta' | 'media' | 'baixa' | null;
  proximo_passo?: string | null;
  canal_detectado?: string | null;
  // Triagem v2 (migration 20260709120000) — dados comerciais extraídos pela IA
  tipo_servico?: string | null;
  tipo_imovel?: 'garagem_residencial' | 'condominio' | 'comercial' | 'industrial' | 'outro' | null;
  local_obra?: string | null;
  metragem_m2?: number | null;
  urgencia?: 'imediata' | 'ate_30_dias' | 'sem_prazo' | null;
  etapa_negociacao?: string | null;
  telefone_alternativo?: string | null;
  texto_conversa?: string | null;
  whatsapp_jid?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContatoData {
  telefone: string;
  nome?: string;
  data_hora: string;
  origem: string;
  observacoes?: string;
  tag?: 'anuncio' | 'descoberta' | 'orcamento';
}

export function useContatos() {
  const queryClient = useQueryClient();

  const { data: contatos, isLoading } = useQuery({
    queryKey: ["contatos"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contatos")
        .select("*")
        .eq("user_id", user.id)
        .is("deleted_at", null) // esconde os soft-deletados (mas continuam contando no dashboard)
        .order("data_hora", { ascending: false });

      if (error) throw error;
      return data as Contato[];
    },
  });

  const createContato = useMutation({
    mutationFn: async (contatoData: CreateContatoData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contatos")
        .insert({
          ...contatoData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contatos"] });
      toast.success("Contato registrado", { description: "O contato foi registrado com sucesso." });
    },
    onError: (error) => {
      toast.error("Erro ao registrar contato", { description: error.message });
    },
  });

  const updateContato = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateContatoData> }) => {
      const { error } = await supabase
        .from("contatos")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contatos"] });
      toast.success("Contato atualizado", { description: "O contato foi atualizado com sucesso." });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar contato", { description: error.message });
    },
  });

  const convertToLead = useMutation({
    mutationFn: async ({ contatoId, leadId }: { contatoId: string; leadId: string }) => {
      const { error } = await supabase
        .from("contatos")
        .update({
          converteu_lead: true,
          lead_id: leadId,
        })
        .eq("id", contatoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contatos"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error) => {
      toast.error("Erro ao converter contato", { description: error.message });
    },
  });

  const deleteContato = useMutation({
    mutationFn: async (contatoId: string) => {
      // Soft-delete: some da tela mas o registro permanece (não derruba a contagem de leads).
      const { error } = await supabase
        .from("contatos")
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq("id", contatoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contatos"] });
      toast.success("Contato excluído", { description: "O contato foi excluído com sucesso." });
    },
    onError: (error) => {
      toast.error("Erro ao excluir contato", { description: error.message });
    },
  });

  const naoConvertidos = contatos?.filter(c => !c.converteu_lead) || [];

  return {
    contatos: contatos || [],
    naoConvertidos,
    isLoading,
    createContato,
    updateContato,
    convertToLead,
    deleteContato,
  };
}
