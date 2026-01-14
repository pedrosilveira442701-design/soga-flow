import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Inconsistencia {
  lead_id: string;
  cliente_nome: string;
  lead_estagio: string;
  proposta_id: string;
  proposta_status: string;
  status_esperado: string;
  tipo: "lead_perdido_proposta_nao" | "lead_repouso_proposta_nao" | "lead_finalizado_proposta_nao" | "outro";
}

// Mapeamento de estágio do lead para status esperado da proposta
const ESTAGIO_TO_STATUS: Record<string, string> = {
  perdido: "perdida",
  repouso: "repouso",
  finalizado: "fechada",
  contrato: "fechada",
};

export function useInconsistencias() {
  return useQuery({
    queryKey: ["inconsistencias"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar leads com propostas vinculadas
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select(`
          id,
          estagio,
          clientes:cliente_id (nome)
        `)
        .eq("user_id", user.id);

      if (leadsError) throw leadsError;

      // Buscar propostas
      const { data: propostas, error: propostasError } = await supabase
        .from("propostas")
        .select(`
          id,
          lead_id,
          status,
          clientes:cliente_id (nome)
        `)
        .eq("user_id", user.id)
        .not("lead_id", "is", null);

      if (propostasError) throw propostasError;

      // Identificar inconsistências
      const inconsistencias: Inconsistencia[] = [];

      for (const proposta of propostas || []) {
        const lead = leads?.find((l) => l.id === proposta.lead_id);
        if (!lead) continue;

        const statusEsperado = ESTAGIO_TO_STATUS[lead.estagio];
        if (!statusEsperado) continue; // Estágios intermediários não precisam de validação

        const propostaStatus = proposta.status || "aberta";

        // Se o status esperado não corresponde ao status atual da proposta
        if (propostaStatus !== statusEsperado) {
          let tipo: Inconsistencia["tipo"] = "outro";
          if (lead.estagio === "perdido") tipo = "lead_perdido_proposta_nao";
          else if (lead.estagio === "repouso") tipo = "lead_repouso_proposta_nao";
          else if (lead.estagio === "finalizado" || lead.estagio === "contrato") tipo = "lead_finalizado_proposta_nao";

          inconsistencias.push({
            lead_id: lead.id,
            cliente_nome: (lead.clientes as any)?.nome || "Cliente desconhecido",
            lead_estagio: lead.estagio,
            proposta_id: proposta.id,
            proposta_status: propostaStatus,
            status_esperado: statusEsperado,
            tipo,
          });
        }
      }

      return inconsistencias;
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
}
