import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import {
  startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek,
  startOfYear, endOfYear, subWeeks, subYears, differenceInDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FilterPeriod } from "@/hooks/useDashboard";

interface Filters {
  period: FilterPeriod;
  customDateRange?: { from: Date; to: Date };
}

// Funil comercial chegou -> proposta -> fechou, em duas lentes:
//  - coorte: dos leads que CHEGARAM no período, o que virou proposta/fechou (mesmo depois).
//  - atividade: eventos que aconteceram DENTRO do período (cada um na sua data).
// Liga lead -> cliente -> propostas/contratos pelo cliente_id.
export function useFunilComercial(filters: Filters = { period: "month" }) {
  const { user } = useAuth();

  const { start, end } = useMemo(() => {
    const now = new Date();
    switch (filters.period) {
      case "week": return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
      case "year": return { start: startOfYear(now), end: endOfYear(now) };
      case "custom": return {
        start: filters.customDateRange?.from || startOfMonth(now),
        end: filters.customDateRange?.to || endOfMonth(now),
      };
      default: return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [filters.period, filters.customDateRange?.from?.getTime(), filters.customDateRange?.to?.getTime()]);

  const { data, isLoading } = useQuery({
    queryKey: ["funil-comercial", user?.id, start.getTime(), end.getTime()],
    enabled: !!user,
    queryFn: async () => {
      const [leadsRes, propRes, contrRes] = await Promise.all([
        supabase.from("leads").select("id, cliente_id, created_at, estagio").eq("user_id", user!.id),
        supabase.from("propostas").select("cliente_id, created_at, status").eq("user_id", user!.id),
        supabase.from("contratos").select("cliente_id, created_at, data_inicio, status").eq("user_id", user!.id),
      ]);
      return {
        leads: leadsRes.data ?? [],
        propostas: propRes.data ?? [],
        contratos: (contrRes.data ?? []).filter((c: any) => c.status !== "cancelado"),
      };
    },
  });

  return useMemo(() => {
    const leads = data?.leads ?? [];
    const propostas = data?.propostas ?? [];
    const contratos = data?.contratos ?? [];
    const inPeriod = (d?: string | null) => {
      if (!d) return false;
      const t = new Date(d).getTime();
      return t >= start.getTime() && t <= end.getTime();
    };

    // Índices por cliente para casar lead -> proposta/contrato.
    const pushTo = (map: Map<string, string[]>, key: string, val: string) => {
      const arr = map.get(key);
      if (arr) arr.push(val);
      else map.set(key, [val]);
    };
    const propByCliente = new Map<string, string[]>();
    for (const p of propostas as any[]) if (p.cliente_id) pushTo(propByCliente, p.cliente_id, p.created_at);
    const contrByCliente = new Map<string, string[]>();
    for (const c of contratos as any[]) if (c.cliente_id) pushTo(contrByCliente, c.cliente_id, c.created_at || c.data_inicio);

    // --- COORTE (leads que chegaram no período) ---
    const cohort = leads.filter((l: any) => inPeriod(l.created_at));
    let cProp = 0, cFech = 0, somaDiasProp = 0, somaDiasFech = 0;
    for (const l of cohort) {
      const leadT = new Date(l.created_at).getTime();
      const props = (propByCliente.get(l.cliente_id) ?? []).filter((d) => new Date(d).getTime() >= leadT - 86400000);
      const contrs = (contrByCliente.get(l.cliente_id) ?? []).filter((d) => new Date(d).getTime() >= leadT - 86400000);
      if (props.length) {
        cProp++;
        const first = Math.min(...props.map((d) => new Date(d).getTime()));
        somaDiasProp += Math.max(0, Math.round((first - leadT) / 86400000));
      }
      if (contrs.length) {
        cFech++;
        const first = Math.min(...contrs.map((d) => new Date(d).getTime()));
        somaDiasFech += Math.max(0, Math.round((first - leadT) / 86400000));
      }
    }
    const coorte = {
      chegaram: cohort.length,
      proposta: cProp,
      fechou: cFech,
      taxaProposta: cohort.length ? Math.round((cProp / cohort.length) * 100) : 0,
      taxaFechouTotal: cohort.length ? Math.round((cFech / cohort.length) * 100) : 0,
      taxaFechouProposta: cProp ? Math.round((cFech / cProp) * 100) : 0,
      tempoMedioProposta: cProp ? Math.round(somaDiasProp / cProp) : null,
      tempoMedioFechar: cFech ? Math.round(somaDiasFech / cFech) : null,
    };

    // --- ATIVIDADE (eventos dentro do período) ---
    const atividade = {
      leadsNovos: leads.filter((l: any) => inPeriod(l.created_at)).length,
      propostasFeitas: propostas.filter((p: any) => inPeriod(p.created_at)).length,
      contratosFechados: contratos.filter((c: any) => inPeriod(c.created_at || c.data_inicio)).length,
    };

    return { coorte, atividade, isLoading, periodo: { start, end } };
  }, [data, start, end, isLoading]);
}
