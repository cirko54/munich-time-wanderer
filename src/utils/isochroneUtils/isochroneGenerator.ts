
/**
 * Functions for generating isochrones based on time thresholds
 */
import * as turf from '@turf/turf';
import { Feature, FeatureCollection, Point, Position } from '@turf/turf';
import { PointsWithTravelTimeCollection } from './types';

/**
 * Calculate isochrone for a specific time threshold
 * 
 * @param origin - The origin point
 * @param points - Collection of points with travel times
 * @param timeThreshold - Time threshold in minutes
 * @returns GeoJSON feature representing the isochrone area
 */
export const calculateIsochroneForThreshold = async (
  origin: Feature<Point>,
  points: PointsWithTravelTimeCollection,
  timeThreshold: number
): Promise<Feature | null> => {
  // Filter points that can be reached within the time threshold
  const pointsWithinTime = turf.featureCollection(
    points.features.filter(point => {
      const travelTime = point.properties?.travelTime || 0;
      return travelTime <= timeThreshold;
    })
  );
  
  // Special case for very small time thresholds
  if (pointsWithinTime.features.length <= 3) {
    // Create a simple circle for small time thresholds
    if (origin) {
      // Create a proper circle with the correct parameters
      const circleRadius = 0.5 * timeThreshold / 15; // Scale based on time
      return turf.circle(
        origin.geometry.coordinates, 
        circleRadius
      );
    }
    return null;
  }
  
  try {
    // Try to create a concave hull around the points
    const concave = turf.concave(
      pointsWithinTime, 
      1, // maxEdge in kilometers
      'kilometers'
    );
    
    // If concave hull succeeded, return it
    return concave;
  } catch (error) {
    console.warn('Failed to create concave hull, falling back to convex hull', error);
    
    // Fallback to convex hull if concave fails
    try {
      return turf.convex(pointsWithinTime);
    } catch (convexError) {
      console.warn('Failed to create convex hull, falling back to circle', convexError);
      
      // Last resort: use a circle centered on the stop
      if (origin) {
        const circleRadius = 0.5 * timeThreshold / 15; // Scale based on time
        return turf.circle(
          origin.geometry.coordinates, 
          circleRadius
        );
      }
      
      return null;
    }
  }
};

/**
 * Get a color based on the time threshold
 * 
 * @param minutes - Time in minutes
 * @returns Color string in hex format
 */
export const getColorForTime = (minutes: number): string => {
  if (minutes <= 15) return '#1a9641';
  if (minutes <= 30) return '#a6d96a';
  if (minutes <= 45) return '#ffffc0';
  return '#fdae61';
};
