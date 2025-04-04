
/**
 * Utilities for handling GTFS time formats and calculations
 */

/**
 * Parse GTFS time format (HH:MM:SS) to minutes past midnight
 * 
 * @param timeStr - Time string in HH:MM:SS format
 * @returns Time in minutes past midnight
 */
export const parseTimeToMinutes = (timeStr: string): number => {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours * 60 + minutes + (seconds ? seconds / 60 : 0);
};

/**
 * Format minutes past midnight to GTFS time format (HH:MM:SS)
 * 
 * @param minutes - Time in minutes past midnight
 * @returns Formatted time string
 */
export const formatMinutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
