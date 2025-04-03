
import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Stop } from '@/types/gtfs';

interface StopSelectorProps {
  stops: Stop[];
  selectedStops: Stop[];
  onSelectStop: (stop: Stop) => void;
  onRemoveStop: (stopId: string) => void;
  isLoading: boolean;
}

export function StopSelector({
  stops,
  selectedStops,
  onSelectStop,
  onRemoveStop,
  isLoading,
}: StopSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filteredStops, setFilteredStops] = useState<Stop[]>([]);

  // Filter stops based on search input
  useEffect(() => {
    if (!search || search.length < 2) {
      setFilteredStops([]);
      return;
    }

    const searchLower = search.toLowerCase();
    const filtered = stops
      .filter(stop => 
        stop.stop_name.toLowerCase().includes(searchLower) ||
        stop.stop_id.toLowerCase().includes(searchLower)
      )
      .slice(0, 50); // Limit to 50 results for performance

    setFilteredStops(filtered);
  }, [search, stops]);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={isLoading}
          >
            <span className="truncate">Select transit stops...</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search for a stop..." 
              value={search}
              onValueChange={setSearch}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>
                {search.length < 2 ? (
                  "Type at least 2 characters to search..."
                ) : (
                  "No transit stops found."
                )}
              </CommandEmpty>
              <CommandGroup>
                {filteredStops.map((stop) => {
                  const isSelected = selectedStops.some(s => s.stop_id === stop.stop_id);
                  return (
                    <CommandItem
                      key={stop.stop_id}
                      value={stop.stop_name}
                      onSelect={() => {
                        if (!isSelected) {
                          onSelectStop(stop);
                        }
                        setOpen(false);
                        setSearch('');
                      }}
                      disabled={isSelected}
                      className={cn(
                        isSelected && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span>{stop.stop_name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">({stop.stop_id})</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedStops.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedStops.map((stop) => (
            <Badge
              key={stop.stop_id}
              variant="secondary"
              className="flex items-center gap-1 py-1.5"
            >
              {stop.stop_name}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-1"
                onClick={() => onRemoveStop(stop.stop_id)}
                disabled={isLoading}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove</span>
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
