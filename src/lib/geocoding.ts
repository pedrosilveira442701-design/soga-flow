// Helper para geocoding usando Google Maps Geocoding API
export interface GeocodedLocation {
  lat: number;
  lng: number;
}

const geocodeCache = new Map<string, GeocodedLocation>();

// Centro de BH como fallback
const BH_CENTER: GeocodedLocation = {
  lat: -19.9167,
  lng: -43.9345,
};

export async function geocodeEndereco(
  cep: string,
  numero: string,
  logradouro?: string,
  bairro?: string,
  cidade?: string,
  uf?: string
): Promise<GeocodedLocation> {
  // Criar chave única para cache
  const cacheKey = `${cep}-${numero}`;
  
  // Verificar cache em memória
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Verificar cache no localStorage
  try {
    const cached = localStorage.getItem(`geocode_${cacheKey}`);
    if (cached) {
      const location = JSON.parse(cached);
      geocodeCache.set(cacheKey, location);
      return location;
    }
  } catch (e) {
    console.warn("Erro ao acessar localStorage:", e);
  }

  // Montar endereço completo para geocoding
  const enderecoParts = [
    logradouro,
    numero,
    bairro,
    cidade || "Belo Horizonte",
    uf || "MG",
    "Brasil",
    cep,
  ].filter(Boolean);
  
  const enderecoCompleto = enderecoParts.join(", ");

  try {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === "USE_YOUR_GOOGLE_MAPS_API_KEY") {
      console.error("❌ Google Maps API Key não configurada corretamente");
      console.info("📝 Configure VITE_GOOGLE_MAPS_API_KEY no arquivo .env");
      return BH_CENTER;
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        enderecoCompleto
      )}&key=${apiKey}`
    );

    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      const location: GeocodedLocation = {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
      };

      // Salvar no cache
      geocodeCache.set(cacheKey, location);
      try {
        localStorage.setItem(`geocode_${cacheKey}`, JSON.stringify(location));
      } catch (e) {
        console.warn("Erro ao salvar no localStorage:", e);
      }

      return location;
    } else {
      console.warn(`⚠️ Geocoding falhou para ${enderecoCompleto}`);
      console.warn(`Status: ${data.status}`);
      if (data.error_message) {
        console.warn(`Mensagem: ${data.error_message}`);
      }
      return BH_CENTER;
    }
  } catch (error) {
    console.error("Erro no geocoding:", error);
    return BH_CENTER;
  }
}

export function clearGeocodeCache() {
  geocodeCache.clear();
  // Limpar localStorage
  Object.keys(localStorage)
    .filter((key) => key.startsWith("geocode_"))
    .forEach((key) => localStorage.removeItem(key));
}
