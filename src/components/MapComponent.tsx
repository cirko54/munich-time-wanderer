
import React, { useEffect, useRef } from 'react';
import { Stop } from '@/types/gtfs';
import L from 'leaflet';

// Import Leaflet CSS directly (not using the path that's causing the error)
import 'leaflet/dist/leaflet.css';

// We need to handle Leaflet marker icons specially in React
// Instead of importing from leaflet/dist/images, we'll define them here
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Set the default icon for all markers
L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentProps {
  selectedStops: Stop[];
  isochroneData: Record<string, GeoJSON.Feature[]>;
  isLoading: boolean;
}

const MUNICH_CENTER = { lat: 48.137154, lng: 11.576124 };
const DEFAULT_ZOOM = 12;

// Colors for isochrone contours
const ISOCHRONE_COLORS = [
  '#3388ff', // 15min
  '#33a02c', // 30min
  '#ff7f00', // 45min
  '#e31a1c', // 60min
];

const MapComponent: React.FC<MapComponentProps> = ({ 
  selectedStops, 
  isochroneData,
  isLoading 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const isochroneLayersRef = useRef<Record<string, L.GeoJSON>>({});
  const stopMarkersRef = useRef<Record<string, L.Marker>>({});

  // Initialize map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([MUNICH_CENTER.lat, MUNICH_CENTER.lng], DEFAULT_ZOOM);
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      
      mapRef.current = map;
    }
    
    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Add/remove stops on the map
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = mapRef.current;
    const currentStopIds = new Set(selectedStops.map(stop => stop.stop_id));
    
    // Remove markers for stops that are no longer selected
    Object.keys(stopMarkersRef.current).forEach(stopId => {
      if (!currentStopIds.has(stopId)) {
        map.removeLayer(stopMarkersRef.current[stopId]);
        delete stopMarkersRef.current[stopId];
      }
    });
    
    // Add markers for newly selected stops
    selectedStops.forEach(stop => {
      if (!stopMarkersRef.current[stop.stop_id]) {
        const lat = parseFloat(stop.stop_lat.toString());
        const lng = parseFloat(stop.stop_lon.toString());
        
        if (!isNaN(lat) && !isNaN(lng)) {
          const marker = L.marker([lat, lng])
            .addTo(map)
            .bindPopup(`<b>${stop.stop_name}</b><br>ID: ${stop.stop_id}`);
          
          stopMarkersRef.current[stop.stop_id] = marker;
        }
      }
    });
    
    // Adjust view if we have stops
    if (selectedStops.length > 0 && Object.keys(stopMarkersRef.current).length > 0) {
      const bounds = L.latLngBounds(
        Object.values(stopMarkersRef.current).map(marker => marker.getLatLng())
      );
      map.fitBounds(bounds.pad(0.3));
    }
  }, [selectedStops]);

  // Add/remove isochrones on the map
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = mapRef.current;
    const currentIsochroneIds = new Set(Object.keys(isochroneData));
    
    // Remove isochrone layers that are no longer in the data
    Object.keys(isochroneLayersRef.current).forEach(stopId => {
      if (!currentIsochroneIds.has(stopId)) {
        map.removeLayer(isochroneLayersRef.current[stopId]);
        delete isochroneLayersRef.current[stopId];
      }
    });
    
    // Add or update isochrone layers in the data
    Object.entries(isochroneData).forEach(([stopId, features]) => {
      // Remove existing layer if any
      if (isochroneLayersRef.current[stopId]) {
        map.removeLayer(isochroneLayersRef.current[stopId]);
      }
      
      if (features && features.length > 0) {
        // Sort features by contour time (ascending)
        const sortedFeatures = [...features].sort((a, b) => 
          (a.properties?.contour || 0) - (b.properties?.contour || 0)
        );
        
        // Create a new layer
        const layer = L.geoJSON(sortedFeatures as any, {
          style: (feature) => {
            const minutes = feature?.properties?.contour || 15;
            const colorIndex = Math.min(
              Math.floor(minutes / 15) - 1, 
              ISOCHRONE_COLORS.length - 1
            );
            
            return {
              fillColor: ISOCHRONE_COLORS[colorIndex] || ISOCHRONE_COLORS[0],
              weight: 1,
              opacity: 0.8,
              color: 'white',
              dashArray: '3',
              fillOpacity: 0.3
            };
          },
          onEachFeature: (feature, layer) => {
            const minutes = feature.properties?.contour || 15;
            layer.bindTooltip(`${minutes} minutes`);
          }
        }).addTo(map);
        
        isochroneLayersRef.current[stopId] = layer;
      }
    });
  }, [isochroneData]);

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden border border-gray-200">
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm font-medium">Calculating isochrones...</p>
          </div>
        </div>
      )}
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
};

export default MapComponent;
