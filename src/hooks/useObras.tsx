import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ObraStatus = Database["public"]["Enums"]["obra_status"];

export interface Obra {
  id: string;
  user_id: string;
  contrato_id: string;
  started_at: string | null;
  completed_at: string | null;
  status: ObraStatus;
  progresso_pct: number;
  responsavel_obra: string | null;
  equipe: Array<{ nome: string; funcao: string }>;
  fotos: Array<{ url: string; tipo: string; timestamp: string }>;
  ocorrencias: Array<{ data: string; descricao: string; tipo: string }>;
  marcos: Array<{ data: string; descricao: string; concluido: boolean }>;
  termo_conclusao_url: string | null;
  created_at: string;
  updated_at: string;
  contratos?: {
    id: string;
    valor_negociado: number;
    data_inicio: string;
    clientes?: {
      nome: string;
      telefone?: string;
      endereco?: string;
    } | null;
  } | null;
}

export interface ObraInsert {
  contrato_id: string;
  responsavel_obra?: string;
  status?: ObraStatus;
}

export interface ObraUpdate {
  started_at?: string;
  completed_at?: string;
  status?: ObraStatus;
  progresso_pct?: number;
  responsavel_obra?: string;
  equipe?: Array<{ nome: string; funcao: string }>;
  fotos?: Array<{ url: string; tipo: string; timestamp: string }>;
  ocorrencias?: Array<{ data: string; descricao: string; tipo: string }>;
  marcos?: Array<{ data: string; descricao: string; concluido: boolean }>;
  termo_conclusao_url?: string;
}

export function useObras() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: obras = [], isLoading } = useQuery({
    queryKey: ["obras", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("obras")
        .select(`
          *,
          contratos (
            id,
            valor_negociado,
            data_inicio,
            clientes (
              nome,
              telefone,
              endereco
            )
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Obra[];
    },
    enabled: !!user,
  });

  const createObra = useMutation({
    mutationFn: async (obra: ObraInsert) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("obras")
        .insert({
          ...obra,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      toast.success("Obra criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar obra: " + error.message);
    },
  });

  const updateObra = useMutation({
    mutationFn: async ({ id, ...updates }: ObraUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("obras")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      toast.success("Obra atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar obra: " + error.message);
    },
  });

  const iniciarObra = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("obras")
        .update({
          started_at: new Date().toISOString(),
          status: "execucao" as ObraStatus,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Obra iniciada! Status atualizado para Em Execução.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao iniciar obra: " + error.message);
    },
  });

  const finalizarObra = useMutation({
    mutationFn: async ({ id, termo_url }: { id: string; termo_url?: string }) => {
      const { data, error } = await supabase
        .from("obras")
        .update({
          completed_at: new Date().toISOString(),
          status: "concluida" as ObraStatus,
          progresso_pct: 100,
          ...(termo_url && { termo_conclusao_url: termo_url }),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Obra finalizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao finalizar obra: " + error.message);
    },
  });

  const adicionarOcorrencia = useMutation({
    mutationFn: async ({
      id,
      ocorrencia,
    }: {
      id: string;
      ocorrencia: { data: string; descricao: string; tipo: string };
    }) => {
      // Buscar obra atual
      const { data: obra, error: fetchError } = await supabase
        .from("obras")
        .select("ocorrencias")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const ocorrenciasAtuais = (obra.ocorrencias as any[]) || [];

      const { data, error } = await supabase
        .from("obras")
        .update({
          ocorrencias: [...ocorrenciasAtuais, ocorrencia],
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      toast.success("Ocorrência registrada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao registrar ocorrência: " + error.message);
    },
  });

  const adicionarMarco = useMutation({
    mutationFn: async ({
      id,
      marco,
    }: {
      id: string;
      marco: { data: string; descricao: string; concluido: boolean };
    }) => {
      const { data: obra, error: fetchError } = await supabase
        .from("obras")
        .select("marcos")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const marcosAtuais = (obra.marcos as any[]) || [];

      const { data, error } = await supabase
        .from("obras")
        .update({
          marcos: [...marcosAtuais, marco],
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      toast.success("Marco adicionado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao adicionar marco: " + error.message);
    },
  });

  const deleteObra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("obras").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      toast.success("Obra excluída com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir obra: " + error.message);
    },
  });

  return {
    obras,
    isLoading,
    createObra: createObra.mutate,
    updateObra: updateObra.mutate,
    iniciarObra: iniciarObra.mutate,
    finalizarObra: finalizarObra.mutate,
    adicionarOcorrencia: adicionarOcorrencia.mutate,
    adicionarMarco: adicionarMarco.mutate,
    deleteObra: deleteObra.mutate,
  };
}
