/**
 * Fonte única de verdade para status de cada entidade: label + variant do Badge.
 * Toda tela (lista, dialog, kanban) deve importar daqui — nunca redefinir cores
 * ou labels localmente, para o mesmo status nunca divergir entre telas.
 */

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info";

export interface StatusConfig {
  label: string;
  variant: BadgeVariant;
}

const fallback = (raw: string): StatusConfig => ({ label: raw, variant: "secondary" });

// ─── Contrato (enum contract_status) ────────────────────────────────
export const CONTRATO_STATUS: Record<string, StatusConfig> = {
  ativo: { label: "Ativo", variant: "info" },
  concluido: { label: "Concluído", variant: "success" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

// ─── Proposta (status livre + versionamento) ────────────────────────
export const PROPOSTA_STATUS: Record<string, StatusConfig> = {
  aberta: { label: "Aberta", variant: "info" },
  enviada: { label: "Enviada", variant: "info" },
  em_analise: { label: "Em Análise", variant: "warning" },
  fechada: { label: "Fechada", variant: "success" },
  aceita: { label: "Aceita", variant: "success" },
  recusada: { label: "Recusada", variant: "destructive" },
  perdida: { label: "Perdida", variant: "destructive" },
  cancelada: { label: "Cancelada", variant: "destructive" },
  repouso: { label: "Repouso", variant: "secondary" },
  substituida: { label: "Substituída", variant: "outline" },
};

// ─── Meta ───────────────────────────────────────────────────────────
export const META_STATUS: Record<string, StatusConfig> = {
  ativa: { label: "Ativa", variant: "info" },
  concluida: { label: "Concluída", variant: "success" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

// ─── Visita (enum visita_status) ────────────────────────────────────
export const VISITA_STATUS: Record<string, StatusConfig> = {
  agendar: { label: "A Agendar", variant: "secondary" },
  marcada: { label: "Marcada", variant: "info" },
  atrasada: { label: "Atrasada", variant: "destructive" },
  concluida: { label: "Concluída", variant: "success" },
};

// ─── Parcela (enum payment_status) ──────────────────────────────────
export const PARCELA_STATUS: Record<string, StatusConfig> = {
  pendente: { label: "Pendente", variant: "warning" },
  pago: { label: "Pago", variant: "success" },
  atrasado: { label: "Atrasado", variant: "destructive" },
};

// ─── Obra (enum obra_status) ────────────────────────────────────────
export const OBRA_STATUS: Record<string, StatusConfig> = {
  mobilizacao: { label: "Mobilização", variant: "info" },
  execucao: { label: "Em Execução", variant: "warning" },
  acabamento: { label: "Acabamento", variant: "warning" },
  concluida: { label: "Concluída", variant: "success" },
  pausada: { label: "Pausada", variant: "secondary" },
};

export function statusConfig(map: Record<string, StatusConfig>, raw: string | null | undefined): StatusConfig {
  if (!raw) return fallback("—");
  return map[raw] ?? fallback(raw);
}
