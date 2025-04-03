
import { Stop } from '@/types/gtfs';
import * as turf from '@turf/turf';
import { Feature, Point, Position, FeatureCollection, Polygon, MultiPolygon } from 'geojson';

// Function to calculate isochrones for a given stop
export const calculateIsochrone = async (
  stop: Stop,
  timeThresholds: number[] = [15, 30, 45, 60]
): Promise<GeoJSON.Feature[]> => {
  try {
    // Get nearby points and predict travel times
    const travelTimePoints = await buildTravelTimePoints(stop);
    
    // Generate isochrones for each time threshold
    const isochrones = await Promise.all(
      timeThresholds.map(async (minutes) => {
        try {
          const isochrone = await generateIsochrone(travelTimePoints, minutes);
          return {
            ...isochrone,
            properties: {
              ...isochrone.properties,
              contour: minutes
            }
          };
        } catch (error) {
          console.error(`Error generating isochrone for ${minutes} minutes:`, error);
          return null;
        }
      })
    );
    
    return isochrones.filter(Boolean) as GeoJSON.Feature[];
  } catch (error) {
    console.error('Error calculating isochrone:', error);
    return [];
  }
};

// Simulate building travel time points from a transit stop
const buildTravelTimePoints = async (stop: Stop): Promise<FeatureCollection<Point, { travelTime: number }>> => {
  // In a real app, this would use real transit data, but we'll simulate it
  const radius = 10; // km
  const numPoints = 300;
  const stopLat = parseFloat(stop.stop_lat.toString());
  const stopLon = parseFloat(stop.stop_lon.toString());
  
  // Create an array to hold the points
  const stopPoints: Feature<Point, { travelTime: number }>[] = [];
  
  // Add the origin point itself with travel time 0
  const originCoord: Position = [stopLon, stopLat];
  const originPoint = turf.point(
    originCoord,
    { travelTime: 0 }
  );
  stopPoints.push(originPoint as Feature<Point, { travelTime: number }>);
  
  // Generate random points around the stop
  for (let i = 0; i < numPoints; i++) {
    // Random distance from center (more points closer to center)
    const distance = Math.random() * radius * Math.random(); // Weighted toward center
    const bearing = Math.random() * 360; // Random direction
    
    // Use turf to calculate the destination point
    const destination = turf.destination(
      originPoint,
      distance,
      bearing,
      'kilometers' // Fixed: Use string literal instead of object
    );
    
    // Add the point with a simulated travel time
    // Calculate travel time based on distance (assuming average speed)
    // Add some randomness to simulate real world network effects
    const baseTimeMinutes = distance * 6; // Assuming 10 km/h on average (or 6 min/km)
    const randomFactor = 0.7 + Math.random() * 0.6; // 0.7-1.3 randomness factor
    const travelTime = Math.round(baseTimeMinutes * randomFactor);
    
    destination.properties = { travelTime };
    stopPoints.push(destination as Feature<Point, { travelTime: number }>);
  }
  
  return {
    type: 'FeatureCollection',
    features: stopPoints
  };
};

// Generate an isochrone from the travel time points for a specific time threshold
const generateIsochrone = async (
  points: FeatureCollection<Point, { travelTime: number }>,
  timeThreshold: number
): Promise<Feature<Polygon | MultiPolygon>> => {
  // Filter points by time threshold
  const pointsWithinTime = {
    type: 'FeatureCollection',
    features: points.features.filter(point => point.properties.travelTime <= timeThreshold)
  } as FeatureCollection<Point>;
  
  // If we have very few points, return a simple circle
  if (pointsWithinTime.features.length < 5) {
    console.log(`Not enough points for threshold ${timeThreshold}, using circle fallback`);
    
    // Find the origin point (with travel time 0)
    const origin = points.features.find(p => p.properties.travelTime === 0);
    if (origin) {
      // Create a proper circle instead of using buffer
      const circleRadius = 0.5 * timeThreshold / 15; // Scale based on time
      return turf.circle(
        origin.geometry.coordinates,
        circleRadius, 
        { steps: 64, units: 'kilometers' }
      );
    } else {
      throw new Error('No origin point found and no isolines generated');
    }
  }
  
  // Create concave hull from the points
  try {
    // Use maxEdge as a separate parameter, not in an options object
    const concave = turf.concave(
      pointsWithinTime, 
      1, // maxEdge in kilometers
      'kilometers' // Fixed: Use string literal instead of object
    );
    
    // If concave hull succeeded, return it
    if (concave) return concave;
  } catch (error) {
    console.log('Concave hull failed, falling back to convex hull', error);
  }
  
  // If concave hull fails, try convex hull
  try {
    const convex = turf.convex(pointsWithinTime);
    if (convex) return convex;
  } catch (error) {
    console.log('Convex hull failed, falling back to point buffer', error);
  }
  
  // If all else fails, create a circle around the origin
  const origin = points.features.find(p => p.properties.travelTime === 0);
  if (origin) {
    // Create a circle instead of using buffer
    return turf.circle(
      origin.geometry.coordinates,
      0.5 * timeThreshold / 15, // Scale based on time
      { steps: 64, units: 'kilometers' }
    );
  }
  
  throw new Error('Failed to generate isochrone');
};

// Helper function to find nearest points
const findNearestPoints = (
  coord: Position,
  points: Feature<Point, { travelTime: number }>[],
  count: number
): { point: Feature<Point, { travelTime: number }>; distance: number }[] => {
  // Create a proper point feature for distance calculation
  const coordPoint = turf.point(coord);
  
  return points
    .map(point => ({
      point,
      distance: turf.distance(
        coordPoint,
        point,
        'kilometers' // Fixed: Use string literal instead of object
      )
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
};

// Helper function to check if a point is inside a triangle
const pointInTriangle = (
  point: Position,
  v1: Position,
  v2: Position,
  v3: Position
): boolean => {
  // Compute vectors
  const v0 = [
    v3[0] - v1[0],
    v3[1] - v1[1]
  ];
  const v2v = [
    v2[0] - v1[0],
    v2[1] - v1[1]
  ];
  const pv = [
    point[0] - v1[0],
    point[1] - v1[1]
  ];
  
  // Compute dot products
  const dot00 = v0[0] * v0[0] + v0[1] * v0[1];
  const dot01 = v0[0] * v2v[0] + v0[1] * v2v[1];
  const dot02 = v0[0] * pv[0] + v0[1] * pv[1];
  const dot11 = v2v[0] * v2v[0] + v2v[1] * v2v[1];
  const dot12 = v2v[0] * pv[0] + v2v[1] * pv[1];
  
  // Compute barycentric coordinates
  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
  
  // Check if point is in triangle
  return (u >= 0) && (v >= 0) && (u + v < 1);
};
