
import React, { useRef, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Stop } from '@/types/gtfs';
import 'leaflet/dist/leaflet.css';

type MapComponentProps = {
  selectedStops: Stop[];
  isochroneData: Record<string, GeoJSON.Feature[]>;
  isLoading: boolean;
  mapToken?: string; // Not needed for OSM but keeping for backward compatibility
};

const MapComponent: React.FC<MapComponentProps> = ({ 
  selectedStops, 
  isochroneData, 
  isLoading,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const mapInitialized = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const layersRef = useRef<Record<string, L.Layer>>({});
  
  // Define Munich center coordinates as [latitude, longitude] for Leaflet
  const MUNICH_CENTER: [number, number] = [48.137154, 11.576124];

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInitialized.current) return;
    
    // We need to dynamically import Leaflet because it relies on window object
    const initializeMap = async () => {
      try {
        // Dynamic import of leaflet
        const L = await import('leaflet');
        
        // Create map
        map.current = L.map(mapContainer.current).setView(MUNICH_CENTER, 11);
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map.current);
        
        // Add scale control
        L.control.scale().addTo(map.current);
        
        mapInitialized.current = true;
        setMapReady(true);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };
    
    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      mapInitialized.current = false;
    };
  }, []);

  // Update stops on the map
  useEffect(() => {
    if (!map.current || !mapReady) return;
    
    const updateStops = async () => {
      try {
        const L = await import('leaflet');
        
        // Clear existing stop markers
        Object.entries(layersRef.current).forEach(([key, layer]) => {
          if (key.startsWith('stop-')) {
            map.current?.removeLayer(layer);
            delete layersRef.current[key];
          }
        });
        
        // Add markers for each stop
        selectedStops.forEach(stop => {
          const marker = L.marker(
            [parseFloat(stop.stop_lat.toString()), parseFloat(stop.stop_lon.toString())],
            {
              title: stop.stop_name,
              icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color:#0066b4; width:12px; height:12px; border-radius:6px; border:2px solid white;"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })
            }
          );
          
          marker.bindPopup(`<b>${stop.stop_name}</b>`);
          marker.addTo(map.current!);
          layersRef.current[`stop-${stop.stop_id}`] = marker;
        });
        
        // If there are stops, fit the map to show them all
        if (selectedStops.length > 0) {
          const bounds = L.latLngBounds(
            selectedStops.map(stop => [
              parseFloat(stop.stop_lat.toString()), 
              parseFloat(stop.stop_lon.toString())
            ] as [number, number])
          );
          
          // Add some padding to make sure all stops are visible
          map.current.fitBounds(bounds, { padding: [100, 100] });
        }
      } catch (error) {
        console.error('Error updating stops:', error);
      }
    };
    
    updateStops();
  }, [selectedStops, mapReady]);

  // Update isochrones on the map
  useEffect(() => {
    if (!map.current || !mapReady) return;
    
    const updateIsochrones = async () => {
      try {
        const L = await import('leaflet');
        
        // Remove any existing isochrone layers
        Object.entries(layersRef.current).forEach(([key, layer]) => {
          if (key.startsWith('isochrone-')) {
            map.current?.removeLayer(layer);
            delete layersRef.current[key];
          }
        });
        
        // Add new isochrone layers for each stop
        Object.entries(isochroneData).forEach(([stopId, features], stopIndex) => {
          // Add layers for each isochrone contour
          features.forEach((feature, i) => {
            const minutes = feature.properties?.contour;
            const stopInfo = selectedStops.find(s => s.stop_id === stopId);
            const layerId = `isochrone-${stopId}-${i}`;
            
            // Color based on the stop index (to differentiate stops) and contour time
            const baseHue = (210 + (stopIndex * 30)) % 360; // Different hue for each stop
            const saturation = 80 - (i * 10); // Decreasing saturation for longer times
            const lightness = 50 + (i * 5); // Increasing lightness for longer times
            
            const geoJsonLayer = L.geoJSON(feature as GeoJSON.Feature, {
              style: {
                fillColor: `hsl(${baseHue}, ${saturation}%, ${lightness}%)`,
                fillOpacity: 0.3,
                color: `hsl(${baseHue}, ${saturation - 10}%, ${lightness - 10}%)`,
                weight: 1
              }
            });
            
            geoJsonLayer.bindPopup(`
              <div>
                <h3 style="font-weight:bold;">${stopInfo?.stop_name || 'Selected Stop'}</h3>
                <p>${minutes} minute travel time</p>
              </div>
            `);
            
            geoJsonLayer.addTo(map.current!);
            layersRef.current[layerId] = geoJsonLayer;
          });
        });
      } catch (error) {
        console.error('Error updating isochrones:', error);
      }
    };
    
    updateIsochrones();
  }, [isochroneData, selectedStops, mapReady]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Calculating isochrones...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
