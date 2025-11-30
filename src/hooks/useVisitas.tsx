import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type VisitaStatus = "agendar" | "marcada" | "atrasada" | "concluida";

export interface Visita {
  id: string;
  user_id: string;
  cliente_id: string | null;
  cliente_manual_name: string | null;
  marcacao_tipo: string;
  assunto: string;
  data: string | null;
  hora: string | null;
  endereco: string | null;
  telefone: string | null;
  responsavel: string | null;
  observacao: string | null;
  realizada: boolean;
  status: VisitaStatus;
  created_at: string;
  updated_at: string;
  clientes?: {
    nome: string;
    telefone: string | null;
    endereco: string | null;
    cidade: string | null;
    bairro: string | null;
  };
}

export interface VisitaFilters {
  search?: string;
  realizada?: "todos" | "pendentes" | "realizadas";
  status?: VisitaStatus;
  tipo?: string;
  responsavel?: string;
  periodo?: "hoje" | "semana" | "mes" | "atrasadas" | "custom";
  dataInicio?: string;
  dataFim?: string;
}

export interface VisitaKPIs {
  totalVisitas: number;
  visitasRealizadas: number;
  visitasPendentes: number;
  visitasHoje: number;
  visitasSemana: number;
  visitasAtrasadas: number;
  taxaRealizacao: number;
}

export function useVisitas(filters?: VisitaFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: visitas = [], isLoading } = useQuery({
    queryKey: ["visitas", user?.id, filters],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("visitas")
        .select(
          `
          *,
          clientes (
            nome,
            telefone,
            endereco,
            cidade,
            bairro
          )
        `,
        )
        .eq("user_id", user.id)
        .order("data", { ascending: false, nullsFirst: false })
        .order("hora", { ascending: false, nullsFirst: false });

      // Busca
      if (filters?.search) {
        query = query.or(
          `assunto.ilike.%${filters.search}%,marcacao_tipo.ilike.%${filters.search}%,responsavel.ilike.%${filters.search}%`,
        );
      }

      // Realizada / pendente
      if (filters?.realizada === "pendentes") {
        query = query.eq("realizada", false);
      } else if (filters?.realizada === "realizadas") {
        query = query.eq("realizada", true);
      }

      // Tipo
      if (filters?.tipo) {
        query = query.eq("marcacao_tipo", filters.tipo);
      }

      // Responsável
      if (filters?.responsavel) {
        query = query.eq("responsavel", filters.responsavel);
      }

      // Status (kanban)
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      // Período
      const hoje = new Date().toISOString().split("T")[0];

      if (filters?.periodo === "hoje") {
        query = query.eq("data", hoje);
      } else if (filters?.periodo === "semana") {
        const semanaDepois = new Date();
        semanaDepois.setDate(semanaDepois.getDate() + 7);
        query = query.gte("data", hoje).lte("data", semanaDepois.toISOString().split("T")[0]);
      } else if (filters?.periodo === "mes") {
        const mesDepois = new Date();
        mesDepois.setMonth(mesDepois.getMonth() + 1);
        query = query.gte("data", hoje).lte("data", mesDepois.toISOString().split("T")[0]);
      } else if (filters?.periodo === "atrasadas") {
        query = query.lt("data", hoje).eq("realizada", false);
      } else if (filters?.periodo === "custom" && filters?.dataInicio && filters?.dataFim) {
        query = query.gte("data", filters.dataInicio).lte("data", filters.dataFim);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Visita[];
    },
    enabled: !!user,
  });

  const { data: kpis } = useQuery({
    queryKey: ["visitas-kpis", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: todasVisitas } = await supabase
        .from("visitas")
        .select("id, data, realizada")
        .eq("user_id", user.id);

      if (!todasVisitas) return null;

      const hoje = new Date().toISOString().split("T")[0];
      const semanaDepois = new Date();
      semanaDepois.setDate(semanaDepois.getDate() + 7);
      const semanaDepoisStr = semanaDepois.toISOString().split("T")[0];

      const totalVisitas = todasVisitas.length;
      const visitasRealizadas = todasVisitas.filter((v) => v.realizada).length;
      const visitasPendentes = todasVisitas.filter((v) => !v.realizada).length;
      const visitasHoje = todasVisitas.filter((v) => v.data === hoje).length;
      const visitasSemana = todasVisitas.filter((v) => v.data && v.data >= hoje && v.data <= semanaDepoisStr).length;
      const visitasAtrasadas = todasVisitas.filter((v) => !v.realizada && v.data && v.data < hoje).length;
      const taxaRealizacao = totalVisitas > 0 ? (visitasRealizadas / totalVisitas) * 100 : 0;

      return {
        totalVisitas,
        visitasRealizadas,
        visitasPendentes,
        visitasHoje,
        visitasSemana,
        visitasAtrasadas,
        taxaRealizacao,
      } as VisitaKPIs;
    },
    enabled: !!user,
  });

  // CREATE
  const createVisita = useMutation({
    mutationFn: async (
      newVisita: Omit<Visita, "id" | "created_at" | "updated_at" | "user_id" | "clientes" | "status">,
    ) => {
      if (!user) throw new Error("Usuário não autenticado");

      // 🔧 Normalizar data/hora: "" -> null
      const cleanData = newVisita.data && newVisita.data.trim() !== "" ? newVisita.data : null;
      const cleanHora = newVisita.hora && newVisita.hora.trim() !== "" ? newVisita.hora : null;

      // Calcular status com base na data/hora limpas
      let status: VisitaStatus = "agendar";

      if (cleanData && cleanHora) {
        const dataHora = new Date(`${cleanData}T${cleanHora}`);
        status = dataHora < new Date() ? "atrasada" : "marcada";
      } else if (cleanData) {
        const dataVisita = new Date(cleanData);
        status = dataVisita < new Date() ? "atrasada" : "marcada";
      }

      if (newVisita.realizada) {
        status = "concluida";
      }

      const payload = {
        ...newVisita,
        data: cleanData,
        hora: cleanHora,
        user_id: user.id,
        status,
      };

      const { data, error } = await supabase.from("visitas").insert([payload]).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      queryClient.invalidateQueries({ queryKey: ["visitas-kpis"] });
      toast.success("Visita agendada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao agendar visita: " + error.message);
    },
  });

  // UPDATE
  const updateVisita = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Visita> & { id: string }) => {
      const visitaOriginal = visitas.find((v) => v.id === id);

      // 🔧 Normalizar data/hora: "" -> null se vierem no update
      const normalizedUpdates: Partial<Visita> = {
        ...updates,
      };

      if ("data" in updates) {
        normalizedUpdates.data = updates.data && updates.data.trim() !== "" ? updates.data : null;
      }

      if ("hora" in updates) {
        normalizedUpdates.hora = updates.hora && updates.hora.trim() !== "" ? updates.hora : null;
      }

      // Recalcular status se data/hora/realizada mudarem
      let status: VisitaStatus | undefined;

      if (
        visitaOriginal &&
        ("data" in normalizedUpdates || "hora" in normalizedUpdates || "realizada" in normalizedUpdates)
      ) {
        const newData = normalizedUpdates.data !== undefined ? normalizedUpdates.data : visitaOriginal.data;
        const newHora = normalizedUpdates.hora !== undefined ? normalizedUpdates.hora : visitaOriginal.hora;
        const newRealizada =
          normalizedUpdates.realizada !== undefined ? normalizedUpdates.realizada : visitaOriginal.realizada;

        if (newRealizada) {
          status = "concluida";
        } else if (newData && newHora) {
          const dataHora = new Date(`${newData}T${newHora}`);
          status = dataHora < new Date() ? "atrasada" : "marcada";
        } else if (newData) {
          const dataVisita = new Date(newData);
          status = dataVisita < new Date() ? "atrasada" : "marcada";
        } else {
          status = "agendar";
        }
      }

      const updatesWithStatus = status ? { ...normalizedUpdates, status } : normalizedUpdates;

      const { data, error } = await supabase.from("visitas").update(updatesWithStatus).eq("id", id).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      queryClient.invalidateQueries({ queryKey: ["visitas-kpis"] });
      toast.success("Visita atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar visita: " + error.message);
    },
  });

  // MARCAR COMO REALIZADA
  const marcarComoRealizada = useMutation({
    mutationFn: async ({ id, realizada }: { id: string; realizada: boolean }) => {
      const { data, error } = await supabase.from("visitas").update({ realizada }).eq("id", id).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      queryClient.invalidateQueries({ queryKey: ["visitas-kpis"] });
      toast.success(variables.realizada ? "Visita marcada como realizada!" : "Visita marcada como pendente!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  // DELETE
  const deleteVisita = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("visitas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      queryClient.invalidateQueries({ queryKey: ["visitas-kpis"] });
      toast.success("Visita excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir visita: " + error.message);
    },
  });

  return {
    visitas,
    kpis,
    isLoading,
    createVisita,
    updateVisita,
    marcarComoRealizada,
    deleteVisita,
  };
}
