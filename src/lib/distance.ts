// Endereço da sede da Só Garagens
const SEDE_ENDERECO = "Rua Tomas Gonzaga, 656, Lourdes, Belo Horizonte, MG, Brasil";

interface DistanceResult {
  distanceKm: number | null;
  distanceText: string;
}

// Cache em memória para evitar chamadas repetidas
const distanceCache = new Map<string, DistanceResult>();

// Cache em localStorage
const LOCAL_CACHE_KEY = "distance_cache";

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

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn("VITE_GOOGLE_MAPS_API_KEY não configurada");
    return { distanceKm: null, distanceText: "—" };
  }

  try {
    // Usar o serviço Distance Matrix do Google Maps
    // Nota: chamada direta da API requer CORS, então usamos o serviço do @react-google-maps/api
    const service = new google.maps.DistanceMatrixService();
    
    const response = await new Promise<google.maps.DistanceMatrixResponse>((resolve, reject) => {
      service.getDistanceMatrix(
        {
          origins: [SEDE_ENDERECO],
          destinations: [enderecoDestino],
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
        },
        (result, status) => {
          if (status === google.maps.DistanceMatrixStatus.OK && result) {
            resolve(result);
          } else {
            reject(new Error(`Distance Matrix failed: ${status}`));
          }
        }
      );
    });

    const element = response.rows[0]?.elements[0];
    
    if (element?.status === google.maps.DistanceMatrixElementStatus.OK) {
      const distanceKm = element.distance.value / 1000; // metros para KM
      const distanceText = `${distanceKm.toFixed(1)} km`;
      
      const result: DistanceResult = { distanceKm, distanceText };
      
      // Salvar nos caches
      distanceCache.set(cacheKey, result);
      setLocalCache(cacheKey, result);
      
      return result;
    }
    
    return { distanceKm: null, distanceText: "—" };
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
