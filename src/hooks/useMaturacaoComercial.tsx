import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays } from "date-fns";

export interface MaturacaoData {
  cliente_id: string;
  cliente_nome: string;
  cliente_created_at: string;
  proposta_data: string;
  contrato_data: string;
  dias_cliente_proposta: number;
  dias_proposta_contrato: number;
  dias_cliente_contrato: number;
  tipo_piso: string;
  valor_total: number;
}

export interface MaturacaoKPIs {
  media_cliente_proposta: number;
  media_proposta_contrato: number;
  media_cliente_contrato: number;
  percentual_meta_14_dias: number;
}

export interface BoxplotData {
  categoria: string;
  min: number;
  q1: number;
  mediana: number;
  q3: number;
  max: number;
  media: number;
  meta: number;
  outliers: number[];
}

interface MaturacaoFilters {
  startDate?: Date;
  endDate?: Date;
  tipoPiso?: string;
  cidade?: string;
}

const calcularDias = (dataInicio: string, dataFim: string): number => {
  return differenceInDays(new Date(dataFim), new Date(dataInicio));
};

const calcularBoxplot = (valores: number[], categoria: string): BoxplotData => {
  if (valores.length === 0) {
    return {
      categoria,
      min: 0,
      q1: 0,
      mediana: 0,
      q3: 0,
      max: 0,
      media: 0,
      meta: 0,
      outliers: [],
    };
  }

  const sorted = [...valores].sort((a, b) => a - b);
  const n = sorted.length;

  const min = sorted[0];
  const max = sorted[n - 1];
  const mediana =
    n % 2 === 0
      ? (sorted[Math.floor(n / 2) - 1] + sorted[Math.floor(n / 2)]) / 2
      : sorted[Math.floor(n / 2)];

  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const media = valores.reduce((a, b) => a + b, 0) / n;

  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outliers = valores.filter((v) => v < lowerBound || v > upperBound);

  // Definir metas por categoria
  let meta = 21;
  if (categoria === "Cliente → Proposta") meta = 7;
  else if (categoria === "Proposta → Contrato") meta = 14;

  return { categoria, min, q1, mediana, q3, max, media, meta, outliers };
};

export const useMaturacaoComercial = (filters: MaturacaoFilters = {}) => {
  const { user } = useAuth();

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["maturacao-comercial", user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from("clientes")
        .select(
          `
          id,
          nome,
          created_at,
          cidade,
          propostas!inner (
            data,
            tipo_piso,
            valor_total,
            contratos!inner (
              data_inicio
            )
          )
        `
        )
        .eq("user_id", user.id)
        .not("created_at", "is", null)
        .not("propostas.data", "is", null)
        .not("propostas.contratos.data_inicio", "is", null);

      // Aplicar filtros
      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }
      if (filters.tipoPiso) {
        query = query.eq("propostas.tipo_piso", filters.tipoPiso);
      }
      if (filters.cidade) {
        query = query.eq("cidade", filters.cidade);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Processar dados
  const processedData: MaturacaoData[] = [];

  if (rawData) {
    rawData.forEach((cliente) => {
      const propostas = Array.isArray(cliente.propostas) ? cliente.propostas : [cliente.propostas];
      
      propostas.forEach((proposta: any) => {
        if (!proposta) return;
        
        const contratos = Array.isArray(proposta.contratos) ? proposta.contratos : [proposta.contratos];
        
        contratos.forEach((contrato: any) => {
          if (!contrato) return;

          const dias_cliente_proposta = calcularDias(cliente.created_at, proposta.data);
          const dias_proposta_contrato = calcularDias(proposta.data, contrato.data_inicio);
          const dias_cliente_contrato = calcularDias(cliente.created_at, contrato.data_inicio);

          processedData.push({
            cliente_id: cliente.id,
            cliente_nome: cliente.nome,
            cliente_created_at: cliente.created_at,
            proposta_data: proposta.data,
            contrato_data: contrato.data_inicio,
            dias_cliente_proposta,
            dias_proposta_contrato,
            dias_cliente_contrato,
            tipo_piso: proposta.tipo_piso || "Não especificado",
            valor_total: proposta.valor_total || 0,
          });
        });
      });
    });
  }

  // Calcular KPIs
  const kpis: MaturacaoKPIs = {
    media_cliente_proposta: 0,
    media_proposta_contrato: 0,
    media_cliente_contrato: 0,
    percentual_meta_14_dias: 0,
  };

  if (processedData.length > 0) {
    kpis.media_cliente_proposta =
      processedData.reduce((sum, d) => sum + d.dias_cliente_proposta, 0) / processedData.length;
    kpis.media_proposta_contrato =
      processedData.reduce((sum, d) => sum + d.dias_proposta_contrato, 0) / processedData.length;
    kpis.media_cliente_contrato =
      processedData.reduce((sum, d) => sum + d.dias_cliente_contrato, 0) / processedData.length;

    const dentroMeta = processedData.filter((d) => d.dias_cliente_contrato <= 14).length;
    kpis.percentual_meta_14_dias = (dentroMeta / processedData.length) * 100;
  }

  // Calcular boxplot data
  const boxplotData: BoxplotData[] = [
    calcularBoxplot(
      processedData.map((d) => d.dias_cliente_proposta),
      "Cliente → Proposta"
    ),
    calcularBoxplot(
      processedData.map((d) => d.dias_proposta_contrato),
      "Proposta → Contrato"
    ),
    calcularBoxplot(
      processedData.map((d) => d.dias_cliente_contrato),
      "Cliente → Contrato"
    ),
  ];

  return {
    data: processedData,
    kpis,
    boxplotData,
    isLoading,
  };
};
