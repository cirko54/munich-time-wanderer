
import * as turf from '@turf/turf';
import { Stop } from '@/types/gtfs';

// Utility function to calculate isochrones (reachable areas within time thresholds)
export const calculateIsochrone = async (
  stop: Stop,
  timeThresholds: number[] // in minutes
): Promise<GeoJSON.Feature[]> => {
  // Convert the stop into a GeoJSON point
  const stopPoint = turf.point([parseFloat(stop.stop_lon.toString()), parseFloat(stop.stop_lat.toString())]);
  
  // Generate simulated points radiating from the stop
  const simulatedPoints = generateSimulatedPoints(stopPoint, 15); // 15 km radius
  
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

// Generate simulated points radiating from the stop
const generateSimulatedPoints = (
  origin: GeoJSON.Feature<GeoJSON.Point>,
  maxDistance: number // in kilometers
): GeoJSON.FeatureCollection<GeoJSON.Point> => {
  const points: GeoJSON.Feature<GeoJSON.Point>[] = [];
  
  // Add the origin point itself
  points.push(origin);
  
  // Generate points along radial lines
  const numRadials = 24; // One every 15 degrees
  const pointsPerRadial = 10; // 10 points along each radial
  
  for (let i = 0; i < numRadials; i++) {
    const bearing = (i * 360) / numRadials;
    
    for (let j = 1; j <= pointsPerRadial; j++) {
      const distance = (j / pointsPerRadial) * maxDistance;
      
      // Use turf.destination to calculate point at this distance and bearing
      const point = turf.destination(
        origin, // Pass the entire feature, not just coordinates
        distance,
        bearing,
        {units: 'kilometers'}
      );
      
      // Add the point with a simulated travel time
      const simulatedTravelTime = calculateSimulatedTravelTime(distance);
      
      points.push(turf.point(point.geometry.coordinates, {
        travelTime: simulatedTravelTime
      }));
    }
  }
  
  return turf.featureCollection(points);
};

// Calculate a simulated travel time based on distance
const calculateSimulatedTravelTime = (distance: number): number => {
  // Assume an average speed of 30 km/h for urban transit
  const averageSpeedKmh = 30;
  
  // Convert to minutes
  return (distance / averageSpeedKmh) * 60;
};

// Calculate isochrone for a specific time threshold
const calculateIsochroneForThreshold = async (
  origin: GeoJSON.Feature<GeoJSON.Point>,
  points: GeoJSON.FeatureCollection<GeoJSON.Point>,
  timeThreshold: number
): Promise<GeoJSON.Feature | null> => {
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
      // Create a proper circle
      const circleRadius = 0.5 * timeThreshold / 15; // Scale based on time
      return turf.circle(
        origin, // Pass the entire feature, not just coordinates
        circleRadius,
        { steps: 64, units: 'kilometers' }
      );
    }
    return null;
  }
  
  try {
    // Try to create a concave hull around the points
    const concave = turf.concave(
      pointsWithinTime, 
      1, // maxEdge in kilometers
      { units: 'kilometers' }
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
        return turf.circle(
          origin, // Pass the entire feature, not just coordinates
          0.5 * timeThreshold / 15, // Scale based on time
          { steps: 64, units: 'kilometers' }
        );
      }
      
      return null;
    }
  }
};

// Find the nearest N points to a given GeoJSON point
export const findNearestPoints = (
  point: GeoJSON.Position,
  pointsCollection: GeoJSON.FeatureCollection<GeoJSON.Point>,
  n: number = 5
): GeoJSON.Feature<GeoJSON.Point>[] => {
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

// Get a color based on the time threshold
const getColorForTime = (minutes: number): string => {
  if (minutes <= 15) return '#1a9641';
  if (minutes <= 30) return '#a6d96a';
  if (minutes <= 45) return '#ffffc0';
  return '#fdae61';
};
