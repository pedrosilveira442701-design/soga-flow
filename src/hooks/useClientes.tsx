import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface Cliente {
  id: string;
  user_id: string;
  nome: string;
  contato: string | null;
  telefone: string | null;
  cpf_cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  bairro: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  propostas?: { count: number }[];
  leads?: { count: number }[];
}

export interface CreateClienteData {
  nome: string;
  contato?: string;
  telefone?: string;
  cpf_cnpj?: string;
  endereco?: string;
  cidade?: string;
  bairro?: string;
  status?: string;
}

export interface UpdateClienteData extends CreateClienteData {
  id: string;
}

export function useClientes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all clientes
  const { data: clientes, isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("clientes")
        .select(`
          *,
          propostas(count),
          leads(count)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Cliente[];
    },
    enabled: !!user,
  });

  // Create cliente mutation
  const createCliente = useMutation({
    mutationFn: async (data: CreateClienteData) => {
      if (!user) throw new Error("User not authenticated");

      const { data: cliente, error } = await supabase
        .from("clientes")
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({
        title: "Cliente criado",
        description: "Cliente cadastrado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update cliente mutation
  const updateCliente = useMutation({
    mutationFn: async ({ id, ...data }: UpdateClienteData) => {
      const { data: cliente, error } = await supabase
        .from("clientes")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({
        title: "Cliente atualizado",
        description: "Cliente atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete cliente mutation
  const deleteCliente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({
        title: "Cliente excluído",
        description: "Cliente excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    clientes,
    isLoading,
    createCliente,
    updateCliente,
    deleteCliente,
  };
}
