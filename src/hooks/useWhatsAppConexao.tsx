import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppConexao {
  id: string;
  instancia: string;
  status: "desconectado" | "conectando" | "conectado";
  numero?: string | null;
  backfill_done: boolean;
  last_event_at?: string | null;
}

// Estado da conexão Evolation/WhatsApp para o indicador no topo da fila.
export function useWhatsAppConexao() {
  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-conexao"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("whatsapp_conexao")
        .select("*")
        .eq("user_id", user.id)
        .order("last_event_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Tabela pode ainda não existir antes do deploy da migration: trata como desconectado.
      if (error) return null;
      return (data as unknown as WhatsAppConexao) ?? null;
    },
    refetchInterval: 30_000,
  });

  return {
    conexao: data ?? null,
    isLoading,
    status: data?.status ?? "desconectado",
  };
}
