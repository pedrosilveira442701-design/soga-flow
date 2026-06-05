import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Contato } from "@/hooks/useContatos";

// Contato vindo do WhatsApp com os campos de triagem (Fase 1).
export interface WhatsAppContato extends Contato {
  triagem_status: "pendente" | "potencial" | "ruido";
  triagem_motivo?: string | null;
  canal_detectado?: string | null;
  texto_conversa?: string | null;
  whatsapp_jid?: string | null;
}

export type TriagemStatus = "pendente" | "potencial" | "ruido";

export function useWhatsAppTriagem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contatos, isLoading } = useQuery({
    queryKey: ["whatsapp-triagem"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contatos")
        .select("*")
        .eq("user_id", user.id)
        .eq("origem", "whatsapp")
        .eq("converteu_lead", false)
        .order("data_hora", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as WhatsAppContato[];
    },
    // Atualiza sozinho enquanto a fila está aberta (novos leads chegam do webhook).
    refetchInterval: 30_000,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TriagemStatus }) => {
      const { error } = await supabase
        .from("contatos")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ triagem_status: status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-triagem"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar triagem",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const descartar = (id: string) =>
    setStatus.mutateAsync({ id, status: "ruido" }).then(() =>
      toast({ title: "Contato descartado", description: "Movido para Ruído." })
    );

  const restaurar = (id: string) =>
    setStatus.mutateAsync({ id, status: "potencial" }).then(() =>
      toast({ title: "Contato restaurado", description: "Movido para Potenciais." })
    );

  const lista = contatos ?? [];
  const potenciais = lista.filter((c) => c.triagem_status === "potencial");
  const pendentes = lista.filter((c) => c.triagem_status === "pendente");
  const ruido = lista.filter((c) => c.triagem_status === "ruido");

  return {
    isLoading,
    potenciais,
    pendentes,
    ruido,
    descartar,
    restaurar,
    isMutating: setStatus.isPending,
  };
}
