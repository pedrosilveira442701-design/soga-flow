import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { format, subDays, startOfDay } from "date-fns";

export interface GestaoContato {
  id: string;
  nome: string | null;
  telefone: string;
  data_hora: string;
  triagem_status: "pendente" | "potencial" | "ruido" | null;
  canal_detectado: string | null;
  triagem_motivo: string | null;
  texto_conversa: string | null;
  whatsapp_jid: string | null;
}

// Estatísticas e estratificação dos contatos do WhatsApp.
export function useWhatsAppGestao() {
  const { user } = useAuth();

  const { data: contatos = [], isLoading } = useQuery({
    queryKey: ["whatsapp-gestao", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contatos")
        .select("id, nome, telefone, data_hora, triagem_status, canal_detectado, triagem_motivo, texto_conversa, whatsapp_jid")
        .eq("user_id", user!.id)
        .eq("origem", "whatsapp")
        .is("deleted_at", null)
        .order("data_hora", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as GestaoContato[];
    },
  });

  return useMemo(() => {
    const total = contatos.length;
    const porStatus = { potencial: 0, pendente: 0, ruido: 0 } as Record<string, number>;
    const canalMap = new Map<string, number>();
    for (const c of contatos) {
      const s = c.triagem_status || "pendente";
      porStatus[s] = (porStatus[s] || 0) + 1;
      const canal = c.canal_detectado?.trim() || "Não informado";
      canalMap.set(canal, (canalMap.get(canal) || 0) + 1);
    }
    const porCanal = [...canalMap.entries()]
      .map(([canal, qtd]) => ({ canal, qtd }))
      .sort((a, b) => b.qtd - a.qtd);

    // Volume por dia (últimos 30 dias).
    const hoje = startOfDay(new Date());
    const dias: { dia: string; label: string; qtd: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(hoje, i);
      dias.push({ dia: format(d, "yyyy-MM-dd"), label: format(d, "dd/MM"), qtd: 0 });
    }
    const idx = new Map(dias.map((d, i) => [d.dia, i]));
    for (const c of contatos) {
      const k = (c.data_hora || "").slice(0, 10);
      const i = idx.get(k);
      if (i != null) dias[i].qtd++;
    }

    return {
      isLoading,
      contatos,
      total,
      potenciais: porStatus.potencial,
      pendentes: porStatus.pendente,
      ruido: porStatus.ruido,
      porCanal,
      porStatus,
      volumeDia: dias,
    };
  }, [contatos, isLoading]);
}
