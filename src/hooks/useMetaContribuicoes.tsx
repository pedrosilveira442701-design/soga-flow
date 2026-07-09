import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Meta } from "@/hooks/useMetas";

export interface ContribuicaoItem {
  id: string;
  cliente: string;
  valor: number | null;
  data: string;
}

export interface ContribuicaoGrupo {
  label: string;
  agregacao: "soma" | "contagem";
  itens: ContribuicaoItem[];
}

export interface MetaContribuicoes {
  grupos: ContribuicaoGrupo[];
  /** false quando o tipo da meta não tem origem rastreável (progresso manual) */
  suportado: boolean;
}

const SEM_CLIENTE = "Cliente não informado";

// O join vem como objeto ou array dependendo da inferência do PostgREST
const nomeCliente = (row: { clientes?: { nome: string } | { nome: string }[] | null }) => {
  const c = Array.isArray(row.clientes) ? row.clientes[0] : row.clientes;
  return c?.nome ?? SEM_CLIENTE;
};

/**
 * Os filtros abaixo espelham exatamente os de `calcularProgressoReal` em useMetas.
 * Se divergirem, a lista de origem deixa de bater com o progresso exibido.
 */
async function buscarContratos(meta: Meta, filtrarStatus: boolean): Promise<ContribuicaoItem[]> {
  let query = supabase
    .from("contratos")
    .select("id, valor_negociado, data_inicio, clientes(nome)")
    .eq("user_id", meta.user_id)
    .gte("data_inicio", meta.periodo_inicio)
    .lte("data_inicio", meta.periodo_fim);

  if (filtrarStatus) {
    query = query.in("status", ["ativo", "concluido"]);
  }

  const { data, error } = await query.order("data_inicio", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((c) => ({
    id: c.id,
    cliente: nomeCliente(c),
    valor: Number(c.valor_negociado || 0),
    data: c.data_inicio,
  }));
}

async function buscarPropostas(meta: Meta): Promise<ContribuicaoItem[]> {
  const { data, error } = await supabase
    .from("propostas")
    .select("id, valor_total, data, clientes(nome)")
    .eq("user_id", meta.user_id)
    .eq("is_current", true)
    .gte("data", meta.periodo_inicio)
    .lte("data", meta.periodo_fim)
    .order("data", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((p) => ({
    id: p.id,
    cliente: nomeCliente(p),
    valor: Number(p.valor_total || 0),
    data: p.data,
  }));
}

async function buscarClientes(meta: Meta): Promise<ContribuicaoItem[]> {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome, created_at")
    .eq("user_id", meta.user_id)
    .gte("created_at", meta.periodo_inicio)
    .lte("created_at", meta.periodo_fim)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((c) => ({
    id: c.id,
    cliente: c.nome,
    valor: null,
    data: c.created_at,
  }));
}

async function buscarContribuicoes(meta: Meta): Promise<MetaContribuicoes> {
  switch (meta.tipo.toLowerCase()) {
    case "vendas":
    case "vendas (r$)":
      return {
        suportado: true,
        grupos: [
          { label: "Contratos", agregacao: "soma", itens: await buscarContratos(meta, true) },
        ],
      };

    case "propostas (r$)":
      return {
        suportado: true,
        grupos: [{ label: "Propostas", agregacao: "soma", itens: await buscarPropostas(meta) }],
      };

    case "propostas":
    case "propostas (#)":
      return {
        suportado: true,
        grupos: [{ label: "Propostas", agregacao: "contagem", itens: await buscarPropostas(meta) }],
      };

    case "contratos":
    case "contratos (#)":
      return {
        suportado: true,
        grupos: [
          { label: "Contratos", agregacao: "contagem", itens: await buscarContratos(meta, false) },
        ],
      };

    case "conversão":
    case "conversão (%)": {
      const [contratos, propostas] = await Promise.all([
        buscarContratos(meta, false),
        buscarPropostas(meta),
      ]);
      return {
        suportado: true,
        grupos: [
          { label: "Contratos fechados", agregacao: "contagem", itens: contratos },
          { label: "Propostas emitidas", agregacao: "contagem", itens: propostas },
        ],
      };
    }

    case "novos clientes":
    case "novos clientes (#)":
      return {
        suportado: true,
        grupos: [{ label: "Novos clientes", agregacao: "contagem", itens: await buscarClientes(meta) }],
      };

    default:
      return { suportado: false, grupos: [] };
  }
}

export const useMetaContribuicoes = (meta: Meta | null, enabled = true) => {
  return useQuery({
    queryKey: ["meta-contribuicoes", meta?.id, meta?.tipo, meta?.periodo_inicio, meta?.periodo_fim],
    queryFn: () => buscarContribuicoes(meta!),
    enabled: enabled && !!meta,
    staleTime: 30000,
  });
};
