import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader, MarkerClusterer } from "@react-google-maps/api";
import { MapaFilters, MapaDataPoint, useMapaGeografico } from "@/hooks/useMapaGeografico";
import { MapaFiltros } from "./MapaFiltros";
import { MapaKPICards } from "./MapaKPICards";
import { geocodeEndereco, GeocodedLocation, clearGeocodeCache } from "@/lib/geocoding";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ExternalLink, Navigation, AlertCircle, Flame, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ErrorMessage } from "@/components/feedback/ErrorMessage";
import { toast } from "sonner";

// Função para limpar cache de um endereço específico
const clearCacheForAddress = (cep: string, numero: string) => {
  const cacheKey = `geocode_${cep}-${numero}`;
  localStorage.removeItem(cacheKey);
  console.log(`🧹 Cache limpo para: ${cacheKey}`);
};

const mapContainerStyle = {
  width: "100%",
  height: "600px",
};

const center = {
  lat: -19.9167,
  lng: -43.9345,
};

// Constantes para detecção de geocoding inválido
const BH_CENTER_LAT = -19.9167;
const BH_CENTER_LNG = -43.9345;
const GEOCODING_TOLERANCE = 0.0001; // ~11 metros

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

interface MarkerData extends MapaDataPoint {
  position: GeocodedLocation;
}

export function MapaGeografico() {
  const [filters, setFilters] = useState<MapaFilters>({ modo: "propostas" });
  const { pontos, kpis, isLoading } = useMapaGeografico(filters);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<MarkerData | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapLayer, setHeatmapLayer] = useState<google.maps.visualization.HeatmapLayer | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const navigate = useNavigate();

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: ["visualization"],
  });

  // Detectar erros de API key
  useEffect(() => {
    console.log("🗺️ Status do Google Maps:");
    console.log("  - isLoaded:", isLoaded);
    console.log("  - loadError:", loadError);
    console.log("  - API Key configurada:", !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
    console.log("  - API Key válida:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== "USE_YOUR_GOOGLE_MAPS_API_KEY");

    if (loadError) {
      console.error("❌ Erro ao carregar Google Maps:", loadError);
      setMapError("Erro ao carregar Google Maps. Verifique a API key.");
    }
    
    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 
        import.meta.env.VITE_GOOGLE_MAPS_API_KEY === "USE_YOUR_GOOGLE_MAPS_API_KEY") {
      setMapError("Google Maps API key não configurada. Configure VITE_GOOGLE_MAPS_API_KEY no arquivo .env");
    }
  }, [loadError, isLoaded]);

  // Log de dados
  useEffect(() => {
    console.log(`📊 Dados do mapa:`);
    console.log(`  - Pontos carregados: ${pontos.length}`);
    console.log(`  - Marcadores geocodificados: ${markers.length}`);
    console.log(`  - Modo atual: ${filters.modo}`);
  }, [pontos.length, markers.length, filters.modo]);

  // Geocodificar pontos
  useEffect(() => {
    const geocodePontos = async () => {
      if (pontos.length === 0) {
        setMarkers([]);
        return;
      }
      
      setIsGeocoding(true);
      const geocodedMarkers: MarkerData[] = [];

      for (const ponto of pontos) {
        try {
          const position = await geocodeEndereco(
            ponto.cep,
            ponto.numero,
            ponto.logradouro,
            ponto.bairro,
            ponto.cidade,
            ponto.uf
          );
          geocodedMarkers.push({ ...ponto, position });
        } catch (error) {
          console.error("Erro ao geocodificar ponto:", error);
        }
      }

      // Filtrar marcadores que estão exatamente no centro (geocoding falhou)
      const validMarkers = geocodedMarkers.filter((marker) => {
        const isExactCenter = 
          Math.abs(marker.position.lat - BH_CENTER_LAT) < GEOCODING_TOLERANCE &&
          Math.abs(marker.position.lng - BH_CENTER_LNG) < GEOCODING_TOLERANCE;
        
        if (isExactCenter) {
          console.warn(`⚠️ Marcador filtrado (geocoding falhou): ${marker.cliente_nome} - CEP: ${marker.cep}`);
        }
        
        return !isExactCenter;
      });

      setMarkers(validMarkers);
      setIsGeocoding(false);
    };

    geocodePontos();
  }, [pontos]);

  const getCorPorStatus = useCallback(
    (status: string, tipo: string) => {
      if (tipo === "proposta") {
        switch (status) {
          case "fechada":
            return "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
          case "aberta":
            return "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
          case "perdida":
            return "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
          default:
            return "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
        }
      } else if (tipo === "contrato") {
        switch (status) {
          case "ativo":
            return "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
          case "concluido":
            return "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
          case "cancelado":
            return "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
          default:
            return "http://maps.google.com/mapfiles/ms/icons/purple-dot.png";
        }
      } else {
        // obra
        switch (status) {
          case "mobilizacao":
            return "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
          case "execucao":
            return "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
          case "testes":
            return "http://maps.google.com/mapfiles/ms/icons/orange-dot.png";
          case "entrega":
          case "concluida":
            return "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
          default:
            return "http://maps.google.com/mapfiles/ms/icons/purple-dot.png";
        }
      }
    },
    []
  );

  const handleMarkerClick = useCallback((marker: MarkerData) => {
    setSelectedMarker(marker);
  }, []);

  const handleMarkerMouseOver = useCallback((marker: MarkerData) => {
    setHoveredMarker(marker);
  }, []);

  const handleMarkerMouseOut = useCallback(() => {
    setHoveredMarker(null);
  }, []);

  const handleAbrirCRM = useCallback(() => {
    if (!selectedMarker) return;
    
    if (selectedMarker.tipo === "proposta") {
      navigate("/propostas");
    } else if (selectedMarker.tipo === "contrato") {
      navigate("/contratos");
    } else {
      navigate("/obras");
    }
  }, [selectedMarker, navigate]);

  const handleVerRota = useCallback(() => {
    if (!selectedMarker) return;
    
    const endereco = encodeURIComponent(
      `${selectedMarker.endereco_completo}, ${selectedMarker.cep}`
    );
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${endereco}`, "_blank");
  }, [selectedMarker]);

  // Criar/atualizar heatmap quando markers ou toggle mudam
  useEffect(() => {
    // Limpar heatmap anterior se existir
    if (heatmapLayer) {
      heatmapLayer.setMap(null);
      setHeatmapLayer(null);
    }

    // Não criar heatmap se estiver desativado ou sem dados
    if (!isLoaded || !showHeatmap || !mapInstance || markers.length === 0) {
      return;
    }

    // Converter markers para LatLng weighted (com peso baseado no valor)
    const heatmapData = markers.map((marker) => ({
      location: new google.maps.LatLng(marker.position.lat, marker.position.lng),
      weight: Math.log10(marker.valor + 1), // Peso logarítmico baseado no valor
    }));

    // Criar novo heatmap
    const newHeatmap = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: mapInstance, // Vincular diretamente ao mapa
      radius: 40, // Aumentar raio para melhor visualização
      opacity: 0.7,
      gradient: [
        "rgba(0, 255, 255, 0)",
        "rgba(0, 255, 255, 1)",
        "rgba(0, 191, 255, 1)",
        "rgba(0, 127, 255, 1)",
        "rgba(0, 63, 255, 1)",
        "rgba(0, 0, 255, 1)",
        "rgba(0, 0, 223, 1)",
        "rgba(0, 0, 191, 1)",
        "rgba(0, 0, 159, 1)",
        "rgba(0, 0, 127, 1)",
        "rgba(63, 0, 91, 1)",
        "rgba(127, 0, 63, 1)",
        "rgba(191, 0, 31, 1)",
        "rgba(255, 0, 0, 1)",
      ],
    });

    setHeatmapLayer(newHeatmap);

    // Cleanup ao desmontar
    return () => {
      newHeatmap.setMap(null);
    };
  }, [isLoaded, showHeatmap, mapInstance, markers]);

  const getLegendaStatus = useMemo(() => {
    switch (filters.modo) {
      case "propostas":
        return [
          { cor: "green", label: "Ganha" },
          { cor: "yellow", label: "Aberta" },
          { cor: "red", label: "Perdida" },
        ];
      case "contratos":
        return [
          { cor: "blue", label: "Ativo" },
          { cor: "green", label: "Concluído" },
          { cor: "red", label: "Cancelado" },
        ];
      case "obras":
        return [
          { cor: "yellow", label: "Mobilização" },
          { cor: "blue", label: "Execução" },
          { cor: "orange", label: "Testes" },
          { cor: "green", label: "Entrega/Concluída" },
        ];
    }
  }, [filters.modo]);

  // Renderizar erro de API key
  if (mapError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mapa Geográfico - Belo Horizonte</CardTitle>
          <CardDescription>Erro ao carregar mapa</CardDescription>
        </CardHeader>
        <CardContent className="h-[600px] flex flex-col items-center justify-center gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="text-center space-y-2">
            <p className="font-medium text-destructive">{mapError}</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Para configurar o Google Maps:
            </p>
            <ol className="text-sm text-muted-foreground text-left max-w-md space-y-1 list-decimal list-inside">
              <li>Acesse https://console.cloud.google.com/</li>
              <li>Habilite: Maps JavaScript API e Geocoding API</li>
              <li>Crie uma API key</li>
              <li>Configure VITE_GOOGLE_MAPS_API_KEY no arquivo .env</li>
              <li>Reinicie o servidor</li>
            </ol>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.open("https://console.cloud.google.com/", "_blank")}
          >
            Abrir Google Cloud Console
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mapa Geográfico - Belo Horizonte</CardTitle>
          <CardDescription>Carregando mapa...</CardDescription>
        </CardHeader>
        <CardContent className="h-[600px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando Google Maps...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapa Geográfico</CardTitle>
          <CardDescription>
            Visualização de {filters.modo} por localização
            {filters.cidade && filters.cidade !== "all" && ` - ${filters.cidade}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros */}
          <div className="space-y-4">
            <MapaFiltros filters={filters} onChange={setFilters} />
            
            {/* Toggle Heatmap */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
              <Flame className="h-5 w-5 text-orange-500" />
              <div className="flex-1">
                <Label htmlFor="heatmap-toggle" className="text-sm font-medium cursor-pointer">
                  Mapa de Calor (Densidade)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Visualizar concentração de {filters.modo}
                </p>
              </div>
              <Switch
                id="heatmap-toggle"
                checked={showHeatmap}
                onCheckedChange={setShowHeatmap}
              />
            </div>
          </div>

          {/* KPIs */}
          <MapaKPICards kpis={kpis} modo={filters.modo} />

          {/* Aviso de registros com geocoding inválido */}
          {pontos.length > markers.length && markers.length > 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900 dark:text-yellow-200">
                  {pontos.length - markers.length} registro(s) oculto(s) no mapa
                </p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  Endereços com CEPs inválidos ou incompletos não aparecem. Verifique os dados dos clientes.
                </p>
              </div>
            </div>
          )}

          {/* Aviso de sem dados */}
          {!isLoading && markers.length === 0 && pontos.length === 0 && (
            <div className="p-8 text-center bg-muted/50 rounded-lg border border-dashed">
              <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">
                Nenhum registro encontrado com os filtros selecionados.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Certifique-se de que os clientes têm CEP e número preenchidos.
              </p>
            </div>
          )}

          {/* Mapa */}
          <div className="relative">
            {(isLoading || isGeocoding) && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background/95 backdrop-blur px-4 py-2 rounded-lg shadow-lg border">
                <p className="text-sm text-muted-foreground">
                  {isGeocoding ? "Geocodificando endereços..." : "Carregando dados..."}
                </p>
              </div>
            )}

            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={12}
              options={mapOptions}
              onLoad={(map) => {
                setMapInstance(map);
              }}
            >
              <MarkerClusterer>
                {(clusterer) => (
                  <>
                    {markers.map((marker) => (
                      <Marker
                        key={marker.id}
                        position={marker.position}
                        onClick={() => handleMarkerClick(marker)}
                        onMouseOver={() => handleMarkerMouseOver(marker)}
                        onMouseOut={handleMarkerMouseOut}
                        icon={getCorPorStatus(marker.status, marker.tipo)}
                        clusterer={clusterer}
                      />
                    ))}
                  </>
                )}
              </MarkerClusterer>

              {/* Tooltip ao passar o mouse */}
              {hoveredMarker && !selectedMarker && (
                <InfoWindow
                  position={hoveredMarker.position}
                  options={{
                    pixelOffset: new google.maps.Size(0, -40),
                    disableAutoPan: true,
                  }}
                >
                  <div className="p-2 min-w-[200px]">
                    <h4 className="font-semibold text-sm mb-1">
                      {hoveredMarker.cliente_nome}
                    </h4>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      <p>{hoveredMarker.bairro}</p>
                      <p className="font-medium text-foreground">
                        R$ {hoveredMarker.valor.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs italic mt-1">
                        Clique para mais detalhes
                      </p>
                    </div>
                  </div>
                </InfoWindow>
              )}

              {/* InfoWindow completo ao clicar */}
              {selectedMarker && (
                <InfoWindow
                  position={selectedMarker.position}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2 max-w-sm">
                    <h3 className="font-semibold text-base mb-2">
                      {selectedMarker.cliente_nome}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Bairro:</span> {selectedMarker.bairro}
                      </p>
                      <p>
                        <span className="font-medium">Valor:</span> R${" "}
                        {selectedMarker.valor.toLocaleString("pt-BR")}
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>{" "}
                        <span className="capitalize">{selectedMarker.status}</span>
                      </p>
                      {selectedMarker.origem && (
                        <p>
                          <span className="font-medium">Origem:</span> {selectedMarker.origem}
                        </p>
                      )}
                      {selectedMarker.telefone && (
                        <p>
                          <span className="font-medium">Telefone:</span> {selectedMarker.telefone}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Button size="sm" variant="outline" onClick={handleAbrirCRM}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Abrir no CRM
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleVerRota}>
                        <Navigation className="h-3 w-3 mr-1" />
                        Ver Rota
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (selectedMarker?.cep && selectedMarker?.numero) {
                            clearCacheForAddress(selectedMarker.cep, selectedMarker.numero);
                            clearGeocodeCache();
                            toast.success("Cache limpo! Recarregue a página para recalcular a posição.");
                          }
                        }}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Recalcular
                      </Button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>

            {/* Legenda */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Legenda</h4>
              <div className="flex flex-wrap gap-4">
                {getLegendaStatus.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full`}
                      style={{ backgroundColor: item.cor }}
                    />
                    <span className="text-sm">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
