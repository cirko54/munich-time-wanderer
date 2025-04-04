
# Munich Transit Isochrones

## Overview

This application visualizes public transport accessibility in Munich using isochrones - areas that can be reached within a certain time from a given location. Users can select transit stops, set time thresholds, and choose transport modes to generate interactive accessibility maps.

![Munich Transit Isochrones](https://res.cloudinary.com/dtbxqprod/image/upload/v1617365504/public/transit-isochrones.png)

## Features

- Select multiple transit stops to analyze
- Adjust time radius (5-60 minutes)
- Filter by transport mode (Bus, Subway, Tram, Rail)
- Interactive map visualization with color-coded isochrones
- Real-time calculations
- Fallback to precalculated data when GTFS source unavailable

## Technical Details

This project is built with:

- **React** and **TypeScript** for the frontend
- **Leaflet** for the interactive map
- **Turf.js** for geospatial calculations
- **GTFS** (General Transit Feed Specification) data processing
- **Tailwind CSS** and **shadcn/ui** for the user interface

## Architecture

The application is structured into the following main components:

### Core Components

- **MapComponent**: Interactive map display using Leaflet
- **ControlPanel**: User interface for selecting stops, time thresholds, and modes
- **StopSelector**: Search and selection interface for transit stops

### Utilities

- **GTFS Parsing**: Loading and processing transit data
  - Parser for GTFS zip files
  - Mock data generation for offline use
  - Stop filtering by geographic area
  - Transit connectivity analysis

- **Isochrone Calculation**: Geospatial algorithms for accessibility visualization
  - Point generation around transit stops
  - Travel time simulation
  - Concave/convex hull generation
  - Fallback methods for edge cases

## Getting Started

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Installation

1. Clone the repository
```sh
git clone <repository_url>
cd munich-transit-isochrones
```

2. Install dependencies
```sh
npm install
```

3. Start the development server
```sh
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Data Sources

The application attempts to load GTFS data from Germany's open data portal. If this fails (e.g., due to CORS restrictions), it falls back to precalculated data for Munich's major transit stops.

## Contributing

Contributions are welcome! Here are some areas that could be improved:

- Add more sophisticated routing algorithms
- Improve performance for larger datasets
- Add more visualization options
- Support for real-time transit data

## License

This project is open source and available under the [MIT License](LICENSE).
