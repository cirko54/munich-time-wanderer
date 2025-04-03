
import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Stop } from '@/types/gtfs';

type MapComponentProps = {
  selectedStops: Stop[];
  isochroneData: Record<string, GeoJSON.Feature[]>;
  isLoading: boolean;
  mapToken: string;
};

const MapComponent: React.FC<MapComponentProps> = ({ 
  selectedStops, 
  isochroneData, 
  isLoading,
  mapToken,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const mapInitialized = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  
  const MUNICH_CENTER = [11.576124, 48.137154]; // Longitude, latitude of Munich

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInitialized.current || !mapToken) return;

    mapboxgl.accessToken = mapToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: MUNICH_CENTER,
      zoom: 11,
      minZoom: 9,
      maxZoom: 17,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    map.current.on('load', () => {
      mapInitialized.current = true;
      setMapReady(true);
      
      // Add a source for stop markers
      map.current?.addSource('stops', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });
      
      // Add a layer for stop markers
      map.current?.addLayer({
        id: 'stops-layer',
        type: 'circle',
        source: 'stops',
        paint: {
          'circle-radius': 8,
          'circle-color': '#0066b4',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    });

    return () => {
      map.current?.remove();
      mapInitialized.current = false;
    };
  }, [mapToken]);

  // Update stops on the map
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Convert stops to GeoJSON
    const stopsGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: selectedStops.map(stop => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [stop.stop_lon, stop.stop_lat]
        },
        properties: {
          id: stop.stop_id,
          name: stop.stop_name
        }
      }))
    };

    // Update the 'stops' source
    (map.current.getSource('stops') as mapboxgl.GeoJSONSource)?.setData(stopsGeoJSON);

    // If there are stops, fit the map to show them all
    if (selectedStops.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      
      selectedStops.forEach((stop) => {
        bounds.extend([stop.stop_lon, stop.stop_lat]);
      });
      
      // Add some padding to make sure all stops are visible
      map.current.fitBounds(bounds, { padding: 100 });
    }
  }, [selectedStops, mapReady]);

  // Update isochrones on the map
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Remove any existing isochrone layers and sources
    Object.keys(isochroneData).forEach(stopId => {
      const sourceId = `isochrone-${stopId}`;
      if (map.current?.getLayer(sourceId)) {
        map.current.removeLayer(sourceId);
      }
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });
    
    // Add new isochrone layers for each stop
    Object.entries(isochroneData).forEach(([stopId, features], stopIndex) => {
      const sourceId = `isochrone-${stopId}`;
      
      // Add source for this stop's isochrones
      map.current?.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features
        }
      });
      
      // Add layers for each isochrone contour
      features.forEach((feature, i) => {
        const minutes = feature.properties?.contour;
        const stopInfo = selectedStops.find(s => s.stop_id === stopId);
        const layerId = `${sourceId}-${i}`;
        
        // Color based on the stop index (to differentiate stops) and contour time
        const baseHue = (210 + (stopIndex * 30)) % 360; // Different hue for each stop
        const saturation = 80 - (i * 10); // Decreasing saturation for longer times
        const lightness = 50 + (i * 5); // Increasing lightness for longer times
        
        map.current?.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          layout: {},
          filter: ['==', 'contour', minutes],
          paint: {
            'fill-color': `hsl(${baseHue}, ${saturation}%, ${lightness}%)`,
            'fill-opacity': 0.3,
            'fill-outline-color': `hsl(${baseHue}, ${saturation - 10}%, ${lightness - 10}%)`
          }
        });
        
        // Add hover effect and make it interactive
        map.current?.on('mouseenter', layerId, () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = 'pointer';
          }
        });
        
        map.current?.on('mouseleave', layerId, () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = '';
          }
        });
        
        map.current?.on('click', layerId, () => {
          const popup = new mapboxgl.Popup()
            .setLngLat(map.current?.getCenter() as mapboxgl.LngLat)
            .setHTML(`
              <div>
                <h3 class="font-bold">${stopInfo?.stop_name || 'Selected Stop'}</h3>
                <p>${minutes} minute travel time</p>
              </div>
            `)
            .addTo(map.current as mapboxgl.Map);
        });
      });
    });
  }, [isochroneData, selectedStops, mapReady]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {(!mapToken || isLoading) && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          {!mapToken ? (
            <div className="text-center p-4">
              <p className="text-lg font-medium mb-2">Mapbox token required</p>
              <p className="text-sm text-muted-foreground mb-4">Please enter your Mapbox token in the settings panel</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Calculating isochrones...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapComponent;
