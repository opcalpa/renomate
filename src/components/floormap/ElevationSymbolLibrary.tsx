/**
 * ELEVATION SYMBOL LIBRARY
 *
 * Professional 2D architectural symbols for elevation/side-view drawings.
 * All symbols are designed for wall-mounted or side-view perspective.
 *
 * Typical dimensions for Swedish residential construction:
 * - Standard wall height: 2400mm
 * - Door height: 2100mm
 * - Window sill height: 900mm
 * - Window height: 1200mm
 * - Outlet height from floor: 200mm (standard), 1200mm (kitchen counter)
 * - Switch height from floor: 1000mm
 * - Wall cabinet bottom: 1400mm from floor
 * - Base cabinet height: 720mm
 *
 * All coordinates in millimeters relative to symbol origin (top-left).
 */

import React from 'react';
import { Group, Line, Rect, Circle, Arc, Path, Text as KonvaText } from 'react-konva';

// ============================================================================
// SYMBOL TYPES & INTERFACES
// ============================================================================

export type ElevationSymbolType =
  // Openings
  | 'window_standard'
  | 'window_double'
  | 'window_triple'
  | 'door_standard'
  | 'door_double'
  | 'door_sliding'
  | 'wall_opening'
  | 'arch_opening'
  // Electrical
  | 'outlet_single'
  | 'outlet_double'
  | 'outlet_usb'
  | 'switch_single'
  | 'switch_double'
  | 'switch_dimmer'
  | 'thermostat'
  // Lighting
  | 'wall_lamp'
  | 'wall_sconce'
  | 'ceiling_lamp'
  | 'pendant_lamp'
  | 'spotlight'
  | 'led_strip'
  // Kitchen
  | 'cabinet_base'
  | 'cabinet_wall'
  | 'cabinet_tall'
  | 'range_hood'
  | 'countertop'
  // Trim & Molding
  | 'skirting'
  | 'crown_molding'
  | 'chair_rail'
  | 'picture_rail'
  // HVAC & Utilities
  | 'radiator'
  | 'vent_grille'
  | 'vent_round'
  | 'smoke_detector'
  | 'co_detector'
  // Furniture hints
  | 'shelf'
  | 'mirror';

export interface ElevationSymbolDefinition {
  type: ElevationSymbolType;
  name: string;
  nameSv: string;
  description: string;
  descriptionSv: string;
  category: 'openings' | 'electrical' | 'lighting' | 'kitchen' | 'trim' | 'hvac' | 'furniture';
  defaultWidth: number;  // mm
  defaultHeight: number; // mm
  // Typical installation height from floor (mm)
  typicalHeightFromFloor?: number;
  // Material/finish notes
  materialNotes?: string;
}

export interface ElevationSymbolProps {
  x?: number;
  y?: number;
  width: number;
  height: number;
  rotation?: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  opacity?: number;
}

// ============================================================================
// SYMBOL DEFINITIONS (metadata)
// ============================================================================

export const ELEVATION_SYMBOL_DEFINITIONS: ElevationSymbolDefinition[] = [
  // Openings
  {
    type: 'window_standard',
    name: 'Standard Window',
    nameSv: 'Standardfönster',
    description: 'Single casement window with frame',
    descriptionSv: 'Enkelluft fönster med karm',
    category: 'openings',
    defaultWidth: 1000,
    defaultHeight: 1200,
    typicalHeightFromFloor: 900,
    materialNotes: 'Trä eller aluminium karm',
  },
  {
    type: 'window_double',
    name: 'Double Window',
    nameSv: 'Tvåluftsfönster',
    description: 'Double casement window',
    descriptionSv: 'Tvåluft fönster',
    category: 'openings',
    defaultWidth: 1400,
    defaultHeight: 1200,
    typicalHeightFromFloor: 900,
  },
  {
    type: 'window_triple',
    name: 'Triple Window',
    nameSv: 'Treluftsfönster',
    description: 'Triple casement window',
    descriptionSv: 'Treluft fönster',
    category: 'openings',
    defaultWidth: 2100,
    defaultHeight: 1200,
    typicalHeightFromFloor: 900,
  },
  {
    type: 'door_standard',
    name: 'Standard Door',
    nameSv: 'Standarddörr',
    description: 'Single swing door with frame',
    descriptionSv: 'Enkeldörr med karm',
    category: 'openings',
    defaultWidth: 900,
    defaultHeight: 2100,
    typicalHeightFromFloor: 0,
  },
  {
    type: 'door_double',
    name: 'Double Door',
    nameSv: 'Pardörr',
    description: 'Double swing doors',
    descriptionSv: 'Pardörrar',
    category: 'openings',
    defaultWidth: 1600,
    defaultHeight: 2100,
    typicalHeightFromFloor: 0,
  },
  {
    type: 'door_sliding',
    name: 'Sliding Door',
    nameSv: 'Skjutdörr',
    description: 'Sliding glass door',
    descriptionSv: 'Skjutdörr i glas',
    category: 'openings',
    defaultWidth: 2000,
    defaultHeight: 2100,
    typicalHeightFromFloor: 0,
  },
  {
    type: 'wall_opening',
    name: 'Wall Opening',
    nameSv: 'Väggöppning',
    description: 'Pass-through opening without door',
    descriptionSv: 'Genomgång utan dörr',
    category: 'openings',
    defaultWidth: 1000,
    defaultHeight: 2100,
    typicalHeightFromFloor: 0,
  },
  {
    type: 'arch_opening',
    name: 'Arch Opening',
    nameSv: 'Bågöppning',
    description: 'Arched pass-through',
    descriptionSv: 'Valvformad öppning',
    category: 'openings',
    defaultWidth: 1000,
    defaultHeight: 2200,
    typicalHeightFromFloor: 0,
  },

  // Electrical
  {
    type: 'outlet_single',
    name: 'Single Outlet',
    nameSv: 'Enkelt eluttag',
    description: 'Standard Swedish outlet (Type F)',
    descriptionSv: 'Standard eluttag (Schuko)',
    category: 'electrical',
    defaultWidth: 80,
    defaultHeight: 80,
    typicalHeightFromFloor: 200,
  },
  {
    type: 'outlet_double',
    name: 'Double Outlet',
    nameSv: 'Dubbelt eluttag',
    description: 'Dual outlets',
    descriptionSv: 'Dubbeluttag',
    category: 'electrical',
    defaultWidth: 150,
    defaultHeight: 80,
    typicalHeightFromFloor: 200,
  },
  {
    type: 'outlet_usb',
    name: 'USB Outlet',
    nameSv: 'USB-uttag',
    description: 'Outlet with USB charging ports',
    descriptionSv: 'Eluttag med USB-laddning',
    category: 'electrical',
    defaultWidth: 80,
    defaultHeight: 80,
    typicalHeightFromFloor: 200,
  },
  {
    type: 'switch_single',
    name: 'Single Switch',
    nameSv: 'Enkelbrytare',
    description: 'Single light switch',
    descriptionSv: 'Enkel strömbrytare',
    category: 'electrical',
    defaultWidth: 80,
    defaultHeight: 80,
    typicalHeightFromFloor: 1000,
  },
  {
    type: 'switch_double',
    name: 'Double Switch',
    nameSv: 'Dubbelbrytare',
    description: 'Double light switch',
    descriptionSv: 'Dubbel strömbrytare',
    category: 'electrical',
    defaultWidth: 80,
    defaultHeight: 140,
    typicalHeightFromFloor: 1000,
  },
  {
    type: 'switch_dimmer',
    name: 'Dimmer Switch',
    nameSv: 'Dimmer',
    description: 'Rotary or touch dimmer',
    descriptionSv: 'Ljusdimmer',
    category: 'electrical',
    defaultWidth: 80,
    defaultHeight: 80,
    typicalHeightFromFloor: 1000,
  },
  {
    type: 'thermostat',
    name: 'Thermostat',
    nameSv: 'Termostat',
    description: 'Room temperature control',
    descriptionSv: 'Rumstemperaturregulator',
    category: 'electrical',
    defaultWidth: 80,
    defaultHeight: 120,
    typicalHeightFromFloor: 1500,
  },

  // Lighting
  {
    type: 'wall_lamp',
    name: 'Wall Lamp',
    nameSv: 'Vägglampa',
    description: 'Wall-mounted light fixture',
    descriptionSv: 'Väggmonterad belysning',
    category: 'lighting',
    defaultWidth: 200,
    defaultHeight: 300,
    typicalHeightFromFloor: 1800,
  },
  {
    type: 'wall_sconce',
    name: 'Wall Sconce',
    nameSv: 'Väggplafond',
    description: 'Decorative wall sconce',
    descriptionSv: 'Dekorativ vägglampa',
    category: 'lighting',
    defaultWidth: 150,
    defaultHeight: 200,
    typicalHeightFromFloor: 1700,
  },
  {
    type: 'ceiling_lamp',
    name: 'Ceiling Lamp',
    nameSv: 'Taklampa',
    description: 'Ceiling-mounted fixture',
    descriptionSv: 'Takmonterad armatur',
    category: 'lighting',
    defaultWidth: 400,
    defaultHeight: 100,
    typicalHeightFromFloor: 2400,
  },
  {
    type: 'pendant_lamp',
    name: 'Pendant Lamp',
    nameSv: 'Pendellampa',
    description: 'Hanging pendant light',
    descriptionSv: 'Hängande taklampa',
    category: 'lighting',
    defaultWidth: 300,
    defaultHeight: 500,
    typicalHeightFromFloor: 2000,
  },
  {
    type: 'spotlight',
    name: 'Spotlight',
    nameSv: 'Spotlight',
    description: 'Recessed or surface spotlight',
    descriptionSv: 'Infälld eller påbygd spot',
    category: 'lighting',
    defaultWidth: 100,
    defaultHeight: 100,
    typicalHeightFromFloor: 2400,
  },
  {
    type: 'led_strip',
    name: 'LED Strip',
    nameSv: 'LED-list',
    description: 'Linear LED lighting',
    descriptionSv: 'LED-strip belysning',
    category: 'lighting',
    defaultWidth: 1000,
    defaultHeight: 20,
    typicalHeightFromFloor: 2350,
  },

  // Kitchen
  {
    type: 'cabinet_base',
    name: 'Base Cabinet',
    nameSv: 'Köksskåp stående',
    description: 'Floor-standing kitchen cabinet',
    descriptionSv: 'Golvstående köksskåp',
    category: 'kitchen',
    defaultWidth: 600,
    defaultHeight: 720,
    typicalHeightFromFloor: 0,
    materialNotes: 'Standard depth: 560mm',
  },
  {
    type: 'cabinet_wall',
    name: 'Wall Cabinet',
    nameSv: 'Köksskåp vägg',
    description: 'Wall-mounted kitchen cabinet',
    descriptionSv: 'Väggmonterat överskåp',
    category: 'kitchen',
    defaultWidth: 600,
    defaultHeight: 700,
    typicalHeightFromFloor: 1400,
    materialNotes: 'Standard depth: 320mm',
  },
  {
    type: 'cabinet_tall',
    name: 'Tall Cabinet',
    nameSv: 'Högskåp',
    description: 'Full-height cabinet',
    descriptionSv: 'Högskåp för kyl/frys',
    category: 'kitchen',
    defaultWidth: 600,
    defaultHeight: 2100,
    typicalHeightFromFloor: 0,
  },
  {
    type: 'range_hood',
    name: 'Range Hood',
    nameSv: 'Köksfläkt',
    description: 'Exhaust hood over stove',
    descriptionSv: 'Spiskåpa',
    category: 'kitchen',
    defaultWidth: 600,
    defaultHeight: 400,
    typicalHeightFromFloor: 1500,
  },
  {
    type: 'countertop',
    name: 'Countertop',
    nameSv: 'Bänkskiva',
    description: 'Kitchen countertop edge',
    descriptionSv: 'Köks bänkskiva',
    category: 'kitchen',
    defaultWidth: 1000,
    defaultHeight: 40,
    typicalHeightFromFloor: 850,
    materialNotes: 'Laminat, sten, eller massivträ',
  },

  // Trim & Molding
  {
    type: 'skirting',
    name: 'Skirting Board',
    nameSv: 'Sockel/Golvlist',
    description: 'Baseboard/skirting',
    descriptionSv: 'Golvlist',
    category: 'trim',
    defaultWidth: 1000,
    defaultHeight: 100,
    typicalHeightFromFloor: 0,
    materialNotes: 'MDF eller massivträ',
  },
  {
    type: 'crown_molding',
    name: 'Crown Molding',
    nameSv: 'Taklist',
    description: 'Ceiling cornice',
    descriptionSv: 'Takfotlist',
    category: 'trim',
    defaultWidth: 1000,
    defaultHeight: 80,
    typicalHeightFromFloor: 2320,
  },
  {
    type: 'chair_rail',
    name: 'Chair Rail',
    nameSv: 'Bröstlist',
    description: 'Wall protection molding',
    descriptionSv: 'Dekorlist på vägg',
    category: 'trim',
    defaultWidth: 1000,
    defaultHeight: 60,
    typicalHeightFromFloor: 900,
  },
  {
    type: 'picture_rail',
    name: 'Picture Rail',
    nameSv: 'Tavellist',
    description: 'Rail for hanging pictures',
    descriptionSv: 'List för upphängning',
    category: 'trim',
    defaultWidth: 1000,
    defaultHeight: 40,
    typicalHeightFromFloor: 2000,
  },

  // HVAC & Utilities
  {
    type: 'radiator',
    name: 'Radiator',
    nameSv: 'Radiator',
    description: 'Panel radiator',
    descriptionSv: 'Panelradiator',
    category: 'hvac',
    defaultWidth: 800,
    defaultHeight: 600,
    typicalHeightFromFloor: 100,
  },
  {
    type: 'vent_grille',
    name: 'Vent Grille',
    nameSv: 'Ventilationsgaller',
    description: 'Rectangular vent cover',
    descriptionSv: 'Rektangulärt ventilationsgaller',
    category: 'hvac',
    defaultWidth: 300,
    defaultHeight: 150,
    typicalHeightFromFloor: 2200,
  },
  {
    type: 'vent_round',
    name: 'Round Vent',
    nameSv: 'Rundventil',
    description: 'Circular supply/extract vent',
    descriptionSv: 'Rund ventil',
    category: 'hvac',
    defaultWidth: 125,
    defaultHeight: 125,
    typicalHeightFromFloor: 2200,
  },
  {
    type: 'smoke_detector',
    name: 'Smoke Detector',
    nameSv: 'Brandvarnare',
    description: 'Ceiling smoke detector',
    descriptionSv: 'Brandvarnare i tak',
    category: 'hvac',
    defaultWidth: 120,
    defaultHeight: 50,
    typicalHeightFromFloor: 2350,
  },
  {
    type: 'co_detector',
    name: 'CO Detector',
    nameSv: 'Koloxidvarnare',
    description: 'Carbon monoxide detector',
    descriptionSv: 'CO-varnare',
    category: 'hvac',
    defaultWidth: 120,
    defaultHeight: 50,
    typicalHeightFromFloor: 1500,
  },

  // Furniture hints
  {
    type: 'shelf',
    name: 'Shelf',
    nameSv: 'Hylla',
    description: 'Wall-mounted shelf',
    descriptionSv: 'Väggmonterad hylla',
    category: 'furniture',
    defaultWidth: 800,
    defaultHeight: 30,
    typicalHeightFromFloor: 1200,
  },
  {
    type: 'mirror',
    name: 'Mirror',
    nameSv: 'Spegel',
    description: 'Wall mirror',
    descriptionSv: 'Väggspegel',
    category: 'furniture',
    defaultWidth: 600,
    defaultHeight: 800,
    typicalHeightFromFloor: 1000,
  },
];

// ============================================================================
// SYMBOL RENDERING COMPONENTS
// ============================================================================

// Window - side view showing frame, glass, and sill
export const WindowStandard: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#e0f2fe', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Outer frame */}
    <Rect x={0} y={0} width={width} height={height} stroke={strokeColor} strokeWidth={strokeWidth * 1.5} fill="transparent" />
    {/* Glass pane */}
    <Rect x={strokeWidth * 3} y={strokeWidth * 3} width={width - strokeWidth * 6} height={height - strokeWidth * 6} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth * 0.5} />
    {/* Horizontal mullion */}
    <Line points={[0, height / 2, width, height / 2]} stroke={strokeColor} strokeWidth={strokeWidth} />
    {/* Sill at bottom */}
    <Rect x={-10} y={height} width={width + 20} height={15} fill="#d1d5db" stroke={strokeColor} strokeWidth={1} />
  </Group>
);

// Double window
export const WindowDouble: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#e0f2fe', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Outer frame */}
    <Rect x={0} y={0} width={width} height={height} stroke={strokeColor} strokeWidth={strokeWidth * 1.5} fill="transparent" />
    {/* Left pane */}
    <Rect x={strokeWidth * 2} y={strokeWidth * 2} width={width / 2 - strokeWidth * 3} height={height - strokeWidth * 4} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth * 0.5} />
    {/* Right pane */}
    <Rect x={width / 2 + strokeWidth} y={strokeWidth * 2} width={width / 2 - strokeWidth * 3} height={height - strokeWidth * 4} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth * 0.5} />
    {/* Center mullion */}
    <Line points={[width / 2, 0, width / 2, height]} stroke={strokeColor} strokeWidth={strokeWidth * 1.5} />
    {/* Sill */}
    <Rect x={-10} y={height} width={width + 20} height={15} fill="#d1d5db" stroke={strokeColor} strokeWidth={1} />
  </Group>
);

// Standard door - elevation view
export const DoorStandard: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#f9fafb', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Door frame */}
    <Rect x={0} y={0} width={width} height={height} stroke={strokeColor} strokeWidth={strokeWidth * 2} fill="transparent" />
    {/* Door panel */}
    <Rect x={strokeWidth * 2} y={strokeWidth * 2} width={width - strokeWidth * 4} height={height - strokeWidth * 4} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
    {/* Panel details - 4 panels */}
    <Rect x={width * 0.1} y={height * 0.05} width={width * 0.35} height={height * 0.25} stroke={strokeColor} strokeWidth={1} fill="transparent" />
    <Rect x={width * 0.55} y={height * 0.05} width={width * 0.35} height={height * 0.25} stroke={strokeColor} strokeWidth={1} fill="transparent" />
    <Rect x={width * 0.1} y={height * 0.35} width={width * 0.35} height={height * 0.5} stroke={strokeColor} strokeWidth={1} fill="transparent" />
    <Rect x={width * 0.55} y={height * 0.35} width={width * 0.35} height={height * 0.5} stroke={strokeColor} strokeWidth={1} fill="transparent" />
    {/* Door handle */}
    <Circle x={width * 0.85} y={height * 0.5} radius={width * 0.04} fill={strokeColor} />
  </Group>
);

// Wall opening (no door)
export const WallOpening: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Opening outline */}
    <Rect x={0} y={0} width={width} height={height} stroke={strokeColor} strokeWidth={strokeWidth} fill="transparent" dash={[10, 5]} />
    {/* Corner markers */}
    <Line points={[0, 0, 20, 0]} stroke={strokeColor} strokeWidth={strokeWidth} />
    <Line points={[0, 0, 0, 20]} stroke={strokeColor} strokeWidth={strokeWidth} />
    <Line points={[width, 0, width - 20, 0]} stroke={strokeColor} strokeWidth={strokeWidth} />
    <Line points={[width, 0, width, 20]} stroke={strokeColor} strokeWidth={strokeWidth} />
    <Line points={[0, height, 20, height]} stroke={strokeColor} strokeWidth={strokeWidth} />
    <Line points={[0, height, 0, height - 20]} stroke={strokeColor} strokeWidth={strokeWidth} />
    <Line points={[width, height, width - 20, height]} stroke={strokeColor} strokeWidth={strokeWidth} />
    <Line points={[width, height, width, height - 20]} stroke={strokeColor} strokeWidth={strokeWidth} />
  </Group>
);

// Single electrical outlet
export const OutletSingle: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#ffffff', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Outer frame/plate */}
    <Rect x={0} y={0} width={width} height={height} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} cornerRadius={4} />
    {/* Outlet socket (Schuko style) */}
    <Circle x={width / 2} y={height / 2} radius={width * 0.35} stroke={strokeColor} strokeWidth={strokeWidth} fill="transparent" />
    {/* Socket holes */}
    <Circle x={width * 0.35} y={height / 2} radius={width * 0.08} fill={strokeColor} />
    <Circle x={width * 0.65} y={height / 2} radius={width * 0.08} fill={strokeColor} />
    {/* Ground pin */}
    <Line points={[width / 2, height * 0.25, width / 2, height * 0.35]} stroke={strokeColor} strokeWidth={strokeWidth * 1.5} />
    <Line points={[width / 2, height * 0.65, width / 2, height * 0.75]} stroke={strokeColor} strokeWidth={strokeWidth * 1.5} />
  </Group>
);

// Double outlet
export const OutletDouble: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#ffffff', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Outer frame/plate */}
    <Rect x={0} y={0} width={width} height={height} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} cornerRadius={4} />
    {/* Left socket */}
    <Circle x={width * 0.28} y={height / 2} radius={height * 0.35} stroke={strokeColor} strokeWidth={strokeWidth} fill="transparent" />
    <Circle x={width * 0.2} y={height / 2} radius={height * 0.08} fill={strokeColor} />
    <Circle x={width * 0.36} y={height / 2} radius={height * 0.08} fill={strokeColor} />
    {/* Right socket */}
    <Circle x={width * 0.72} y={height / 2} radius={height * 0.35} stroke={strokeColor} strokeWidth={strokeWidth} fill="transparent" />
    <Circle x={width * 0.64} y={height / 2} radius={height * 0.08} fill={strokeColor} />
    <Circle x={width * 0.8} y={height / 2} radius={height * 0.08} fill={strokeColor} />
  </Group>
);

// Light switch
export const SwitchSingle: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#ffffff', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Outer frame */}
    <Rect x={0} y={0} width={width} height={height} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} cornerRadius={4} />
    {/* Switch rocker */}
    <Rect x={width * 0.15} y={height * 0.15} width={width * 0.7} height={height * 0.7} fill="#f3f4f6" stroke={strokeColor} strokeWidth={strokeWidth * 0.75} cornerRadius={2} />
    {/* Indicator line */}
    <Line points={[width / 2, height * 0.3, width / 2, height * 0.5]} stroke={strokeColor} strokeWidth={strokeWidth} />
  </Group>
);

// Wall lamp
export const WallLamp: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#fef3c7', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Backplate */}
    <Rect x={width * 0.35} y={0} width={width * 0.3} height={height * 0.15} fill="#d1d5db" stroke={strokeColor} strokeWidth={strokeWidth} cornerRadius={2} />
    {/* Arm */}
    <Line points={[width / 2, height * 0.15, width / 2, height * 0.35]} stroke={strokeColor} strokeWidth={strokeWidth * 1.5} />
    {/* Shade (trapezoid) */}
    <Line points={[width * 0.15, height * 0.35, width * 0.85, height * 0.35, width * 0.7, height, width * 0.3, height, width * 0.15, height * 0.35]} stroke={strokeColor} strokeWidth={strokeWidth} fill={fillColor} closed />
    {/* Light rays */}
    <Line points={[width * 0.1, height * 0.7, 0, height * 0.8]} stroke="#fbbf24" strokeWidth={1} dash={[3, 3]} />
    <Line points={[width * 0.9, height * 0.7, width, height * 0.8]} stroke="#fbbf24" strokeWidth={1} dash={[3, 3]} />
    <Line points={[width / 2, height, width / 2, height + 30]} stroke="#fbbf24" strokeWidth={1} dash={[3, 3]} />
  </Group>
);

// Ceiling lamp (seen from side)
export const CeilingLamp: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#ffffff', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Ceiling line */}
    <Line points={[0, 0, width, 0]} stroke={strokeColor} strokeWidth={1} dash={[5, 5]} />
    {/* Canopy */}
    <Rect x={width * 0.4} y={0} width={width * 0.2} height={height * 0.15} fill="#d1d5db" stroke={strokeColor} strokeWidth={strokeWidth} />
    {/* Fixture body */}
    <Rect x={width * 0.2} y={height * 0.15} width={width * 0.6} height={height * 0.85} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} cornerRadius={4} />
  </Group>
);

// Pendant lamp
export const PendantLamp: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#fef3c7', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Ceiling canopy */}
    <Rect x={width * 0.4} y={0} width={width * 0.2} height={height * 0.05} fill="#d1d5db" stroke={strokeColor} strokeWidth={strokeWidth} />
    {/* Cord */}
    <Line points={[width / 2, height * 0.05, width / 2, height * 0.3]} stroke={strokeColor} strokeWidth={strokeWidth * 0.75} />
    {/* Shade (dome shape) */}
    <Arc x={width / 2} y={height * 0.45} innerRadius={0} outerRadius={width * 0.45} angle={180} rotation={0} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
    {/* Bulb hint */}
    <Circle x={width / 2} y={height * 0.5} radius={width * 0.1} fill="#fbbf24" opacity={0.5} />
    {/* Light rays */}
    <Line points={[width * 0.2, height * 0.7, width * 0.1, height]} stroke="#fbbf24" strokeWidth={1} dash={[3, 3]} />
    <Line points={[width * 0.8, height * 0.7, width * 0.9, height]} stroke="#fbbf24" strokeWidth={1} dash={[3, 3]} />
    <Line points={[width / 2, height * 0.65, width / 2, height]} stroke="#fbbf24" strokeWidth={1} dash={[3, 3]} />
  </Group>
);

// Base cabinet (kitchen)
export const CabinetBase: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#f9fafb', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Cabinet body */}
    <Rect x={0} y={0} width={width} height={height} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
    {/* Door panel */}
    <Rect x={strokeWidth * 2} y={strokeWidth * 2} width={width - strokeWidth * 4} height={height * 0.75} stroke={strokeColor} strokeWidth={strokeWidth * 0.75} fill="transparent" />
    {/* Drawer */}
    <Rect x={strokeWidth * 2} y={height * 0.8} width={width - strokeWidth * 4} height={height * 0.15} stroke={strokeColor} strokeWidth={strokeWidth * 0.75} fill="transparent" />
    {/* Handle */}
    <Line points={[width * 0.4, height * 0.4, width * 0.6, height * 0.4]} stroke={strokeColor} strokeWidth={strokeWidth * 1.5} lineCap="round" />
    <Line points={[width * 0.4, height * 0.87, width * 0.6, height * 0.87]} stroke={strokeColor} strokeWidth={strokeWidth * 1.5} lineCap="round" />
    {/* Toe kick */}
    <Rect x={strokeWidth} y={height} width={width - strokeWidth * 2} height={30} fill="#e5e7eb" stroke={strokeColor} strokeWidth={1} />
  </Group>
);

// Wall cabinet (kitchen)
export const CabinetWall: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#f9fafb', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Cabinet body */}
    <Rect x={0} y={0} width={width} height={height} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
    {/* Door panel */}
    <Rect x={strokeWidth * 2} y={strokeWidth * 2} width={width - strokeWidth * 4} height={height - strokeWidth * 4} stroke={strokeColor} strokeWidth={strokeWidth * 0.75} fill="transparent" />
    {/* Handle */}
    <Line points={[width * 0.4, height * 0.85, width * 0.6, height * 0.85]} stroke={strokeColor} strokeWidth={strokeWidth * 1.5} lineCap="round" />
  </Group>
);

// Skirting board
export const Skirting: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#ffffff', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Skirting profile */}
    <Rect x={0} y={0} width={width} height={height} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
    {/* Profile detail - top edge */}
    <Line points={[0, height * 0.15, width, height * 0.15]} stroke={strokeColor} strokeWidth={1} />
    {/* Floor line */}
    <Line points={[0, height, width, height]} stroke={strokeColor} strokeWidth={strokeWidth * 0.5} />
  </Group>
);

// Crown molding
export const CrownMolding: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#ffffff', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Ceiling line */}
    <Line points={[0, 0, width, 0]} stroke={strokeColor} strokeWidth={1} dash={[5, 5]} />
    {/* Molding profile */}
    <Line points={[0, 0, 0, height * 0.3, width, height * 0.3, width, 0]} stroke={strokeColor} strokeWidth={strokeWidth} fill={fillColor} closed />
    <Line points={[0, height * 0.3, 0, height, width, height, width, height * 0.3]} stroke={strokeColor} strokeWidth={strokeWidth} fill={fillColor} closed />
    {/* Profile detail */}
    <Line points={[0, height * 0.5, width, height * 0.5]} stroke={strokeColor} strokeWidth={1} />
  </Group>
);

// Radiator
export const Radiator: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#f9fafb', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Outer frame */}
    <Rect x={0} y={0} width={width} height={height} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} cornerRadius={4} />
    {/* Vertical fins */}
    {Array.from({ length: Math.floor(width / 30) }).map((_, i) => (
      <Line key={i} points={[15 + i * 30, 10, 15 + i * 30, height - 10]} stroke={strokeColor} strokeWidth={1} />
    ))}
    {/* Horizontal bars */}
    <Line points={[5, height * 0.2, width - 5, height * 0.2]} stroke={strokeColor} strokeWidth={strokeWidth * 0.75} />
    <Line points={[5, height * 0.8, width - 5, height * 0.8]} stroke={strokeColor} strokeWidth={strokeWidth * 0.75} />
    {/* Valve */}
    <Circle x={width - 15} y={height * 0.5} radius={8} fill="#dc2626" stroke={strokeColor} strokeWidth={1} />
  </Group>
);

// Ventilation grille
export const VentGrille: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#f9fafb', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Outer frame */}
    <Rect x={0} y={0} width={width} height={height} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} cornerRadius={2} />
    {/* Horizontal slats */}
    {Array.from({ length: Math.floor(height / 15) }).map((_, i) => (
      <Line key={i} points={[5, 8 + i * 15, width - 5, 8 + i * 15]} stroke={strokeColor} strokeWidth={strokeWidth * 0.5} />
    ))}
  </Group>
);

// Round vent
export const VentRound: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#f9fafb', strokeWidth = 2, opacity = 1
}) => {
  const radius = Math.min(width, height) / 2;
  return (
    <Group x={x} y={y} opacity={opacity}>
      {/* Outer circle */}
      <Circle x={radius} y={radius} radius={radius} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
      {/* Inner circles */}
      <Circle x={radius} y={radius} radius={radius * 0.7} stroke={strokeColor} strokeWidth={1} fill="transparent" />
      <Circle x={radius} y={radius} radius={radius * 0.4} stroke={strokeColor} strokeWidth={1} fill="transparent" />
      <Circle x={radius} y={radius} radius={radius * 0.15} fill={strokeColor} />
    </Group>
  );
};

// Smoke detector
export const SmokeDetector: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#ffffff', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Ceiling line */}
    <Line points={[0, 0, width, 0]} stroke={strokeColor} strokeWidth={1} dash={[5, 5]} />
    {/* Detector body */}
    <Rect x={0} y={0} width={width} height={height} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} cornerRadius={4} />
    {/* Test button */}
    <Circle x={width / 2} y={height * 0.5} radius={width * 0.15} fill="#ef4444" stroke={strokeColor} strokeWidth={1} />
    {/* LED indicator */}
    <Circle x={width * 0.2} y={height * 0.5} radius={4} fill="#22c55e" />
  </Group>
);

// Shelf
export const Shelf: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#f9fafb', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Shelf board */}
    <Rect x={0} y={0} width={width} height={height} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
    {/* Brackets */}
    <Line points={[width * 0.15, height, width * 0.15, height + 40]} stroke={strokeColor} strokeWidth={strokeWidth} />
    <Line points={[width * 0.15, height + 40, width * 0.1, height + 40]} stroke={strokeColor} strokeWidth={strokeWidth} />
    <Line points={[width * 0.85, height, width * 0.85, height + 40]} stroke={strokeColor} strokeWidth={strokeWidth} />
    <Line points={[width * 0.85, height + 40, width * 0.9, height + 40]} stroke={strokeColor} strokeWidth={strokeWidth} />
  </Group>
);

// Mirror
export const Mirror: React.FC<ElevationSymbolProps> = ({
  x = 0, y = 0, width, height, strokeColor = '#374151', fillColor = '#e0f2fe', strokeWidth = 2, opacity = 1
}) => (
  <Group x={x} y={y} opacity={opacity}>
    {/* Mirror surface */}
    <Rect x={0} y={0} width={width} height={height} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} cornerRadius={2} />
    {/* Frame */}
    <Rect x={strokeWidth} y={strokeWidth} width={width - strokeWidth * 2} height={height - strokeWidth * 2} stroke={strokeColor} strokeWidth={strokeWidth * 0.5} fill="transparent" />
    {/* Reflection hint - diagonal lines */}
    <Line points={[width * 0.1, height * 0.1, width * 0.3, height * 0.05]} stroke="#ffffff" strokeWidth={3} opacity={0.7} lineCap="round" />
    <Line points={[width * 0.15, height * 0.2, width * 0.25, height * 0.1]} stroke="#ffffff" strokeWidth={2} opacity={0.5} lineCap="round" />
  </Group>
);

// ============================================================================
// SYMBOL RENDERER (for use in canvas)
// ============================================================================

export const renderElevationSymbol = (
  type: ElevationSymbolType,
  props: ElevationSymbolProps
): React.ReactNode => {
  switch (type) {
    case 'window_standard':
    case 'window_double':
    case 'window_triple':
      return type === 'window_standard' ? <WindowStandard {...props} /> : <WindowDouble {...props} />;
    case 'door_standard':
    case 'door_double':
    case 'door_sliding':
      return <DoorStandard {...props} />;
    case 'wall_opening':
    case 'arch_opening':
      return <WallOpening {...props} />;
    case 'outlet_single':
    case 'outlet_usb':
      return <OutletSingle {...props} />;
    case 'outlet_double':
      return <OutletDouble {...props} />;
    case 'switch_single':
    case 'switch_double':
    case 'switch_dimmer':
      return <SwitchSingle {...props} />;
    case 'wall_lamp':
    case 'wall_sconce':
      return <WallLamp {...props} />;
    case 'ceiling_lamp':
      return <CeilingLamp {...props} />;
    case 'pendant_lamp':
      return <PendantLamp {...props} />;
    case 'cabinet_base':
    case 'cabinet_tall':
      return <CabinetBase {...props} />;
    case 'cabinet_wall':
      return <CabinetWall {...props} />;
    case 'skirting':
    case 'chair_rail':
    case 'picture_rail':
      return <Skirting {...props} />;
    case 'crown_molding':
      return <CrownMolding {...props} />;
    case 'radiator':
      return <Radiator {...props} />;
    case 'vent_grille':
      return <VentGrille {...props} />;
    case 'vent_round':
      return <VentRound {...props} />;
    case 'smoke_detector':
    case 'co_detector':
      return <SmokeDetector {...props} />;
    case 'shelf':
      return <Shelf {...props} />;
    case 'mirror':
      return <Mirror {...props} />;
    default:
      return null;
  }
};

// Category labels for UI
export const ELEVATION_SYMBOL_CATEGORIES = {
  openings: { name: 'Öppningar', nameSv: 'Öppningar', icon: 'door' },
  electrical: { name: 'El', nameSv: 'El', icon: 'zap' },
  lighting: { name: 'Belysning', nameSv: 'Belysning', icon: 'lightbulb' },
  kitchen: { name: 'Kök', nameSv: 'Kök', icon: 'utensils' },
  trim: { name: 'Lister', nameSv: 'Lister', icon: 'ruler' },
  hvac: { name: 'VVS/Ventilation', nameSv: 'VVS/Ventilation', icon: 'wind' },
  furniture: { name: 'Inredning', nameSv: 'Inredning', icon: 'sofa' },
} as const;
