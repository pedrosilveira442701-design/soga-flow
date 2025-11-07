import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader, MarkerClusterer } from "@react-google-maps/api";
import { MapaFilters, MapaDataPoint, useMapaGeografico } from "@/hooks/useMapaGeografico";
import { MapaFiltros } from "./MapaFiltros";
import { MapaKPICards } from "./MapaKPICards";
import { geocodeEndereco, GeocodedLocation } from "@/lib/geocoding";
import { Button } from "@/components/ui/button";
import { ExternalLink, Navigation, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ErrorMessage } from "@/components/feedback/ErrorMessage";

const mapContainerStyle = {
  width: "100%",
  height: "600px",
};

const center = {
  lat: -19.9167,
  lng: -43.9345,
};

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
  const navigate = useNavigate();

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
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
      if (pontos.length === 0) return;
      
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

      setMarkers(geocodedMarkers);
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
          <CardTitle>Mapa Geográfico - Belo Horizonte</CardTitle>
          <CardDescription>
            Visualização de {filters.modo} por localização com CEP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros */}
          <MapaFiltros filters={filters} onChange={setFilters} />

          {/* KPIs */}
          <MapaKPICards kpis={kpis} modo={filters.modo} />

          {/* Aviso de sem dados */}
          {!isLoading && markers.length === 0 && pontos.length === 0 && (
            <div className="p-8 text-center bg-muted/50 rounded-lg border border-dashed">
              <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">
                Nenhum registro encontrado em Belo Horizonte com os filtros selecionados.
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
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={handleAbrirCRM}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Abrir no CRM
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleVerRota}>
                        <Navigation className="h-3 w-3 mr-1" />
                        Ver Rota
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
