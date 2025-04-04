
# GTFS Utilities Documentation

This module provides utilities for processing GTFS (General Transit Feed Specification) data.

## Core Concepts

1. **GTFS**: Standard format for public transportation schedules and associated geographic information
2. **Stops**: Locations where vehicles pick up or drop off passengers
3. **Routes**: A group of trips displayed to riders as a single service
4. **Trips**: A sequence of two or more stops that occur during a specific time period
5. **Stop Times**: Times that a vehicle arrives at and departs from stops for each trip

## Module Structure

```
gtfsUtils/
├── gtfsTypes.ts # Type definitions
├── mockData.ts  # Mock data for Munich
└── timeUtils.ts # Time parsing and formatting
```

## Functions

### Time Utilities (`timeUtils.ts`)

#### `parseTimeToMinutes(timeStr)`

Converts GTFS time string to minutes past midnight.

- **Parameters**:
  - `timeStr`: Time string in HH:MM:SS format
- **Returns**: Minutes past midnight (numeric)

#### `formatMinutesToTime(minutes)`

Converts minutes past midnight to GTFS time string.

- **Parameters**:
  - `minutes`: Time in minutes past midnight
- **Returns**: Formatted time string (HH:MM:SS)

### Mock Data (`mockData.ts`)

#### `getMockGTFSData()`

Provides a precalculated set of GTFS data for Munich.

- **Returns**: Object containing stops, routes, trips, and stop times

#### `MUNICH_TIME_DISTANCE_MAP`

Precalculated time distances between key Munich transit stops.

## Types (`gtfsTypes.ts`)

### `GTFSData`

Container for all GTFS entities.

```typescript
interface GTFSData {
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
}
```

### `GeoBounds`

Geographic bounding box.

```typescript
interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### `TimeDistanceMap`

Structure for storing travel times between stops.

```typescript
type TimeDistanceMap = Record<string, Record<string, number>>;
```

## Mock Data Details

The mock data represents a simplified version of Munich's transit network with:

- 10 key transit stops (Hauptbahnhof, Marienplatz, etc.)
- 8 routes covering subway (U-Bahn), rail (S-Bahn), tram, and bus
- 5 sample trips
- Precalculated travel times between connected stops

This provides a fallback when online GTFS data cannot be accessed.

## Example Usage

```typescript
import { getMockGTFSData } from './mockData';
import { parseTimeToMinutes } from './timeUtils';

// Get mock GTFS data
const { stops, routes, trips, stopTimes } = getMockGTFSData();

// Find stops in central Munich
const centralStops = stops.filter(stop => 
  stop.stop_lat > 48.13 && 
  stop.stop_lat < 48.15 &&
  stop.stop_lon > 11.55 &&
  stop.stop_lon < 11.59
);

// Convert a departure time to minutes
const departureTime = "08:30:00";
const departureMinutes = parseTimeToMinutes(departureTime); // 510
```

## Performance Considerations

- Mock data is a lightweight alternative to loading full GTFS datasets
- Time conversion functions are optimized for frequent calls
- The precalculated time distance map enables quick travel time lookups
