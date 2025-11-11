import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Contato {
  id: string;
  user_id: string;
  telefone: string;
  nome?: string | null;
  data_hora: string;
  origem: string;
  converteu_lead: boolean;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContatoData {
  telefone: string;
  nome?: string;
  data_hora: string;
  origem: string;
}

export function useContatos() {
  const { toast } = useToast();
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
      toast({
        title: "Contato registrado",
        description: "O contato foi registrado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar contato",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Contato atualizado",
        description: "O contato foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar contato",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Erro ao converter contato",
        description: error.message,
        variant: "destructive",
      });
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
  };
}
