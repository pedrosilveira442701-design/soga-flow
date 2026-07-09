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

// Sem evento do Evolution há mais de 24h, o "conectado" da tabela não é
// confiável (o webhook só grava em CONNECTION_UPDATE; se o Evolution cair
// sem emitir o evento, o status congela).
const STALE_MS = 24 * 60 * 60 * 1000;

// Estado da conexão Evolution/WhatsApp para o indicador no topo da fila.
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

      if (error) {
        console.error("whatsapp_conexao:", error.message);
        return null;
      }
      return (data as WhatsAppConexao | null) ?? null;
    },
    refetchInterval: 30_000,
  });

  const lastEventMs = data?.last_event_at ? new Date(data.last_event_at).getTime() : 0;
  const isStale = data?.status === "conectado" && lastEventMs > 0 && Date.now() - lastEventMs > STALE_MS;

  return {
    conexao: data ?? null,
    isLoading,
    status: data?.status ?? "desconectado",
    /** true quando o "conectado" pode estar desatualizado (sem eventos há 24h+) */
    isStale,
    lastEventAt: data?.last_event_at ?? null,
  };
}
