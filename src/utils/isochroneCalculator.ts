
import { Stop } from '@/types/gtfs';
import * as turf from '@turf/turf';
import { Feature, Point, Position, FeatureCollection, Polygon, MultiPolygon, Properties } from 'geojson';

// Function to calculate isochrones for a given stop
export const calculateIsochrone = async (
  stop: Stop,
  connectedStops: { stopId: string; travelTime: number }[],
  stopsMap: Map<string, Stop>,
  timeThresholds: number[] = [15, 30, 45, 60]
): Promise<Feature<Polygon | MultiPolygon>[]> => {
  // Get all stops within our dataset
  const stopPoints = connectedStops
    .filter(connection => stopsMap.has(connection.stopId))
    .map(connection => {
      const connectedStop = stopsMap.get(connection.stopId);
      if (!connectedStop) return null;
      
      // Create a GeoJSON point with travel time in properties
      return turf.point(
        [parseFloat(connectedStop.stop_lon.toString()), parseFloat(connectedStop.stop_lat.toString())], 
        { 
          travelTime: connection.travelTime
        }
      ) as Feature<Point, { travelTime: number }>;
    })
    .filter(Boolean) as Feature<Point, { travelTime: number }>[];
  
  // Add the origin point itself with travel time 0
  stopPoints.push(turf.point(
    [parseFloat(stop.stop_lon.toString()), parseFloat(stop.stop_lat.toString())],
    { travelTime: 0 }
  ) as Feature<Point, { travelTime: number }>);
  
  // Create a feature collection from all the points
  const pointsCollection = turf.featureCollection(stopPoints) as FeatureCollection<Point, { travelTime: number }>;
  
  // Calculate the isochrones for each time threshold
  const isochrones = await Promise.all(
    timeThresholds.map(async (minutes) => {
      try {
        // Create a grid of points
        const cellSize = 0.1; // km between points
        
        // Try with TIN interpolation first
        const tinResult = interpolateWithTIN(pointsCollection, minutes, cellSize);
        
        // If we have enough points for a contour, return it with metadata
        return {
          ...tinResult,
          properties: {
            contour: minutes
          }
        } as Feature<Polygon | MultiPolygon>;
      } catch (error) {
        console.error(`Error calculating isochrone for ${minutes} minutes:`, error);
        // Return a small circle around the stop as fallback
        return turf.circle(
          [parseFloat(stop.stop_lon.toString()), parseFloat(stop.stop_lat.toString())],
          0.5 * minutes / 15, 
          { 
            steps: 64, 
            units: 'kilometers',
            properties: { contour: minutes } 
          }
        ) as Feature<Polygon>;
      }
    })
  );
  
  return isochrones;
};

// Function to interpolate travel times using TIN (Triangulated Irregular Network)
const interpolateWithTIN = (
  points: FeatureCollection<Point, { travelTime: number }>,
  timeThreshold: number,
  cellSize: number
): Feature<Polygon | MultiPolygon> => {
  // Create a TIN (triangulated irregular network) from the points
  const tin = turf.tin(points, 'travelTime');
  
  // Get the bounding box of the points, and expand it a bit
  const bbox = turf.bbox(points);
  const expandedBbox = [
    bbox[0] - 0.02, // min longitude
    bbox[1] - 0.02, // min latitude
    bbox[2] + 0.02, // max longitude
    bbox[3] + 0.02  // max latitude
  ];
  
  // Create a grid of points to interpolate over
  const grid = turf.pointGrid(expandedBbox, cellSize, { units: 'kilometers' });
  
  // For each grid point, interpolate the travel time using the TIN
  const interpolatedPoints = grid.features.map(point => {
    const coord = point.geometry.coordinates;
    
    // Find which triangle this point is in
    let triangleFound = false;
    let interpolatedTime = Infinity;
    
    for (const triangle of tin.features) {
      const coordinates = triangle.geometry.coordinates[0];
      
      // If point is in this triangle, do barycentric interpolation
      if (pointInTriangle(coord, coordinates[0], coordinates[1], coordinates[2])) {
        triangleFound = true;
        
        // Get travel times for each vertex
        const travelTimes = triangle.properties?.points.map((p: any) => 
          p.properties.travelTime
        );
        
        // Simple average interpolation (could be improved with barycentric)
        interpolatedTime = travelTimes.reduce((sum: number, time: number) => sum + time, 0) / travelTimes.length;
        break;
      }
    }
    
    // If no triangle found, use inverse distance weighting to nearest points
    if (!triangleFound) {
      const nearestPoints = findNearestPoints(coord, points.features, 3);
      if (nearestPoints.length > 0) {
        let weightSum = 0;
        let weightedTimeSum = 0;
        
        nearestPoints.forEach(({ point, distance }) => {
          const weight = 1 / (distance * distance); // Inverse square distance
          weightSum += weight;
          weightedTimeSum += weight * point.properties.travelTime;
        });
        
        interpolatedTime = weightedTimeSum / weightSum;
      }
    }
    
    return turf.point(coord, { travelTime: interpolatedTime });
  });
  
  // Create a feature collection from the interpolated points
  const interpolatedCollection = turf.featureCollection(interpolatedPoints);
  
  // Generate isochronous contours (equal travel time lines)
  const breaks = [timeThreshold];
  const isolines = turf.isolines(interpolatedCollection, breaks, { zProperty: 'travelTime' });
  
  // Convert isolines to polygons
  if (isolines.features.length === 0) {
    // If no isoline was found, return a circle as fallback
    // Find the origin point (with travel time 0)
    const origin = points.features.find(p => p.properties.travelTime === 0);
    if (origin) {
      return turf.circle(
        origin.geometry.coordinates as Position,
        0.5 * timeThreshold / 15, // Scale based on time
        { steps: 64, units: 'kilometers' }
      ) as Feature<Polygon>;
    } else {
      throw new Error('No origin point found and no isolines generated');
    }
  }
  
  // Convert isolines to polygons and merge them
  const polygons = isolines.features.map(line => {
    try {
      // Use polygon to convert line to polygon
      return turf.polygon([line.geometry.coordinates[0] as Position[]], line.properties);
    } catch (error) {
      console.error('Error converting line to polygon:', error);
      return null;
    }
  }).filter(Boolean) as Feature<Polygon>[];
  
  if (polygons.length === 0) {
    throw new Error('Failed to create valid polygons from isolines');
  }
  
  // Union all polygons to create a single multipolygon
  let merged;
  try {
    merged = polygons.reduce((union, polygon) => {
      return turf.union(union, polygon) || union;
    });
  } catch (error) {
    console.error('Error merging polygons:', error);
    // Return the first polygon as fallback
    merged = polygons[0];
  }
  
  return merged || polygons[0];
};

// Helper function to find nearest points
const findNearestPoints = (
  coord: number[],
  points: Feature<Point, { travelTime: number }>[],
  count: number
) => {
  return points
    .map(point => ({
      point,
      distance: turf.distance(
        coord, 
        point.geometry.coordinates, 
        { units: 'kilometers' }
      )
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
};

// Helper function to check if a point is inside a triangle
const pointInTriangle = (
  point: number[],
  v1: number[],
  v2: number[],
  v3: number[]
): boolean => {
  // Compute vectors
  const v0 = [v3[0] - v1[0], v3[1] - v1[1]];
  const v2v = [v2[0] - v1[0], v2[1] - v1[1]];
  const pv = [point[0] - v1[0], point[1] - v1[1]];
  
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
  return u >= 0 && v >= 0 && u + v <= 1;
};
