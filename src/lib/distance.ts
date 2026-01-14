// Coordenadas da sede da Só Garagens (Rua Tomas Gonzaga, 656, Lourdes, BH)
const SEDE_COORDS = { lat: -19.9320, lng: -43.9389 };

interface DistanceResult {
  distanceKm: number | null;
  distanceText: string;
}

// Cache em memória
const distanceCache = new Map<string, DistanceResult>();

// Cache em localStorage
const LOCAL_CACHE_KEY = "distance_cache_v2";

function getLocalCache(): Record<string, DistanceResult> {
  try {
    const cached = localStorage.getItem(LOCAL_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setLocalCache(key: string, value: DistanceResult) {
  try {
    const cache = getLocalCache();
    cache[key] = value;
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore localStorage errors
  }
}

// Calcular distância usando Haversine (aproximação direta)
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Geocodificar endereço usando Google Geocoding API
async function geocodeEndereco(endereco: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn("VITE_GOOGLE_MAPS_API_KEY não configurada");
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(endereco)}&key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
    
    console.warn("Geocoding sem resultados para:", endereco, data.status);
    return null;
  } catch (error) {
    console.error("Erro ao geocodificar:", error);
    return null;
  }
}

export async function calcularDistancia(enderecoDestino: string): Promise<DistanceResult> {
  if (!enderecoDestino) {
    return { distanceKm: null, distanceText: "—" };
  }

  const cacheKey = enderecoDestino.toLowerCase().trim();

  // Verificar cache em memória
  if (distanceCache.has(cacheKey)) {
    return distanceCache.get(cacheKey)!;
  }

  // Verificar cache em localStorage
  const localCache = getLocalCache();
  if (localCache[cacheKey]) {
    distanceCache.set(cacheKey, localCache[cacheKey]);
    return localCache[cacheKey];
  }

  try {
    // Geocodificar o endereço de destino
    const coords = await geocodeEndereco(enderecoDestino);
    
    if (!coords) {
      return { distanceKm: null, distanceText: "—" };
    }

    // Calcular distância usando Haversine (linha reta)
    const distanceKm = haversineDistance(SEDE_COORDS.lat, SEDE_COORDS.lng, coords.lat, coords.lng);
    
    // Aplicar fator de correção para distância real (~1.3x para ruas)
    const distanceReal = distanceKm * 1.3;
    const distanceText = `${distanceReal.toFixed(1)} km`;
    
    const result: DistanceResult = { distanceKm: distanceReal, distanceText };
    
    // Salvar nos caches
    distanceCache.set(cacheKey, result);
    setLocalCache(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error("Erro ao calcular distância:", error);
    return { distanceKm: null, distanceText: "—" };
  }
}

// Limpar caches
export function clearDistanceCache(): void {
  distanceCache.clear();
  try {
    localStorage.removeItem(LOCAL_CACHE_KEY);
  } catch {
    // Ignore
  }
}
