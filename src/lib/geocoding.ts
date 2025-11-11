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

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === "USE_YOUR_GOOGLE_MAPS_API_KEY") {
    console.error("❌ Google Maps API Key não configurada corretamente");
    console.info("📝 Configure VITE_GOOGLE_MAPS_API_KEY no arquivo .env");
    return BH_CENTER;
  }

  // ESTRATÉGIA 1: Endereço completo
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5s

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        enderecoCompleto
      )}&key=${apiKey}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);
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

      console.log(`✅ Geocoding OK: ${enderecoCompleto}`);
      return location;
    }

    // ESTRATÉGIA 2: Tentar só com CEP se falhar
    console.warn(`⚠️ Tentando só com CEP: ${cep}`);
    
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 5000);

    const response2 = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${cep},Brasil&key=${apiKey}`,
      { signal: controller2.signal }
    );

    clearTimeout(timeoutId2);
    const data2 = await response2.json();
    
    if (data2.status === "OK" && data2.results.length > 0) {
      const location: GeocodedLocation = {
        lat: data2.results[0].geometry.location.lat,
        lng: data2.results[0].geometry.location.lng,
      };
      
      // Salvar no cache
      geocodeCache.set(cacheKey, location);
      try {
        localStorage.setItem(`geocode_${cacheKey}`, JSON.stringify(location));
      } catch (e) {
        console.warn("Erro ao salvar no localStorage:", e);
      }

      console.log(`✅ Geocoding OK (só CEP): ${cep}`);
      return location;
    }

    // Falhou completamente - NÃO SALVAR NO CACHE
    console.error(`❌ Geocoding falhou para:`);
    console.error(`   Endereço: ${enderecoCompleto}`);
    console.error(`   CEP: ${cep} | Número: ${numero}`);
    console.error(`   Status API: ${data.status}, Message: ${data.error_message || 'N/A'}`);
    console.warn(`⚠️ Usando centro de BH como fallback (marcador será filtrado)`);
    return BH_CENTER;
    
  } catch (error) {
    // Erro de rede ou timeout - NÃO SALVAR NO CACHE
    console.error(`❌ Erro no geocoding para ${enderecoCompleto}:`, error);
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
