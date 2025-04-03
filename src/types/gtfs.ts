
// Types for GTFS data structures

// Stop in the GTFS feed
export interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_code?: string;
  location_type?: string;
  parent_station?: string;
  stop_timezone?: string;
  wheelchair_boarding?: string;
  platform_code?: string;
}

// Route in the GTFS feed
export interface Route {
  route_id: string;
  agency_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: string;
  route_color?: string;
  route_text_color?: string;
}

// Trip in the GTFS feed
export interface Trip {
  trip_id: string;
  route_id: string;
  service_id: string;
  trip_headsign?: string;
  trip_short_name?: string;
  direction_id?: string;
  block_id?: string;
  shape_id?: string;
  wheelchair_accessible?: string;
  bikes_allowed?: string;
}

// Stop time in the GTFS feed
export interface StopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: string;
  pickup_type?: string;
  drop_off_type?: string;
  shape_dist_traveled?: string;
  timepoint?: string;
}

// Supported transport modes
export type TransportMode = 'bus' | 'subway' | 'tram' | 'rail';

// Pre-processed stop connections
export interface StopConnection {
  fromStopId: string;
  toStopId: string;
  travelTime: number; // in minutes
  routeId: string;
  tripId: string;
}

// Time-distance table entry
export interface TimeDistanceEntry {
  stopId: string;
  travelTimes: {
    [destinationStopId: string]: number;
  };
}
