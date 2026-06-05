import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FilterPeriod } from "@/hooks/useDashboard";

interface Filters {
  period: FilterPeriod | "all";
  customDateRange?: { from: Date; to: Date };
}

// Funil comercial chegou -> proposta -> fechou.
// MODELO: cada contato do WhatsApp (não-ruído) é um lead que CHEGOU. Leads avulsos
// (sem contato de origem, ex.: históricos) também contam. Sem dupla contagem:
// um contato promovido conta como o contato (não soma o lead de novo).
// proposta/fechou são casados via cliente (do lead originado), respeitando o lag.
export function useFunilComercial(filters: Filters = { period: "all" }) {
  const { user } = useAuth();

  const { start, end } = useMemo(() => {
    const now = new Date();
    switch (filters.period) {
      case "all": return { start: new Date(0), end: new Date(9999, 0, 1) };
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
    queryKey: ["funil-comercial", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [leadsRes, propRes, contrRes, contatosRes] = await Promise.all([
        supabase.from("leads").select("id, cliente_id, created_at").eq("user_id", user!.id),
        supabase.from("propostas").select("cliente_id, created_at, status").eq("user_id", user!.id),
        supabase.from("contratos").select("cliente_id, created_at, data_inicio, status").eq("user_id", user!.id),
        supabase.from("contatos").select("data_hora, origem, triagem_status, converteu_lead, lead_id").eq("user_id", user!.id),
      ]);
      return {
        leads: leadsRes.data ?? [],
        propostas: propRes.data ?? [],
        contratos: (contrRes.data ?? []).filter((c: any) => c.status !== "cancelado"),
        contatos: contatosRes.data ?? [],
      };
    },
  });

  return useMemo(() => {
    const leads = (data?.leads ?? []) as any[];
    const propostas = (data?.propostas ?? []) as any[];
    const contratos = (data?.contratos ?? []) as any[];
    const contatos = (data?.contatos ?? []) as any[];
    const inPeriod = (d?: string | null) => {
      if (!d) return false;
      const t = new Date(d).getTime();
      return t >= start.getTime() && t <= end.getTime();
    };

    // cliente -> datas de proposta/contrato
    const pushTo = (m: Map<string, string[]>, k: string, v: string) => {
      const a = m.get(k); if (a) a.push(v); else m.set(k, [v]);
    };
    const propByCliente = new Map<string, string[]>();
    for (const p of propostas) if (p.cliente_id) pushTo(propByCliente, p.cliente_id, p.created_at);
    const contrByCliente = new Map<string, string[]>();
    for (const c of contratos) if (c.cliente_id) pushTo(contrByCliente, c.cliente_id, c.created_at || c.data_inicio);

    const leadById = new Map<string, any>();
    for (const l of leads) leadById.set(l.id, l);
    // Leads que vieram de um contato (p/ não contar duas vezes).
    const leadIdsDeContato = new Set<string>();
    for (const c of contatos) if (c.converteu_lead && c.lead_id) leadIdsDeContato.add(c.lead_id);

    // Lista unificada de "chegadas" = unidade do topo do funil.
    // Cada item: { arrivalDate, clienteId|null } (clienteId p/ casar proposta/contrato).
    type Arr = { date: string; clienteId: string | null };
    const arrivals: Arr[] = [];

    // 1. Cada contato (não-ruído) = um lead que chegou. Ruído (triagem WhatsApp) não conta.
    for (const c of contatos) {
      if (c.triagem_status === "ruido") continue;
      const lead = c.converteu_lead && c.lead_id ? leadById.get(c.lead_id) : null;
      arrivals.push({ date: c.data_hora, clienteId: lead?.cliente_id ?? null });
    }
    // 2. Leads avulsos (sem contato de origem) — ex.: históricos / cadastro manual.
    for (const l of leads) {
      if (leadIdsDeContato.has(l.id)) continue;
      arrivals.push({ date: l.created_at, clienteId: l.cliente_id ?? null });
    }

    // Coorte: chegadas dentro do período; proposta/fechou mesmo que depois (lag).
    const cohort = arrivals.filter((a) => inPeriod(a.date));
    let cProp = 0, cFech = 0, somaDiasProp = 0, somaDiasFech = 0;
    for (const a of cohort) {
      if (!a.clienteId) continue;
      const t0 = new Date(a.date).getTime();
      const props = (propByCliente.get(a.clienteId) ?? []).filter((d) => new Date(d).getTime() >= t0 - 86400000);
      const contrs = (contrByCliente.get(a.clienteId) ?? []).filter((d) => new Date(d).getTime() >= t0 - 86400000);
      if (props.length) { cProp++; somaDiasProp += Math.max(0, Math.round((Math.min(...props.map((d) => new Date(d).getTime())) - t0) / 86400000)); }
      if (contrs.length) { cFech++; somaDiasFech += Math.max(0, Math.round((Math.min(...contrs.map((d) => new Date(d).getTime())) - t0) / 86400000)); }
    }
    const chegaram = cohort.length;
    const coorte = {
      chegaram, proposta: cProp, fechou: cFech,
      taxaProposta: chegaram ? Math.round((cProp / chegaram) * 100) : 0,
      taxaFechouTotal: chegaram ? Math.round((cFech / chegaram) * 100) : 0,
      taxaFechouProposta: cProp ? Math.round((cFech / cProp) * 100) : 0,
      tempoMedioProposta: cProp ? Math.round(somaDiasProp / cProp) : null,
      tempoMedioFechar: cFech ? Math.round(somaDiasFech / cFech) : null,
    };

    // Atividade: eventos dentro do período.
    const atividade = {
      leadsNovos: arrivals.filter((a) => inPeriod(a.date)).length,
      propostasFeitas: propostas.filter((p) => inPeriod(p.created_at)).length,
      contratosFechados: contratos.filter((c) => inPeriod(c.created_at || c.data_inicio)).length,
    };

    return { coorte, atividade, isLoading, periodo: { start, end } };
  }, [data, start, end, isLoading]);
}
