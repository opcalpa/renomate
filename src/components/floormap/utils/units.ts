import { Unit } from '../types';

// Conversion factors to mm
const UNIT_TO_MM: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  inch: 25.4,
};

// Conversion factors from mm
const MM_TO_UNIT: Record<Unit, number> = {
  mm: 1,
  cm: 0.1,
  m: 0.001,
  inch: 0.0393701,
};

/**
 * Convert from mm to specified unit
 */
export const convertFromMM = (valueMM: number, toUnit: Unit): number => {
  return valueMM * MM_TO_UNIT[toUnit];
};

/**
 * Convert from specified unit to mm
 */
export const convertToMM = (value: number, fromUnit: Unit): number => {
  return value * UNIT_TO_MM[fromUnit];
};

/**
 * Format value with unit
 */
export const formatWithUnit = (valueMM: number, unit: Unit, decimals: number = 1): string => {
  const converted = convertFromMM(valueMM, unit);
  return `${converted.toFixed(decimals)}${unit}`;
};

/**
 * Get unit display name
 */
export const getUnitDisplayName = (unit: Unit): string => {
  const names: Record<Unit, string> = {
    mm: 'Millimeters',
    cm: 'Centimeters',
    m: 'Meters',
    inch: 'Inches',
  };
  return names[unit];
};

/**
 * Get default grid size for unit (in mm)
 */
export const getDefaultGridSize = (unit: Unit): number => {
  const defaults: Record<Unit, number> = {
    mm: 100, // 100mm
    cm: 100, // 10cm = 100mm
    m: 1000, // 1m = 1000mm
    inch: 254, // 10 inches ≈ 254mm
  };
  return defaults[unit];
};
