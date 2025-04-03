
import Papa from 'papaparse';
import { Stop, Route, Trip, StopTime, TransportMode } from '@/types/gtfs';

// Helper function to safely parse CSV data
const parseCSV = async <T>(csvData: string): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as T[]);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

// Function to load GTFS data from a zip file
export const loadGTFSData = async (
  gtfsUrl: string, 
  progressCallback?: (message: string) => void
): Promise<{
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
}> => {
  try {
    progressCallback?.('Downloading GTFS data...');
    const response = await fetch(gtfsUrl);
    if (!response.ok) {
      throw new Error(`Failed to download GTFS data: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const jszip = await import('jszip');
    
    progressCallback?.('Extracting GTFS data...');
    const zip = await new jszip.default().loadAsync(arrayBuffer);
    
    // Extract and parse stops.txt
    progressCallback?.('Parsing stops data...');
    const stopsText = await zip.file('stops.txt')?.async('string') || '';
    const stops = await parseCSV<Stop>(stopsText);
    
    // Extract and parse routes.txt
    progressCallback?.('Parsing routes data...');
    const routesText = await zip.file('routes.txt')?.async('string') || '';
    const routes = await parseCSV<Route>(routesText);
    
    // Extract and parse trips.txt
    progressCallback?.('Parsing trips data...');
    const tripsText = await zip.file('trips.txt')?.async('string') || '';
    const trips = await parseCSV<Trip>(tripsText);
    
    // Extract and parse stop_times.txt
    progressCallback?.('Parsing stop times data...');
    const stopTimesText = await zip.file('stop_times.txt')?.async('string') || '';
    const stopTimes = await parseCSV<StopTime>(stopTimesText);
    
    return { stops, routes, trips, stopTimes };
  } catch (error) {
    console.error('Error loading GTFS data:', error);
    throw new Error('Failed to load GTFS data');
  }
};

// Function to filter stops based on a geographic bounding box (for Munich area)
export const filterStopsForMunich = (stops: Stop[]): Stop[] => {
  // Munich bounding box (approximate)
  const MUNICH_BOUNDS = {
    north: 48.248,
    south: 48.055,
    east: 11.722,
    west: 11.360
  };
  
  return stops.filter(stop => {
    const lat = parseFloat(stop.stop_lat.toString());
    const lon = parseFloat(stop.stop_lon.toString());
    
    return (
      lat >= MUNICH_BOUNDS.south &&
      lat <= MUNICH_BOUNDS.north &&
      lon >= MUNICH_BOUNDS.west &&
      lon <= MUNICH_BOUNDS.east
    );
  });
};

// Function to filter routes by transport mode
export const filterRoutesByMode = (
  routes: Route[],
  selectedModes: TransportMode[]
): Route[] => {
  const modeToRouteType: Record<TransportMode, string[]> = {
    bus: ['3'],
    subway: ['1'],
    tram: ['0'],
    rail: ['2', '100', '101', '102', '103', '104', '105', '106', '107', '108', '109']
  };
  
  const allowedRouteTypes = selectedModes.flatMap(mode => modeToRouteType[mode]);
  
  return routes.filter(route => 
    allowedRouteTypes.includes(route.route_type.toString())
  );
};

// Get all connected stops from a starting stop
export const getConnectedStops = (
  startStopId: string,
  stopTimes: StopTime[],
  trips: Trip[],
  routes: Route[],
  timeRadius: number // in minutes
): { stopId: string; travelTime: number }[] => {
  // Find all trips that pass through the starting stop
  const tripsThroughStop = stopTimes
    .filter(st => st.stop_id === startStopId)
    .map(st => ({
      tripId: st.trip_id,
      departureTime: parseTimeToMinutes(st.departure_time)
    }));
  
  const connectedStops: Map<string, number> = new Map();
  
  // For each trip through the starting stop
  tripsThroughStop.forEach(({ tripId, departureTime }) => {
    // Get all stops on this trip
    const stopsOnTrip = stopTimes
      .filter(st => st.trip_id === tripId)
      .sort((a, b) => {
        return parseTimeToMinutes(a.departure_time) - parseTimeToMinutes(b.departure_time);
      });
    
    // Find the index of our starting stop in this trip
    const startStopIndex = stopsOnTrip.findIndex(st => st.stop_id === startStopId);
    
    if (startStopIndex !== -1) {
      // Process stops after our starting stop
      for (let i = startStopIndex + 1; i < stopsOnTrip.length; i++) {
        const currentStop = stopsOnTrip[i];
        const currentStopTime = parseTimeToMinutes(currentStop.departure_time);
        const travelTime = currentStopTime - departureTime;
        
        // Only include stops within our time radius
        if (travelTime <= timeRadius) {
          // If we haven't seen this stop yet, or we found a faster route
          if (!connectedStops.has(currentStop.stop_id) || 
              connectedStops.get(currentStop.stop_id)! > travelTime) {
            connectedStops.set(currentStop.stop_id, travelTime);
          }
        } else {
          // Stop once we exceed the time radius
          break;
        }
      }
      
      // Process stops before our starting stop (for the reverse direction)
      for (let i = startStopIndex - 1; i >= 0; i--) {
        const currentStop = stopsOnTrip[i];
        const currentStopTime = parseTimeToMinutes(currentStop.departure_time);
        const travelTime = departureTime - currentStopTime;
        
        // Only include stops within our time radius
        if (travelTime <= timeRadius) {
          // If we haven't seen this stop yet, or we found a faster route
          if (!connectedStops.has(currentStop.stop_id) || 
              connectedStops.get(currentStop.stop_id)! > travelTime) {
            connectedStops.set(currentStop.stop_id, travelTime);
          }
        } else {
          // Stop once we exceed the time radius
          break;
        }
      }
    }
  });
  
  // Convert the Map to an array of objects
  return Array.from(connectedStops.entries()).map(([stopId, travelTime]) => ({
    stopId,
    travelTime
  }));
};

// Helper function to parse GTFS time format to minutes
export const parseTimeToMinutes = (timeStr: string): number => {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours * 60 + minutes + (seconds ? seconds / 60 : 0);
};
