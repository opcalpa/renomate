/**
 * Formatting utilities for canvas measurements
 * Handles conversion between internal mm storage and display formats
 */

export type Unit = 'mm' | 'cm' | 'm';
export type Scale = '1:20' | '1:50' | '1:100' | '1:500';

/**
 * Format a millimeter value to display string based on unit preference
 * @param valueMM - Value in millimeters (always stored in mm in database)
 * @param unit - Display unit preference
 * @param decimals - Number of decimal places
 */
export function formatMeasurement(
  valueMM: number,
  unit: Unit,
  decimals: number = 2
): string {
  switch (unit) {
    case 'mm':
      return `${Math.round(valueMM)} mm`;
    case 'cm':
      return `${(valueMM / 10).toFixed(decimals)} cm`;
    case 'm':
      return `${(valueMM / 1000).toFixed(decimals)} m`;
    default:
      return `${valueMM} mm`;
  }
}

/**
 * Format area (square millimeters) to display string
 */
export function formatArea(
  areaMM2: number,
  unit: Unit,
  decimals: number = 2
): string {
  switch (unit) {
    case 'mm':
      return `${Math.round(areaMM2)} mm²`;
    case 'cm':
      return `${(areaMM2 / 100).toFixed(decimals)} cm²`;
    case 'm':
      return `${(areaMM2 / 1000000).toFixed(decimals)} m²`;
    default:
      return `${areaMM2} mm²`;
  }
}

/**
 * Parse user input string to millimeters
 * Supports formats like: "100", "10cm", "1.5m", "1500mm"
 */
export function parseToMillimeters(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  
  // Extract number and unit
  const match = trimmed.match(/^([\d.]+)\s*(mm|cm|m)?$/);
  if (!match) return null;
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'mm'; // Default to mm if no unit
  
  switch (unit) {
    case 'mm':
      return value;
    case 'cm':
      return value * 10;
    case 'm':
      return value * 1000;
    default:
      return value;
  }
}

/**
 * Get scale factor for visual density
 * Affects line weights, text sizes, etc.
 */
export function getScaleFactor(scale: Scale): number {
  switch (scale) {
    case '1:20':
      return 1.5; // Larger details, thicker lines
    case '1:50':
      return 1.2;
    case '1:100':
      return 1.0; // Default
    case '1:500':
      return 0.7; // Smaller details, thinner lines
    default:
      return 1.0;
  }
}

/**
 * Get pixels per millimeter based on scale
 * This affects visual rendering but NOT coordinates
 */
export function getPixelsPerMM(scale: Scale): number {
  switch (scale) {
    case '1:20':
      return 0.5; // 1px = 2mm
    case '1:50':
      return 0.2; // 1px = 5mm
    case '1:100':
      return 0.1; // 1px = 10mm
    case '1:500':
      return 0.02; // 1px = 50mm
    default:
      return 0.1;
  }
}

/**
 * Get recommended grid interval for a scale
 * Returns value in millimeters
 */
export function getDefaultGridInterval(scale: Scale): number {
  switch (scale) {
    case '1:20':
      return 100; // 10cm grid for detailed work
    case '1:50':
      return 250; // 25cm grid
    case '1:100':
      return 500; // 50cm grid (default)
    case '1:500':
      return 2000; // 2m grid for large areas
    default:
      return 500;
  }
}

/**
 * Get grid levels for multi-scale grids
 * Returns array of grid configurations
 */
export function getGridLevels(
  baseInterval: number,
  scale: Scale
): Array<{ interval: number; color: string; lineWidth: number; opacity: number }> {
  const scaleFactor = getScaleFactor(scale);
  
  return [
    // Fine grid (base interval)
    {
      interval: baseInterval,
      color: '#e0e0e0',
      lineWidth: 0.5 * scaleFactor,
      opacity: 0.3,
    },
    // Medium grid (5x base)
    {
      interval: baseInterval * 5,
      color: '#bdbdbd',
      lineWidth: 0.8 * scaleFactor,
      opacity: 0.5,
    },
    // Major grid (10x base)
    {
      interval: baseInterval * 10,
      color: '#9e9e9e',
      lineWidth: 1.2 * scaleFactor,
      opacity: 0.7,
    },
  ];
}
