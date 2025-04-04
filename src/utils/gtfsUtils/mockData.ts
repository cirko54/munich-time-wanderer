
/**
 * Mock GTFS data for Munich transit network
 * 
 * This module provides precalculated GTFS data when real data cannot be loaded
 */
import { Stop, Route, Trip, StopTime } from '@/types/gtfs';
import { GTFSData, TimeDistanceMap } from './gtfsTypes';
import { formatMinutesToTime, parseTimeToMinutes } from './timeUtils';

/**
 * Pre-calculated time distances between stops (in minutes)
 */
export const MUNICH_TIME_DISTANCE_MAP: TimeDistanceMap = {
  "1": { "2": 5, "3": 7, "4": 8, "6": 12, "7": 18 },
  "2": { "1": 5, "3": 3, "4": 5, "5": 12 },
  "3": { "1": 7, "2": 3, "4": 8, "10": 12 },
  "4": { "1": 8, "2": 5, "3": 8, "5": 9 },
  "5": { "2": 12, "4": 9, "7": 15 },
  "6": { "1": 12, "2": 15, "9": 20 },
  "7": { "1": 18, "5": 15, "8": 30, "9": 8 },
  "8": { "7": 30, "9": 25 },
  "9": { "6": 20, "7": 8, "8": 25 },
  "10": { "3": 12 }
};

/**
 * Get mock GTFS data with Munich transit information
 * 
 * @returns GTFS data object with stops, routes, trips, and stop times
 */
export const getMockGTFSData = (): GTFSData => {
  // Munich central stops
  const stops: Stop[] = [
    { stop_id: "1", stop_name: "Hauptbahnhof", stop_lat: 48.1402, stop_lon: 11.5600, location_type: "0" },
    { stop_id: "2", stop_name: "Marienplatz", stop_lat: 48.1366, stop_lon: 11.5765, location_type: "0" },
    { stop_id: "3", stop_name: "Sendlinger Tor", stop_lat: 48.1344, stop_lon: 11.5665, location_type: "0" },
    { stop_id: "4", stop_name: "Odeonsplatz", stop_lat: 48.1425, stop_lon: 11.5772, location_type: "0" },
    { stop_id: "5", stop_name: "Münchner Freiheit", stop_lat: 48.1612, stop_lon: 11.5860, location_type: "0" },
    { stop_id: "6", stop_name: "Ostbahnhof", stop_lat: 48.1268, stop_lon: 11.6068, location_type: "0" },
    { stop_id: "7", stop_name: "Olympiazentrum", stop_lat: 48.1752, stop_lon: 11.5532, location_type: "0" },
    { stop_id: "8", stop_name: "Garching-Forschungszentrum", stop_lat: 48.2650, stop_lon: 11.6710, location_type: "0" },
    { stop_id: "9", stop_name: "Fröttmaning", stop_lat: 48.1990, stop_lon: 11.6170, location_type: "0" },
    { stop_id: "10", stop_name: "Harras", stop_lat: 48.1196, stop_lon: 11.5370, location_type: "0" },
  ];
  
  // Sample routes for different modes
  const routes: Route[] = [
    { route_id: "U1", agency_id: "MVG", route_short_name: "U1", route_long_name: "Olympia-Einkaufszentrum - Mangfallplatz", route_type: "1" },
    { route_id: "U2", agency_id: "MVG", route_short_name: "U2", route_long_name: "Feldmoching - Messestadt Ost", route_type: "1" },
    { route_id: "U3", agency_id: "MVG", route_short_name: "U3", route_long_name: "Moosach - Fürstenried West", route_type: "1" },
    { route_id: "U6", agency_id: "MVG", route_short_name: "U6", route_long_name: "Garching-Forschungszentrum - Klinikum Großhadern", route_type: "1" },
    { route_id: "S1", agency_id: "DB", route_short_name: "S1", route_long_name: "Freising/Flughafen - Ostbahnhof", route_type: "2" },
    { route_id: "S8", agency_id: "DB", route_short_name: "S8", route_long_name: "Herrsching - Flughafen München", route_type: "2" },
    { route_id: "19", agency_id: "MVG", route_short_name: "19", route_long_name: "Pasing - Berg am Laim", route_type: "0" },
    { route_id: "58", agency_id: "MVG", route_short_name: "58", route_long_name: "Hauptbahnhof - Silberhornstraße", route_type: "3" },
  ];
  
  // Sample trips
  const trips: Trip[] = [
    { trip_id: "U3-1", route_id: "U3", service_id: "Weekday" },
    { trip_id: "U6-1", route_id: "U6", service_id: "Weekday" },
    { trip_id: "S1-1", route_id: "S1", service_id: "Weekday" },
    { trip_id: "19-1", route_id: "19", service_id: "Weekday" },
    { trip_id: "58-1", route_id: "58", service_id: "Weekday" },
  ];
  
  // Generate stop times based on the precalculated time distances
  const stopTimes: StopTime[] = generateMockStopTimes(trips, MUNICH_TIME_DISTANCE_MAP);
  
  return { stops, routes, trips, stopTimes };
};

/**
 * Generate mock stop times based on trips and time distance map
 * 
 * @param trips - List of trips
 * @param timeDistanceMap - Map of time distances between stops
 * @returns List of generated stop times
 */
const generateMockStopTimes = (
  trips: Trip[],
  timeDistanceMap: TimeDistanceMap
): StopTime[] => {
  const stopTimes: StopTime[] = [];
  
  // Generate stop times for each trip
  trips.forEach(trip => {
    const baseTime = "08:00:00";
    const baseMinutes = parseTimeToMinutes(baseTime);
    
    // Different starting stops for different trips
    const startStopId = trip.trip_id.startsWith("U") ? "1" : 
                       trip.trip_id.startsWith("S") ? "6" : "2";
    
    // Add the starting stop
    stopTimes.push({
      trip_id: trip.trip_id,
      stop_id: startStopId,
      arrival_time: baseTime,
      departure_time: baseTime,
      stop_sequence: "1"
    });
    
    // Add connected stops with times based on the time distance map
    let sequence = 2;
    if (timeDistanceMap[startStopId]) {
      Object.entries(timeDistanceMap[startStopId]).forEach(([connectedStopId, timeDistance]) => {
        const departureMinutes = baseMinutes + timeDistance;
        const departureTime = formatMinutesToTime(departureMinutes);
        
        stopTimes.push({
          trip_id: trip.trip_id,
          stop_id: connectedStopId,
          arrival_time: departureTime,
          departure_time: departureTime,
          stop_sequence: sequence.toString()
        });
        
        sequence++;
      });
    }
  });
  
  return stopTimes;
};
