
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { StopSelector } from '@/components/StopSelector';
import { Input } from '@/components/ui/input';
import { RefreshCw, Settings } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Stop, TransportMode } from '@/types/gtfs';

interface ControlPanelProps {
  stops: Stop[];
  selectedStops: Stop[];
  onSelectStop: (stop: Stop) => void;
  onRemoveStop: (stopId: string) => void;
  timeRadiusMinutes: number;
  onTimeRadiusChange: (value: number) => void;
  selectedModes: TransportMode[];
  onToggleMode: (mode: TransportMode) => void;
  onCalculateIsochrones: () => void;
  isLoading: boolean;
  showSettings: boolean;
  onToggleSettings: () => void;
  mapToken?: string;
  onMapTokenChange?: (token: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  stops,
  selectedStops,
  onSelectStop,
  onRemoveStop,
  timeRadiusMinutes,
  onTimeRadiusChange,
  selectedModes,
  onToggleMode,
  onCalculateIsochrones,
  isLoading,
  mapToken = '', // Default value
  onMapTokenChange = () => {}, // Default no-op function
  showSettings,
  onToggleSettings,
}) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Munich Transit Isochrones</CardTitle>
            <CardDescription>Visualize public transport accessibility</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggleSettings}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSettings ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mapbox-token">Map Settings</Label>
              {mapToken !== undefined && onMapTokenChange !== undefined && (
                <Input
                  id="mapbox-token"
                  placeholder="Enter your Mapbox public token here"
                  value={mapToken}
                  onChange={(e) => onMapTokenChange(e.target.value)}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Using OpenStreetMap - free and open data
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Transit Stops</Label>
              <StopSelector
                stops={stops}
                selectedStops={selectedStops}
                onSelectStop={onSelectStop}
                onRemoveStop={onRemoveStop}
                isLoading={isLoading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="time-radius">Time Radius (minutes)</Label>
                <span className="text-sm font-medium">{timeRadiusMinutes} min</span>
              </div>
              <Slider
                id="time-radius"
                min={5}
                max={60}
                step={5}
                defaultValue={[timeRadiusMinutes]}
                onValueChange={(values) => onTimeRadiusChange(values[0])}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Transport Modes</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'bus', label: 'Bus' },
                  { id: 'subway', label: 'Subway' },
                  { id: 'tram', label: 'Tram' },
                  { id: 'rail', label: 'Rail' },
                ].map((mode) => (
                  <div 
                    key={mode.id} 
                    className="flex items-center space-x-2 rounded-md border p-2"
                  >
                    <Switch
                      id={`mode-${mode.id}`}
                      checked={selectedModes.includes(mode.id as TransportMode)}
                      onCheckedChange={() => onToggleMode(mode.id as TransportMode)}
                      disabled={isLoading}
                    />
                    <Label htmlFor={`mode-${mode.id}`} className="cursor-pointer">
                      {mode.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={onCalculateIsochrones}
              disabled={selectedStops.length === 0 || selectedModes.length === 0 || isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                'Calculate Isochrones'
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ControlPanel;
