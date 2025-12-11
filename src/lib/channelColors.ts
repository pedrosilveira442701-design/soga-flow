// Cores HSL fixas por canal - paleta consistente para todos os gráficos de Analytics
export const CHANNEL_COLORS: Record<string, { hue: number; sat: number; light: number }> = {
  "Instagram": { hue: 330, sat: 75, light: 50 },      // Rosa magenta
  "Google": { hue: 4, sat: 85, light: 55 },           // Vermelho
  "Indicação": { hue: 280, sat: 70, light: 55 },      // Roxo
  "Indicação: Ana": { hue: 280, sat: 70, light: 55 }, // Roxo
  "Site": { hue: 199, sat: 85, light: 45 },           // Azul petróleo
  "WhatsApp": { hue: 142, sat: 65, light: 42 },       // Verde
  "Facebook": { hue: 221, sat: 75, light: 50 },       // Azul royal
  "Telefone": { hue: 28, sat: 90, light: 52 },        // Laranja
  "Orgânico": { hue: 160, sat: 60, light: 40 },       // Verde azulado/teal
  "Não informado": { hue: 220, sat: 12, light: 55 },  // Cinza azulado
  "Outros": { hue: 45, sat: 85, light: 50 },          // Amarelo dourado
  "MKT": { hue: 350, sat: 80, light: 48 },            // Vermelho rosado
  "Síndico": { hue: 190, sat: 70, light: 45 },        // Ciano
  "Síndico Profissional": { hue: 190, sat: 70, light: 45 }, // Ciano
  "Sindico Profissional": { hue: 190, sat: 70, light: 45 }, // Ciano (variante)
  "Envio massivo": { hue: 260, sat: 65, light: 58 },  // Violeta claro
};

// Cores de fallback bem distribuídas no espectro (espaçamento ~40° de hue)
export const FALLBACK_PALETTE = [
  { hue: 15, sat: 80, light: 52 },   // Coral
  { hue: 55, sat: 75, light: 48 },   // Amarelo mostarda
  { hue: 95, sat: 55, light: 45 },   // Verde limão
  { hue: 175, sat: 60, light: 42 },  // Turquesa
  { hue: 235, sat: 65, light: 55 },  // Índigo
  { hue: 295, sat: 55, light: 52 },  // Magenta suave
  { hue: 340, sat: 70, light: 50 },  // Rosa escuro
  { hue: 70, sat: 65, light: 45 },   // Verde oliva
];

/**
 * Retorna cor HSL para um canal
 * @param canal - Nome do canal
 * @param index - Índice opcional para fallback consistente
 */
export function getChannelColor(canal: string, index?: number): { hue: number; sat: number; light: number } {
  // Verificar match exato
  if (CHANNEL_COLORS[canal]) {
    return CHANNEL_COLORS[canal];
  }
  
  // Verificar match parcial (ex: "Indicação: João" -> "Indicação")
  const partialMatch = Object.keys(CHANNEL_COLORS).find(key => 
    canal.toLowerCase().startsWith(key.toLowerCase())
  );
  if (partialMatch) {
    return CHANNEL_COLORS[partialMatch];
  }
  
  // Fallback: usar índice se fornecido, senão usar hash
  if (index !== undefined) {
    return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
  }
  
  const hash = canal.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

/**
 * Retorna cor HSL como string CSS
 */
export function getChannelColorHSL(canal: string, index?: number): string {
  const { hue, sat, light } = getChannelColor(canal, index);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

/**
 * Retorna cor HSL com alpha como string CSS
 */
export function getChannelColorHSLA(canal: string, alpha: number, index?: number): string {
  const { hue, sat, light } = getChannelColor(canal, index);
  return `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
}

// Cores para métricas de funil (Leads, Propostas, Fechados)
export const FUNNEL_COLORS = {
  leads: { hue: 199, sat: 85, light: 48 },       // Azul petróleo
  propostas: { hue: 280, sat: 70, light: 55 },   // Roxo
  fechados: { hue: 142, sat: 65, light: 42 },    // Verde
};

export function getFunnelColorHSL(key: keyof typeof FUNNEL_COLORS): string {
  const { hue, sat, light } = FUNNEL_COLORS[key];
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}
