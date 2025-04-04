
# Isochrone Calculation Documentation

This module handles the generation of isochrones - areas that can be reached within a specified time from a given location.

## Core Concepts

1. **Isochrone**: A boundary line connecting points of equal travel time from a central location
2. **Travel Time**: Estimated time to reach a point from the origin (in minutes)
3. **Radial Points**: Points generated around the origin in all directions
4. **Hull Generation**: Creation of shapes (concave/convex) to outline reachable areas

## Module Structure

```
isochroneUtils/
├── types.ts              # Type definitions
├── pointGeneration.ts    # Functions for generating and managing points
└── isochroneGenerator.ts # Functions for creating isochrones
```

## Functions

### Point Generation (`pointGeneration.ts`)

#### `generateSimulatedPoints(origin, options)`

Generates a collection of points radiating from an origin point.

- **Parameters**:
  - `origin`: Origin point as GeoJSON Feature
  - `options`: Configuration options
    - `maxDistance`: Maximum radius in kilometers
    - `numRadials`: Number of radial lines
    - `pointsPerRadial`: Number of points per radial
    - `averageSpeedKmh`: Average travel speed
- **Returns**: Feature collection with travel times

#### `calculateSimulatedTravelTime(distance, averageSpeedKmh)`

Calculates travel time based on distance and speed.

- **Parameters**:
  - `distance`: Distance in kilometers
  - `averageSpeedKmh`: Speed in km/h
- **Returns**: Travel time in minutes

#### `findNearestPoints(point, pointsCollection, n)`

Finds the closest n points to a given position.

- **Parameters**:
  - `point`: Reference point coordinates
  - `pointsCollection`: Collection of points
  - `n`: Number of points to return
- **Returns**: Array of nearest points

### Isochrone Generation (`isochroneGenerator.ts`)

#### `calculateIsochroneForThreshold(origin, points, timeThreshold)`

Creates an isochrone for a specific time threshold.

- **Parameters**:
  - `origin`: Origin point
  - `points`: Points with travel times
  - `timeThreshold`: Maximum travel time in minutes
- **Returns**: GeoJSON Feature representing the isochrone

#### `getColorForTime(minutes)`

Returns a color value based on the time threshold.

- **Parameters**:
  - `minutes`: Time in minutes
- **Returns**: Hex color string

## Algorithm Details

### Point Generation Algorithm

1. Start with the origin point
2. Create radial lines at equal angles around the origin
3. Place points along each radial at increasing distances
4. Calculate simulated travel time for each point
5. Return a collection of all points

### Isochrone Generation Algorithm

1. Filter points reachable within the time threshold
2. If very few points, create a simple circle
3. Try to generate a concave hull around the points
4. If concave hull fails, fall back to convex hull
5. If convex hull fails, fall back to a circle
6. Add properties to the resulting shape for visualization

## Example Usage

```typescript
import * as turf from '@turf/turf';
import { generateSimulatedPoints } from './pointGeneration';
import { calculateIsochroneForThreshold } from './isochroneGenerator';

// Create origin point
const origin = turf.point([11.5600, 48.1402]); // Munich Hauptbahnhof

// Generate points around it
const points = generateSimulatedPoints(origin, {
  maxDistance: 10,
  numRadials: 24,
  pointsPerRadial: 8
});

// Calculate isochrone for 15 minutes travel time
const isochrone = await calculateIsochroneForThreshold(
  origin,
  points,
  15
);

// Use the resulting isochrone for visualization
```

## Performance Considerations

- The number of radials and points affects both accuracy and performance
- Concave hulls provide more accurate representations but may fail with certain point distributions
- Fallback mechanisms ensure reliable output even in edge cases
