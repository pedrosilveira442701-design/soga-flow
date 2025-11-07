import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MapaFilters {
  modo: "propostas" | "contratos" | "obras";
  status?: string;
  periodo_inicio?: Date;
  periodo_fim?: Date;
  origem?: string;
  bairro?: string;
}

export interface MapaDataPoint {
  id: string;
  tipo: "proposta" | "contrato" | "obra";
  cliente_nome: string;
  endereco_completo: string;
  cep: string;
  numero: string;
  logradouro?: string;
  bairro: string;
  cidade: string;
  uf?: string;
  valor: number;
  status: string;
  origem?: string;
  data: Date;
  responsavel?: string;
  cpf_cnpj?: string;
  telefone?: string;
  tipo_piso?: string;
  margem_pct?: number;
}

export interface MapaKPIs {
  total_registros: number;
  valor_total: number;
  win_rate?: number;
  ticket_medio: number;
}

export function useMapaGeografico(filters: MapaFilters) {
  // Query para buscar pontos do mapa
  const { data: pontos = [], isLoading } = useQuery({
    queryKey: ["mapa-geografico", filters],
    queryFn: async () => {
      if (filters.modo === "propostas") {
        return fetchPropostas(filters);
      } else if (filters.modo === "contratos") {
        return fetchContratos(filters);
      } else {
        return fetchObras(filters);
      }
    },
  });

  // Calcular KPIs
  const kpis: MapaKPIs = {
    total_registros: pontos.length,
    valor_total: pontos.reduce((sum, p) => sum + p.valor, 0),
    ticket_medio:
      pontos.length > 0
        ? pontos.reduce((sum, p) => sum + p.valor, 0) / pontos.length
        : 0,
  };

  // Win rate apenas para propostas
  if (filters.modo === "propostas") {
    const ganhas = pontos.filter((p) => p.status === "ganha").length;
    kpis.win_rate = pontos.length > 0 ? (ganhas / pontos.length) * 100 : 0;
  }

  return {
    pontos,
    kpis,
    isLoading,
  };
}

async function fetchPropostas(filters: MapaFilters): Promise<MapaDataPoint[]> {
  let query = supabase
    .from("propostas")
    .select(
      `
      id,
      valor_total,
      status,
      data,
      tipo_piso,
      margem_pct,
      lead_id,
      clientes:cliente_id (
        nome,
        cpf_cnpj,
        telefone,
        cep,
        numero,
        logradouro,
        bairro,
        cidade,
        uf,
        endereco
      )
    `
    )
    .not("clientes.cep", "is", null)
    .not("clientes.numero", "is", null)
    .eq("clientes.cidade", "Belo Horizonte");

  // Filtros
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status as any);
  }

  if (filters.periodo_inicio) {
    query = query.gte("data", filters.periodo_inicio.toISOString());
  }

  if (filters.periodo_fim) {
    query = query.lte("data", filters.periodo_fim.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar propostas:", error);
    return [];
  }

  // Buscar origem dos leads se necessário
  const propostasComOrigem = await Promise.all(
    (data || []).map(async (p: any) => {
      let origem: string | undefined;
      if (p.lead_id) {
        const { data: lead } = await supabase
          .from("leads")
          .select("origem")
          .eq("id", p.lead_id)
          .single();
        origem = lead?.origem;
      }

      return {
        id: p.id,
        tipo: "proposta" as const,
        cliente_nome: p.clientes?.nome || "Cliente não encontrado",
        endereco_completo: p.clientes?.endereco || "",
        cep: p.clientes?.cep || "",
        numero: p.clientes?.numero || "",
        logradouro: p.clientes?.logradouro,
        bairro: p.clientes?.bairro || "",
        cidade: p.clientes?.cidade || "",
        uf: p.clientes?.uf,
        valor: p.valor_total || 0,
        status: p.status || "aberta",
        origem,
        data: new Date(p.data),
        cpf_cnpj: p.clientes?.cpf_cnpj,
        telefone: p.clientes?.telefone,
        tipo_piso: p.tipo_piso,
        margem_pct: p.margem_pct,
      };
    })
  );

  // Filtrar por origem se necessário
  if (filters.origem && filters.origem !== "all") {
    return propostasComOrigem.filter((p) => p.origem === filters.origem);
  }

  // Filtrar por bairro se necessário
  if (filters.bairro && filters.bairro !== "all") {
    return propostasComOrigem.filter((p) => p.bairro === filters.bairro);
  }

  return propostasComOrigem;
}

async function fetchContratos(filters: MapaFilters): Promise<MapaDataPoint[]> {
  let query = supabase
    .from("contratos")
    .select(
      `
      id,
      valor_negociado,
      status,
      data_inicio,
      margem_pct,
      clientes:cliente_id (
        nome,
        cpf_cnpj,
        telefone,
        cep,
        numero,
        logradouro,
        bairro,
        cidade,
        uf,
        endereco
      )
    `
    )
    .not("clientes.cep", "is", null)
    .not("clientes.numero", "is", null)
    .eq("clientes.cidade", "Belo Horizonte");

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status as any);
  }

  if (filters.periodo_inicio) {
    query = query.gte("data_inicio", filters.periodo_inicio.toISOString());
  }

  if (filters.periodo_fim) {
    query = query.lte("data_inicio", filters.periodo_fim.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar contratos:", error);
    return [];
  }

  return (data || []).map((c: any) => ({
    id: c.id,
    tipo: "contrato" as const,
    cliente_nome: c.clientes?.nome || "Cliente não encontrado",
    endereco_completo: c.clientes?.endereco || "",
    cep: c.clientes?.cep || "",
    numero: c.clientes?.numero || "",
    logradouro: c.clientes?.logradouro,
    bairro: c.clientes?.bairro || "",
    cidade: c.clientes?.cidade || "",
    uf: c.clientes?.uf,
    valor: c.valor_negociado || 0,
    status: c.status || "ativo",
    data: new Date(c.data_inicio),
    cpf_cnpj: c.clientes?.cpf_cnpj,
    telefone: c.clientes?.telefone,
    margem_pct: c.margem_pct,
  }));
}

async function fetchObras(filters: MapaFilters): Promise<MapaDataPoint[]> {
  let query = supabase
    .from("obras")
    .select(
      `
      id,
      status,
      progresso_pct,
      responsavel_obra,
      created_at,
      contratos:contrato_id (
        valor_negociado,
        clientes:cliente_id (
          nome,
          cpf_cnpj,
          telefone,
          cep,
          numero,
          logradouro,
          bairro,
          cidade,
          uf,
          endereco
        )
      )
    `
    )
    .not("contratos.clientes.cep", "is", null)
    .not("contratos.clientes.numero", "is", null)
    .eq("contratos.clientes.cidade", "Belo Horizonte");

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status as any);
  }

  if (filters.periodo_inicio) {
    query = query.gte("created_at", filters.periodo_inicio.toISOString());
  }

  if (filters.periodo_fim) {
    query = query.lte("created_at", filters.periodo_fim.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar obras:", error);
    return [];
  }

  return (data || []).map((o: any) => ({
    id: o.id,
    tipo: "obra" as const,
    cliente_nome: o.contratos?.clientes?.nome || "Cliente não encontrado",
    endereco_completo: o.contratos?.clientes?.endereco || "",
    cep: o.contratos?.clientes?.cep || "",
    numero: o.contratos?.clientes?.numero || "",
    logradouro: o.contratos?.clientes?.logradouro,
    bairro: o.contratos?.clientes?.bairro || "",
    cidade: o.contratos?.clientes?.cidade || "",
    uf: o.contratos?.clientes?.uf,
    valor: o.contratos?.valor_negociado || 0,
    status: o.status || "mobilizacao",
    data: new Date(o.created_at),
    responsavel: o.responsavel_obra,
    cpf_cnpj: o.contratos?.clientes?.cpf_cnpj,
    telefone: o.contratos?.clientes?.telefone,
  }));
}
