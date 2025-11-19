/**
 * Normaliza texto removendo acentos e convertendo para minúsculas
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Verifica se o termo de busca está contido no texto (fuzzy match)
 */
export function fuzzyMatch(text: string, search: string): boolean {
  if (!search) return true;
  
  const normalizedText = normalizeText(text);
  const normalizedSearch = normalizeText(search);
  
  return normalizedText.includes(normalizedSearch);
}

/**
 * Encontra a posição do match para highlight
 */
export function findMatchPosition(text: string, search: string): { start: number; end: number } | null {
  if (!search) return null;
  
  const normalizedText = normalizeText(text);
  const normalizedSearch = normalizeText(search);
  
  const start = normalizedText.indexOf(normalizedSearch);
  if (start === -1) return null;
  
  return {
    start,
    end: start + normalizedSearch.length
  };
}

/**
 * Calcula score de relevância para ordenação
 * Maior score = mais relevante
 */
export function calculateRelevanceScore(
  text: string,
  search: string,
  fieldWeight: number
): number {
  if (!search) return 0;
  
  const normalizedText = normalizeText(text);
  const normalizedSearch = normalizeText(search);
  
  const index = normalizedText.indexOf(normalizedSearch);
  if (index === -1) return 0;
  
  // Score base pelo peso do campo
  let score = fieldWeight;
  
  // Bonus se match está no início
  if (index === 0) score += 50;
  
  // Bonus por match exato (sem normalização)
  if (text.includes(search)) score += 20;
  
  // Penalidade por posição do match (quanto mais longe, menor o score)
  score -= index * 0.5;
  
  return score;
}
