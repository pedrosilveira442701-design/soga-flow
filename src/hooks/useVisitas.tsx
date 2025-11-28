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

      // Aplicar filtros
      if (filters?.search) {
        query = query.or(
          `assunto.ilike.%${filters.search}%,marcacao_tipo.ilike.%${filters.search}%,responsavel.ilike.%${filters.search}%`,
        );
      }

      if (filters?.realizada === "pendentes") {
        query = query.eq("realizada", false);
      } else if (filters?.realizada === "realizadas") {
        query = query.eq("realizada", true);
      }

      if (filters?.tipo) {
        query = query.eq("marcacao_tipo", filters.tipo);
      }

      if (filters?.responsavel) {
        query = query.eq("responsavel", filters.responsavel);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

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

  const createVisita = useMutation({
    mutationFn: async (
      newVisita: Omit<Visita, "id" | "created_at" | "updated_at" | "user_id" | "clientes" | "status">,
    ) => {
      if (!user) throw new Error("Usuário não autenticado");

      // Calculate status based on data/hora
      let status: VisitaStatus = "agendar";

      if (newVisita.data && newVisita.hora) {
        const dataHora = new Date(`${newVisita.data}T${newVisita.hora}`);
        if (dataHora < new Date()) {
          status = "atrasada";
        } else {
          status = "marcada";
        }
      } else if (newVisita.data) {
        const dataVisita = new Date(newVisita.data);
        if (dataVisita < new Date()) {
          status = "atrasada";
        } else {
          status = "marcada";
        }
      }

      if (newVisita.realizada) {
        status = "concluida";
      }

      // 🔹 Normaliza cliente_id / cliente_manual_name e realizada
      const payload = {
        ...newVisita,
        cliente_id: newVisita.cliente_id ?? null,
        cliente_manual_name: newVisita.cliente_manual_name || null,
        realizada: newVisita.realizada ?? false,
        user_id: user.id,
        status,
      };

      const { data, error } = await supabase.from("visitas").insert([payload]).select().single();

      if (error) throw error;
      return data as Visita;
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

  const updateVisita = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Visita> & { id: string }) => {
      // Recalculate status if data/hora/realizada changed
      let status: VisitaStatus | undefined;

      if ("data" in updates || "hora" in updates || "realizada" in updates) {
        const visita = visitas.find((v) => v.id === id);
        if (visita) {
          const newData = updates.data !== undefined ? updates.data : visita.data;
          const newHora = updates.hora !== undefined ? updates.hora : visita.hora;
          const newRealizada = updates.realizada !== undefined ? updates.realizada : visita.realizada;

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
      }

      const updatesWithStatus = status ? { ...updates, status } : updates;

      const { data, error } = await supabase.from("visitas").update(updatesWithStatus).eq("id", id).select().single();

      if (error) throw error;
      return data as Visita;
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

  const marcarComoRealizada = useMutation({
    mutationFn: async ({ id, realizada }: { id: string; realizada: boolean }) => {
      const visita = visitas.find((v) => v.id === id);

      let status: VisitaStatus | undefined;

      if (visita) {
        if (realizada) {
          status = "concluida";
        } else {
          // Recalcula status com base em data/hora
          if (visita.data && visita.hora) {
            const dataHora = new Date(`${visita.data}T${visita.hora}`);
            status = dataHora < new Date() ? "atrasada" : "marcada";
          } else if (visita.data) {
            const dataVisita = new Date(visita.data);
            status = dataVisita < new Date() ? "atrasada" : "marcada";
          } else {
            status = "agendar";
          }
        }
      }

      const updatePayload = status ? { realizada, status } : { realizada };

      const { data, error } = await supabase.from("visitas").update(updatePayload).eq("id", id).select().single();

      if (error) throw error;
      return data as Visita;
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
