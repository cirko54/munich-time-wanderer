
/**
 * Type definitions for isochrone calculation utilities
 */
import { Feature, FeatureCollection, Point } from '@turf/turf';
import { Stop } from '@/types/gtfs';

/**
 * Point with travel time information
 */
export interface PointWithTravelTime extends Feature<Point> {
  properties: {
    travelTime: number;
    [key: string]: any;
  }
}

/**
 * Collection of points with travel time information
 */
export type PointsWithTravelTimeCollection = FeatureCollection<Point, { travelTime?: number; [key: string]: any }>;

/**
 * Isochrone generation options
 */
export interface IsochroneOptions {
  /**
   * Maximum distance in kilometers for simulated points
   */
  maxDistance?: number;
  
  /**
   * Number of radial lines to generate
   */
  numRadials?: number;
  
  /**
   * Number of points along each radial
   */
  pointsPerRadial?: number;
  
  /**
   * Average travel speed in km/h
   */
  averageSpeedKmh?: number;
}

/**
 * Default values for isochrone options
 */
export const DEFAULT_OPTIONS: IsochroneOptions = {
  maxDistance: 15,
  numRadials: 24,
  pointsPerRadial: 10,
  averageSpeedKmh: 30
};
