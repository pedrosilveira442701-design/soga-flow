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
  prioridade?: "alta" | "media" | "baixa" | null;
  proximo_passo?: string | null;
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
        .is("deleted_at", null)
        .order("data_hora", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as WhatsAppContato[];
    },
    // Atualiza sozinho (novos leads chegam do webhook em tempo real).
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
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

  const LABEL: Record<TriagemStatus, string> = { potencial: "Potencial", pendente: "A revisar", ruido: "Ruído" };
  const mover = (id: string, status: TriagemStatus) =>
    setStatus.mutateAsync({ id, status }).then(() =>
      toast({ title: "Movido", description: `Para ${LABEL[status]}.` })
    );
  const descartar = (id: string) => mover(id, "ruido");
  const restaurar = (id: string) => mover(id, "potencial");

  const lista = contatos ?? [];
  const potenciais = lista.filter((c) => c.triagem_status === "potencial");
  const pendentes = lista.filter((c) => c.triagem_status === "pendente");
  const ruido = lista.filter((c) => c.triagem_status === "ruido");

  return {
    isLoading,
    lista,
    potenciais,
    pendentes,
    ruido,
    mover,
    descartar,
    restaurar,
    isMutating: setStatus.isPending,
  };
}
