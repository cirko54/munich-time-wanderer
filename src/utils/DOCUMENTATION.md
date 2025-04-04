
# Project Documentation

## Project Structure

```
src/
├── components/          # React components
│   ├── ControlPanel.tsx # User interface panel
│   ├── MapComponent.tsx # Leaflet map display
│   ├── StopSelector.tsx # Transit stop selection
│   └── ui/              # UI components (shadcn/ui)
├── pages/
│   ├── Index.tsx        # Main application page
│   └── NotFound.tsx     # 404 page
├── types/
│   └── gtfs.ts          # GTFS data type definitions
├── utils/
│   ├── gtfsParser.ts    # GTFS data loading and processing
│   ├── gtfsUtils/       # GTFS processing utilities
│   │   ├── gtfsTypes.ts # Additional type definitions
│   │   ├── mockData.ts  # Mock data for Munich
│   │   └── timeUtils.ts # Time parsing and formatting
│   ├── isochroneCalculator.ts # Main isochrone calculator
│   └── isochroneUtils/  # Isochrone calculation utilities
│       ├── isochroneGenerator.ts # Isochrone creation
│       ├── pointGeneration.ts    # Point simulation
│       └── types.ts              # Type definitions
└── App.tsx              # Application entry point
```

## Core Functionality

This application provides interactive visualization of public transit accessibility in Munich. The main features include:

1. **Transit Stop Selection**: Users can search and select stops from Munich's transit network
2. **Time Radius Configuration**: Set how far to travel from selected stops (5-60 minutes)
3. **Transport Mode Filtering**: Filter by bus, subway, tram, or rail
4. **Isochrone Visualization**: Generate color-coded areas showing reachability

## Technical Implementation

### GTFS Data Processing

The application processes GTFS (General Transit Feed Specification) data to understand the transit network:

1. **Data Loading**: Attempts to fetch GTFS data from an online source
2. **Fallback Mechanism**: Uses pre-calculated Munich data if online fetch fails
3. **Geographic Filtering**: Limits stops to the Munich area
4. **Mode Filtering**: Filters routes by selected transport modes
5. **Connectivity Analysis**: Calculates which stops are connected within time thresholds

### Isochrone Calculation

The isochrone calculation process:

1. **Point Simulation**: Generates points radiating from transit stops
2. **Travel Time Estimation**: Assigns estimated travel times to each point
3. **Isochrone Generation**: Creates geometric shapes for each time threshold
   - Uses concave hulls for accurate representation
   - Falls back to convex hulls if concave fails
   - Further falls back to circles for edge cases
4. **Visualization**: Adds properties for rendering (colors, labels)

### UI Components

1. **Control Panel**: Main interface for user input
   - Stop selection
   - Time threshold slider
   - Transport mode toggles
   - Calculation button

2. **Map Component**: Displays the isochrones on a Leaflet map
   - Isochrone layers
   - Stop markers
   - Map controls

## Algorithm Details

### Isochrone Generation Algorithm

1. **Input**: Transit stop and time thresholds
2. **Process**:
   - Create a point at the stop location
   - Generate radiating points in all directions
   - Assign travel times based on distance and average speed
   - Filter points reachable within each time threshold
   - Generate a concave hull around these points
   - Fall back to simpler shapes if necessary
3. **Output**: GeoJSON features representing the isochrones

### Transit Network Analysis

1. **Input**: Starting stop ID and time radius
2. **Process**:
   - Find all trips passing through the starting stop
   - For each trip, find all stops reachable within the time radius
   - Calculate minimum travel time to each connected stop
3. **Output**: List of connected stops with travel times

## Performance Considerations

- Isochrone calculation is computationally intensive, especially for multiple stops
- Point generation is limited to a reasonable number to balance accuracy and performance
- Mock data is used as a fallback to avoid loading large GTFS datasets
- The application calculates isochrones on demand rather than preloading all possibilities
