
/**
 * Extended GTFS type definitions beyond the core types in types/gtfs.ts
 * 
 * These types are specific to the GTFS parsing and processing utilities.
 */

import { Stop, Route, Trip, StopTime, TransportMode } from '@/types/gtfs';

/**
 * Parsed GTFS data containing all necessary entities
 */
export interface GTFSData {
  /** Transit stops */
  stops: Stop[];
  /** Transit routes */
  routes: Route[];
  /** Transit trips */
  trips: Trip[];
  /** Schedule of when vehicles arrive at stops */
  stopTimes: StopTime[];
}

/**
 * Callback for reporting progress during GTFS processing
 */
export type ProgressCallback = (message: string) => void;

/**
 * Mapping of stop IDs to travel time in minutes
 */
export type TravelTimeMap = Map<string, number>;

/**
 * Geographic bounds for filtering stops
 */
export interface GeoBounds {
  /** Northern latitude bound */
  north: number;
  /** Southern latitude bound */
  south: number;
  /** Eastern longitude bound */
  east: number;
  /** Western longitude bound */
  west: number;
}

/**
 * Pre-calculated time distances between stops
 */
export type TimeDistanceMap = Record<string, Record<string, number>>;
