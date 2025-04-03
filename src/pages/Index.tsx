
import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { loadGTFSData, filterStopsForMunich, getConnectedStops } from '@/utils/gtfsParser';
import { calculateIsochrone } from '@/utils/isochroneCalculator';
import MapComponent from '@/components/MapComponent';
import ControlPanel from '@/components/ControlPanel';
import { Stop, TransportMode } from '@/types/gtfs';

const MUNICH_GTFS_URL = 'https://www.mvg.de/.rest/gtfs/mvg/gtfs.zip';

const Index: React.FC = () => {
  const { toast } = useToast();
  
  // State for map and controls
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // State for stops and routes
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedStops, setSelectedStops] = useState<Stop[]>([]);
  const [timeRadiusMinutes, setTimeRadiusMinutes] = useState<number>(30);
  const [selectedModes, setSelectedModes] = useState<TransportMode[]>(['subway', 'tram', 'bus']);
  
  // State for isochrones
  const [isochroneData, setIsochroneData] = useState<Record<string, GeoJSON.Feature[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Reference for the full stops data
  const stopsMapRef = React.useRef<Map<string, Stop>>(new Map());
  
  // State for GTFS data caching
  const [gtfsDataLoaded, setGtfsDataLoaded] = useState<boolean>(false);
  const stopTimesRef = React.useRef<any[]>([]);
  const tripsRef = React.useRef<any[]>([]);
  const routesRef = React.useRef<any[]>([]);
  
  // Load GTFS data
  useEffect(() => {
    const loadData = async () => {
      try {
        if (gtfsDataLoaded) return;
        
        setIsLoading(true);
        toast({
          title: "Loading GTFS Data",
          description: "This may take a few moments...",
        });
        
        const { stops, routes, trips, stopTimes } = await loadGTFSData(
          MUNICH_GTFS_URL,
          (message) => console.log(message)
        );
        
        // Filter stops for Munich area
        const munichStops = filterStopsForMunich(stops);
        
        // Create a map for quick lookup
        const stopsMap = new Map<string, Stop>();
        munichStops.forEach(stop => {
          stopsMap.set(stop.stop_id, stop);
        });
        
        // Store data in refs for future calculations
        stopsMapRef.current = stopsMap;
        stopTimesRef.current = stopTimes;
        tripsRef.current = trips;
        routesRef.current = routes;
        
        setStops(munichStops);
        setGtfsDataLoaded(true);
        
        toast({
          title: "Data Loaded Successfully",
          description: `Loaded ${munichStops.length} stops in the Munich area.`,
        });
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          variant: "destructive",
          title: "Error Loading Data",
          description: "Failed to load GTFS data. Please try again later.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [toast]);
  
  // Handler for selecting a stop
  const handleSelectStop = useCallback((stop: Stop) => {
    setSelectedStops(prev => [...prev, stop]);
  }, []);
  
  // Handler for removing a stop
  const handleRemoveStop = useCallback((stopId: string) => {
    setSelectedStops(prev => prev.filter(stop => stop.stop_id !== stopId));
    setIsochroneData(prev => {
      const newData = { ...prev };
      delete newData[stopId];
      return newData;
    });
  }, []);
  
  // Handler for toggling transport modes
  const handleToggleMode = useCallback((mode: TransportMode) => {
    setSelectedModes(prev => 
      prev.includes(mode)
        ? prev.filter(m => m !== mode)
        : [...prev, mode]
    );
  }, []);
  
  // Function to calculate isochrones
  const calculateIsochrones = useCallback(async () => {
    if (selectedStops.length === 0 || selectedModes.length === 0) return;
    
    setIsLoading(true);
    const newIsochroneData: Record<string, GeoJSON.Feature[]> = {};
    
    try {
      // For each selected stop
      for (const stop of selectedStops) {
        toast({
          title: "Calculating",
          description: `Processing isochrones for ${stop.stop_name}...`,
        });
        
        // Calculate isochrones with the correct parameters
        const isochrones = await calculateIsochrone(
          stop,
          [15, 30, 45, 60].filter(time => time <= timeRadiusMinutes)
        );
        
        newIsochroneData[stop.stop_id] = isochrones;
      }
      
      setIsochroneData(newIsochroneData);
      
      toast({
        title: "Calculation Complete",
        description: `Isochrones calculated for ${selectedStops.length} stops.`,
      });
    } catch (error) {
      console.error('Error calculating isochrones:', error);
      toast({
        variant: "destructive",
        title: "Calculation Error",
        description: "Failed to calculate isochrones. Please try different parameters.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedStops, selectedModes, timeRadiusMinutes, toast]);
  
  // Handle settings toggle
  const handleToggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);
  
  return (
    <div className="min-h-screen bg-munich-light">
      <div className="container py-8 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Control Panel - Takes up 1 column on medium screens */}
          <div className="md:col-span-1">
            <ControlPanel
              stops={stops}
              selectedStops={selectedStops}
              onSelectStop={handleSelectStop}
              onRemoveStop={handleRemoveStop}
              timeRadiusMinutes={timeRadiusMinutes}
              onTimeRadiusChange={setTimeRadiusMinutes}
              selectedModes={selectedModes}
              onToggleMode={handleToggleMode}
              onCalculateIsochrones={calculateIsochrones}
              isLoading={isLoading}
              showSettings={showSettings}
              onToggleSettings={handleToggleSettings}
            />
          </div>
          
          {/* Map - Takes up 3 columns on medium screens */}
          <div className="md:col-span-3 h-[calc(100vh-6rem)]">
            <MapComponent
              selectedStops={selectedStops}
              isochroneData={isochroneData}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
