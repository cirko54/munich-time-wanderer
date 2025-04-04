
/**
 * Utilities for generating and handling points for isochrone calculation
 */
import * as turf from '@turf/turf';
import { Feature, Point, Position } from '@turf/turf';
import { PointWithTravelTime, PointsWithTravelTimeCollection, IsochroneOptions, DEFAULT_OPTIONS } from './types';

/**
 * Generate simulated points radiating from the origin point
 * 
 * @param origin - Origin point as a GeoJSON feature
 * @param options - Options for point generation
 * @returns Collection of points with simulated travel times
 */
export const generateSimulatedPoints = (
  origin: Feature<Point>,
  options: IsochroneOptions = {}
): PointsWithTravelTimeCollection => {
  const {
    maxDistance = DEFAULT_OPTIONS.maxDistance!,
    numRadials = DEFAULT_OPTIONS.numRadials!,
    pointsPerRadial = DEFAULT_OPTIONS.pointsPerRadial!,
    averageSpeedKmh = DEFAULT_OPTIONS.averageSpeedKmh!
  } = options;
  
  const points: Feature<Point>[] = [];
  
  // Add the origin point itself
  points.push(origin);
  
  // Generate points along radial lines
  for (let i = 0; i < numRadials; i++) {
    const bearing = (i * 360) / numRadials;
    
    for (let j = 1; j <= pointsPerRadial; j++) {
      const distance = (j / pointsPerRadial) * maxDistance;
      
      // Calculate point at this distance and bearing
      const point = turf.destination(
        origin,
        distance,
        bearing,
        'kilometers'
      );
      
      // Add travel time to point properties
      const simulatedTravelTime = calculateSimulatedTravelTime(distance, averageSpeedKmh);
      
      points.push(turf.point(point.geometry.coordinates, {
        travelTime: simulatedTravelTime
      }));
    }
  }
  
  return turf.featureCollection(points);
};

/**
 * Calculate a simulated travel time based on distance and speed
 * 
 * @param distance - Distance in kilometers
 * @param averageSpeedKmh - Average speed in kilometers per hour
 * @returns Travel time in minutes
 */
export const calculateSimulatedTravelTime = (
  distance: number, 
  averageSpeedKmh: number = DEFAULT_OPTIONS.averageSpeedKmh!
): number => {
  // Convert to minutes
  return (distance / averageSpeedKmh) * 60;
};

/**
 * Find the nearest N points to a given GeoJSON point
 * 
 * @param point - The reference point coordinates
 * @param pointsCollection - Collection of points to search
 * @param n - Number of nearest points to return
 * @returns Array of the nearest points
 */
export const findNearestPoints = (
  point: Position,
  pointsCollection: PointsWithTravelTimeCollection,
  n: number = 5
): Feature<Point>[] => {
  const coordPoint = turf.point(point);
  
  return pointsCollection.features
    .map(feature => ({
      point: feature,
      distance: turf.distance(
        coordPoint,
        feature,
        'kilometers'
      )
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n)
    .map(item => item.point);
};
