/**
 * Constantes e utilitários para o sistema de versionamento de propostas
 */

// Motivos de mudança para criação de nova versão
export const PROPOSAL_CHANGE_REASONS = {
  mudanca_escopo: "Mudança de Escopo",
  reajuste_preco: "Reajuste de Preço",
  correcao_erro: "Correção de Erro",
  nova_condicao: "Novas Condições Comerciais",
  desconto_adicional: "Desconto Negociado",
  atualizacao_dados: "Atualização de Dados",
  outro: "Outro",
} as const;

export type ProposalChangeReason = keyof typeof PROPOSAL_CHANGE_REASONS;

// Lista para usar em selects
export const PROPOSAL_CHANGE_REASON_OPTIONS = Object.entries(PROPOSAL_CHANGE_REASONS).map(
  ([value, label]) => ({ value, label })
);

// Status que permitem edição direta (sem criar nova versão)
export const EDITABLE_STATUSES = ["aberta"] as const;

// Status que permitem criar nova versão
export const VERSIONABLE_STATUSES = ["aberta", "enviada", "repouso"] as const;

// Status imutáveis (somente leitura)
export const READONLY_STATUSES = ["fechada", "aceita", "recusada", "cancelada", "substituida"] as const;

// Status disponíveis para propostas
export const PROPOSAL_STATUS_OPTIONS = [
  { value: "aberta", label: "Aberta" },
  { value: "enviada", label: "Enviada" },
  { value: "aceita", label: "Aceita" },
  { value: "recusada", label: "Recusada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "substituida", label: "Substituída" },
  { value: "repouso", label: "Em Repouso" },
  { value: "fechada", label: "Fechada" },
  { value: "perdida", label: "Perdida" },
] as const;

export type ProposalStatus = typeof PROPOSAL_STATUS_OPTIONS[number]["value"];

/**
 * Verifica se uma proposta pode ser editada diretamente
 * (sem criar nova versão)
 */
export function canEditDirectly(status: string): boolean {
  return EDITABLE_STATUSES.includes(status as typeof EDITABLE_STATUSES[number]);
}

/**
 * Verifica se pode criar uma nova versão a partir desta proposta
 */
export function canCreateNewVersion(status: string): boolean {
  return VERSIONABLE_STATUSES.includes(status as typeof VERSIONABLE_STATUSES[number]);
}

/**
 * Verifica se a proposta é somente leitura
 */
export function isReadOnly(status: string): boolean {
  return READONLY_STATUSES.includes(status as typeof READONLY_STATUSES[number]);
}

/**
 * Detecta se houve mudança material entre duas versões de dados
 * Mudanças materiais: serviços, valores, custos, desconto
 */
export function hasMaterialChange(
  original: {
    servicos?: Array<{ tipo: string; m2: number; valor_m2: number; custo_m2: number }>;
    desconto?: number;
  },
  updated: {
    servicos?: Array<{ tipo: string; m2: number; valor_m2: number; custo_m2: number }>;
    desconto?: number;
  }
): boolean {
  // Comparar desconto
  if ((original.desconto || 0) !== (updated.desconto || 0)) {
    return true;
  }

  // Comparar serviços
  const origServicos = original.servicos || [];
  const updServicos = updated.servicos || [];

  if (origServicos.length !== updServicos.length) {
    return true;
  }

  for (let i = 0; i < origServicos.length; i++) {
    const orig = origServicos[i];
    const upd = updServicos[i];

    if (
      orig.tipo !== upd.tipo ||
      orig.m2 !== upd.m2 ||
      orig.valor_m2 !== upd.valor_m2 ||
      orig.custo_m2 !== upd.custo_m2
    ) {
      return true;
    }
  }

  return false;
}
