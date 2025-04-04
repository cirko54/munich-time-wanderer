
/**
 * Isochrone calculator - Main module for calculating time-based accessibility zones
 * 
 * This module orchestrates the isochrone calculation process by:
 * 1. Taking a transit stop and time thresholds as inputs
 * 2. Generating simulated points around the stop
 * 3. Calculating isochrones for each time threshold
 * 4. Adding visualization properties to the results
 */
import * as turf from '@turf/turf';
import { Stop } from '@/types/gtfs';
import { generateSimulatedPoints } from './isochroneUtils/pointGeneration';
import { calculateIsochroneForThreshold, getColorForTime } from './isochroneUtils/isochroneGenerator';
import { IsochroneOptions } from './isochroneUtils/types';

/**
 * Calculate isochrones (reachable areas within time thresholds) from a transit stop
 * 
 * @param stop - Transit stop to calculate isochrones from
 * @param timeThresholds - Array of time thresholds in minutes
 * @param options - Optional configuration for isochrone calculation
 * @returns Array of GeoJSON features representing isochrones
 */
export const calculateIsochrone = async (
  stop: Stop,
  timeThresholds: number[], // in minutes
  options?: IsochroneOptions
): Promise<GeoJSON.Feature[]> => {
  // Convert the stop into a GeoJSON point
  const stopPoint = turf.point([parseFloat(stop.stop_lon.toString()), parseFloat(stop.stop_lat.toString())]);
  
  // Generate simulated points radiating from the stop
  const simulatedPoints = generateSimulatedPoints(stopPoint, options);
  
  // Create isochrones for each time threshold
  const isochrones: GeoJSON.Feature[] = [];
  
  // Sort time thresholds in descending order for proper rendering order
  const sortedThresholds = [...timeThresholds].sort((a, b) => b - a);
  
  for (const threshold of sortedThresholds) {
    // Calculate isochrone for this time threshold
    const isochrone = await calculateIsochroneForThreshold(
      stopPoint,
      simulatedPoints,
      threshold
    );
    
    // Add properties for visualization
    if (isochrone) {
      isochrone.properties = {
        ...isochrone.properties,
        stop_id: stop.stop_id,
        stop_name: stop.stop_name,
        time: threshold,
        color: getColorForTime(threshold),
      };
      
      isochrones.push(isochrone);
    }
  }
  
  return isochrones;
};

// Re-export utility functions for convenience
export { findNearestPoints } from './isochroneUtils/pointGeneration';
export { getColorForTime } from './isochroneUtils/isochroneGenerator';
