/**
 * ARCHITECTURAL SYMBOL LIBRARY
 * 
 * Professional 2D architectural symbols for floor plans.
 * All symbols are normalized to 1000x1000mm (1m x 1m) bounding box.
 * 
 * Design principles (based on industry standards):
 * - Top-down 2D perspective only
 * - Clean geometric shapes using Konva primitives
 * - No shadows, gradients, or 3D effects
 * - Stroke width: 2-3px for main lines, 1px for detail lines
 * - All coordinates in millimeters
 * 
 * Scale: 1px = 10mm (1:100 scale by default in our system)
 */

import React from 'react';
import { Group, Line, Circle, Rect, Arc, Path, Ellipse } from 'react-konva';

// ============================================================================
// SYMBOL TYPES & INTERFACES
// ============================================================================

export type ArchSymbolType = 
  // Doors
  | 'door_swing_left'
  | 'door_swing_right'
  | 'door_double'
  | 'door_sliding'
  | 'door_pocket'
  // Windows
  | 'window_standard'
  | 'window_double'
  | 'window_corner'
  // Bathroom
  | 'toilet_standard'
  | 'toilet_wall_hung'
  | 'sink_single'
  | 'sink_double'
  | 'bathtub_standard'
  | 'bathtub_corner'
  | 'shower_square'
  | 'shower_corner'
  // Kitchen
  | 'stove_4burner'
  | 'sink_kitchen'
  | 'refrigerator'
  | 'dishwasher'
  // Furniture
  | 'bed_single'
  | 'bed_double'
  | 'sofa_2seat'
  | 'sofa_3seat'
  | 'sofa_corner'
  | 'table_round'
  | 'table_rectangular'
  | 'chair'
  // Stairs
  | 'stair_straight_up'
  | 'stair_straight_down'
  | 'stair_spiral';

export interface SymbolProps {
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// ============================================================================
// DOOR SYMBOLS
// ============================================================================

/**
 * Standard swing door (opens 90 degrees)
 * Size: 900mm wide × 200mm wall thickness
 * Based on: Reference image showing door with arc swing
 */
export const DoorSwingLeft: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Door frame/wall (thick line) */}
      <Line
        points={[0, 0, 900, 0]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 2}
        lineCap="square"
      />
      
      {/* Door panel (diagonal line from hinge) */}
      <Line
        points={[0, 0, 900, -900]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        lineCap="round"
      />
      
      {/* Door swing arc (90 degrees) */}
      <Arc
        x={0}
        y={0}
        innerRadius={0}
        outerRadius={900}
        angle={90}
        rotation={-90}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        dash={[10, 5]}
      />
    </Group>
  );
};

export const DoorSwingRight: React.FC<SymbolProps> = (props) => {
  return <DoorSwingLeft {...props} rotation={(props.rotation || 0) + 180} />;
};

/**
 * Double swing doors
 * Size: 1800mm wide (2 × 900mm doors)
 */
export const DoorDouble: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Door frame */}
      <Line
        points={[0, 0, 1800, 0]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 2}
      />
      
      {/* Left door panel */}
      <Line
        points={[0, 0, 900, -900]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      <Arc
        x={0}
        y={0}
        innerRadius={0}
        outerRadius={900}
        angle={90}
        rotation={-90}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        dash={[10, 5]}
      />
      
      {/* Right door panel */}
      <Line
        points={[1800, 0, 900, -900]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      <Arc
        x={1800}
        y={0}
        innerRadius={0}
        outerRadius={900}
        angle={90}
        rotation={-180}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        dash={[10, 5]}
      />
    </Group>
  );
};

/**
 * Sliding door (pocket door in wall)
 * Size: 900mm wide
 */
export const DoorSliding: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Wall opening */}
      <Line
        points={[0, 0, 900, 0]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 2}
      />
      
      {/* Door panel (offset to show it slides into wall) */}
      <Rect
        x={100}
        y={-200}
        width={700}
        height={180}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      
      {/* Arrow showing slide direction */}
      <Line
        points={[450, -100, 800, -100]}
        stroke={strokeColor}
        strokeWidth={1}
        pointerAtEnd
      />
    </Group>
  );
};

// ============================================================================
// WINDOW SYMBOLS
// ============================================================================

/**
 * Standard window with double lines and sill
 * Size: 1200mm wide × 150mm depth
 * Based on: Reference image showing double-line windows
 */
export const WindowStandard: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Outer frame */}
      <Line
        points={[0, 0, 1200, 0]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 1.5}
        lineCap="square"
      />
      
      {/* Inner frame (parallel line) */}
      <Line
        points={[0, 150, 1200, 150]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 1.5}
        lineCap="square"
      />
      
      {/* Mullion (vertical center divide) */}
      <Line
        points={[600, 0, 600, 150]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
      />
      
      {/* Cross pattern (X) indicating glass */}
      <Line
        points={[0, 0, 1200, 150]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        opacity={0.5}
      />
      <Line
        points={[0, 150, 1200, 0]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        opacity={0.5}
      />
    </Group>
  );
};

/**
 * Corner window (L-shaped)
 * Size: 1200mm × 1200mm
 */
export const WindowCorner: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Horizontal window */}
      <WindowStandard x={0} y={0} strokeColor={strokeColor} strokeWidth={strokeWidth} />
      
      {/* Vertical window */}
      <WindowStandard x={0} y={0} rotation={90} strokeColor={strokeColor} strokeWidth={strokeWidth} />
    </Group>
  );
};

// ============================================================================
// BATHROOM FIXTURES - TOILET
// ============================================================================

/**
 * Standard toilet (top view)
 * Size: 500mm wide × 700mm deep
 * Based on: Reference image showing oval toilet symbol
 */
export const ToiletStandard: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Toilet bowl (oval) */}
      <Ellipse
        x={250}
        y={350}
        radiusX={250}
        radiusY={350}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
      />
      
      {/* Tank (rectangle at back) */}
      <Rect
        x={100}
        y={0}
        width={300}
        height={150}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
        cornerRadius={10}
      />
      
      {/* Seat opening (inner oval) */}
      <Ellipse
        x={250}
        y={350}
        radiusX={150}
        radiusY={200}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
      />
    </Group>
  );
};

/**
 * Wall-hung toilet (more compact)
 * Size: 400mm × 550mm
 */
export const ToiletWallHung: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Bowl */}
      <Ellipse
        x={200}
        y={350}
        radiusX={200}
        radiusY={250}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
      />
      
      {/* Wall mounting bracket (small rect) */}
      <Rect
        x={150}
        y={0}
        width={100}
        height={50}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={strokeColor}
      />
    </Group>
  );
};

// ============================================================================
// BATHROOM FIXTURES - SINK
// ============================================================================

/**
 * Single sink/basin
 * Size: 600mm wide × 450mm deep
 * Based on: Reference image showing rounded rectangle sinks
 */
export const SinkSingle: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Sink basin (rounded rectangle) */}
      <Rect
        x={0}
        y={0}
        width={600}
        height={450}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
        cornerRadius={50}
      />
      
      {/* Faucet (small circle) */}
      <Circle
        x={300}
        y={100}
        radius={30}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        fill={strokeColor}
      />
      
      {/* Drain (small circle at center) */}
      <Circle
        x={300}
        y={300}
        radius={15}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        fill={strokeColor}
      />
    </Group>
  );
};

/**
 * Double sink
 * Size: 1200mm wide × 450mm deep
 */
export const SinkDouble: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Left basin */}
      <Rect
        x={0}
        y={0}
        width={550}
        height={450}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
        cornerRadius={50}
      />
      
      {/* Right basin */}
      <Rect
        x={650}
        y={0}
        width={550}
        height={450}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
        cornerRadius={50}
      />
      
      {/* Left faucet */}
      <Circle x={275} y={100} radius={25} fill={strokeColor} />
      
      {/* Right faucet */}
      <Circle x={925} y={100} radius={25} fill={strokeColor} />
    </Group>
  );
};

// ============================================================================
// BATHROOM FIXTURES - BATHTUB & SHOWER
// ============================================================================

/**
 * Standard bathtub
 * Size: 1700mm × 750mm
 * Based on: Reference image showing rectangular tub with drain
 */
export const BathtubStandard: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Tub outline */}
      <Rect
        x={0}
        y={0}
        width={1700}
        height={750}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 1.5}
        fill={fillColor}
        cornerRadius={30}
      />
      
      {/* Inner edge (showing depth) */}
      <Rect
        x={100}
        y={100}
        width={1500}
        height={550}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        cornerRadius={20}
      />
      
      {/* Drain */}
      <Circle
        x={1500}
        y={650}
        radius={30}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        fill={strokeColor}
      />
      
      {/* Faucet end */}
      <Circle
        x={200}
        y={100}
        radius={40}
        fill={strokeColor}
      />
    </Group>
  );
};

/**
 * Square shower enclosure
 * Size: 900mm × 900mm
 * Based on: Reference image with X pattern for shower
 */
export const ShowerSquare: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'rgba(59, 130, 246, 0.05)',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Shower enclosure */}
      <Rect
        x={0}
        y={0}
        width={900}
        height={900}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 1.5}
        fill={fillColor}
      />
      
      {/* Drain (center) */}
      <Circle
        x={450}
        y={450}
        radius={40}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <Circle
        x={450}
        y={450}
        radius={20}
        fill={strokeColor}
      />
      
      {/* X pattern (shower head indication) */}
      <Line
        points={[100, 100, 350, 350]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        opacity={0.5}
      />
      <Line
        points={[350, 100, 100, 350]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        opacity={0.5}
      />
    </Group>
  );
};

// ============================================================================
// KITCHEN APPLIANCES
// ============================================================================

/**
 * 4-burner stove/cooktop
 * Size: 600mm × 600mm
 * Based on: Reference image showing circular burners
 */
export const Stove4Burner: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Stove outline */}
      <Rect
        x={0}
        y={0}
        width={600}
        height={600}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 1.5}
        fill={fillColor}
      />
      
      {/* Burner 1 (top-left) */}
      <Circle x={150} y={150} radius={80} stroke={strokeColor} strokeWidth={strokeWidth} />
      <Circle x={150} y={150} radius={50} stroke={strokeColor} strokeWidth={strokeWidth * 0.5} />
      
      {/* Burner 2 (top-right) */}
      <Circle x={450} y={150} radius={80} stroke={strokeColor} strokeWidth={strokeWidth} />
      <Circle x={450} y={150} radius={50} stroke={strokeColor} strokeWidth={strokeWidth * 0.5} />
      
      {/* Burner 3 (bottom-left) */}
      <Circle x={150} y={450} radius={80} stroke={strokeColor} strokeWidth={strokeWidth} />
      <Circle x={150} y={450} radius={50} stroke={strokeColor} strokeWidth={strokeWidth * 0.5} />
      
      {/* Burner 4 (bottom-right) */}
      <Circle x={450} y={450} radius={80} stroke={strokeColor} strokeWidth={strokeWidth} />
      <Circle x={450} y={450} radius={50} stroke={strokeColor} strokeWidth={strokeWidth * 0.5} />
    </Group>
  );
};

/**
 * Kitchen sink with drainboard
 * Size: 1000mm × 500mm
 */
export const SinkKitchen: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Counter outline */}
      <Rect
        x={0}
        y={0}
        width={1000}
        height={500}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
      />
      
      {/* Sink basin */}
      <Rect
        x={100}
        y={100}
        width={450}
        height={300}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        cornerRadius={30}
      />
      
      {/* Faucet */}
      <Circle x={325} y={50} radius={30} fill={strokeColor} />
      
      {/* Drainboard lines (right side) */}
      {[0, 1, 2, 3, 4].map((i) => (
        <Line
          key={i}
          points={[650 + i * 60, 100, 680 + i * 60, 400]}
          stroke={strokeColor}
          strokeWidth={strokeWidth * 0.5}
          opacity={0.5}
        />
      ))}
    </Group>
  );
};

/**
 * Refrigerator
 * Size: 700mm × 700mm
 */
export const Refrigerator: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Fridge outline */}
      <Rect
        x={0}
        y={0}
        width={700}
        height={700}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 1.5}
        fill={fillColor}
        cornerRadius={10}
      />
      
      {/* Door division (freezer on top) */}
      <Line
        points={[0, 250, 700, 250]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      
      {/* Door handles */}
      <Rect x={650} y={100} width={30} height={100} fill={strokeColor} cornerRadius={5} />
      <Rect x={650} y={350} width={30} height={200} fill={strokeColor} cornerRadius={5} />
    </Group>
  );
};

// ============================================================================
// FURNITURE - BEDS
// ============================================================================

/**
 * Single bed
 * Size: 1000mm × 2000mm
 * Based on: Reference image showing rectangular bed with pillow
 */
export const BedSingle: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Mattress outline */}
      <Rect
        x={0}
        y={0}
        width={1000}
        height={2000}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
        cornerRadius={20}
      />
      
      {/* Pillow (top) */}
      <Rect
        x={100}
        y={100}
        width={800}
        height={300}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        fill="rgba(0,0,0,0.05)"
        cornerRadius={10}
      />
    </Group>
  );
};

/**
 * Double bed
 * Size: 1600mm × 2000mm
 */
export const BedDouble: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Mattress outline */}
      <Rect
        x={0}
        y={0}
        width={1600}
        height={2000}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
        cornerRadius={20}
      />
      
      {/* Left pillow */}
      <Rect
        x={100}
        y={100}
        width={650}
        height={300}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        fill="rgba(0,0,0,0.05)"
        cornerRadius={10}
      />
      
      {/* Right pillow */}
      <Rect
        x={850}
        y={100}
        width={650}
        height={300}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        fill="rgba(0,0,0,0.05)"
        cornerRadius={10}
      />
    </Group>
  );
};

// ============================================================================
// FURNITURE - SOFAS
// ============================================================================

/**
 * 2-seat sofa
 * Size: 1600mm × 800mm
 */
export const Sofa2Seat: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Sofa base */}
      <Rect
        x={0}
        y={0}
        width={1600}
        height={800}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
        cornerRadius={40}
      />
      
      {/* Backrest (thicker line at back) */}
      <Line
        points={[100, 100, 1500, 100]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 3}
        lineCap="round"
      />
      
      {/* Seat cushion divisions */}
      <Line
        points={[800, 200, 800, 700]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        opacity={0.5}
      />
    </Group>
  );
};

/**
 * 3-seat sofa
 * Size: 2200mm × 800mm
 */
export const Sofa3Seat: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Sofa base */}
      <Rect
        x={0}
        y={0}
        width={2200}
        height={800}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
        cornerRadius={40}
      />
      
      {/* Backrest */}
      <Line
        points={[100, 100, 2100, 100]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 3}
        lineCap="round"
      />
      
      {/* Cushion divisions */}
      <Line
        points={[733, 200, 733, 700]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        opacity={0.5}
      />
      <Line
        points={[1467, 200, 1467, 700]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        opacity={0.5}
      />
    </Group>
  );
};

// ============================================================================
// FURNITURE - TABLES
// ============================================================================

/**
 * Round dining table
 * Size: 1200mm diameter
 * Based on: Reference image showing circular tables
 */
export const TableRound: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Table top */}
      <Circle
        x={600}
        y={600}
        radius={600}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
      />
      
      {/* Center detail (shows it's a table, not just circle) */}
      <Circle
        x={600}
        y={600}
        radius={50}
        fill={strokeColor}
      />
    </Group>
  );
};

/**
 * Rectangular dining table
 * Size: 2000mm × 1000mm
 */
export const TableRectangular: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Table top */}
      <Rect
        x={0}
        y={0}
        width={2000}
        height={1000}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
        cornerRadius={30}
      />
      
      {/* Table legs (circles at corners) */}
      <Circle x={150} y={150} radius={40} fill={strokeColor} />
      <Circle x={1850} y={150} radius={40} fill={strokeColor} />
      <Circle x={150} y={850} radius={40} fill={strokeColor} />
      <Circle x={1850} y={850} radius={40} fill={strokeColor} />
    </Group>
  );
};

/**
 * Chair (simple, can be placed around tables)
 * Size: 500mm × 500mm
 */
export const Chair: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Seat */}
      <Rect
        x={0}
        y={150}
        width={500}
        height={350}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
        cornerRadius={20}
      />
      
      {/* Backrest */}
      <Rect
        x={50}
        y={0}
        width={400}
        height={180}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
        cornerRadius={10}
      />
    </Group>
  );
};

// ============================================================================
// STAIRS
// ============================================================================

/**
 * Straight stairs (going up)
 * Size: 3000mm × 1000mm (typical stair run)
 * Based on: Reference image showing stairs with arrow
 */
export const StairStraightUp: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  const steps = 14;
  const stepHeight = 3000 / steps;
  
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Stair outline */}
      <Rect
        x={0}
        y={0}
        width={1000}
        height={3000}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 1.5}
        fill={fillColor}
      />
      
      {/* Step lines */}
      {Array.from({ length: steps }).map((_, i) => (
        <Line
          key={i}
          points={[0, i * stepHeight, 1000, i * stepHeight]}
          stroke={strokeColor}
          strokeWidth={strokeWidth * 0.5}
        />
      ))}
      
      {/* Direction arrow (up) */}
      <Line
        points={[500, 2700, 500, 500]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 2}
        pointerAtEnd
      />
      
      {/* "UP" text indication */}
      <Line
        points={[400, 1000, 500, 700, 600, 1000]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
    </Group>
  );
};

/**
 * Spiral staircase
 * Size: 1500mm diameter
 * Based on: Reference image showing circular stairs
 */
export const StairSpiral: React.FC<SymbolProps> = ({
  x = 0,
  y = 0,
  rotation = 0,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
}) => {
  return (
    <Group x={x} y={y} rotation={rotation}>
      {/* Outer circle */}
      <Circle
        x={750}
        y={750}
        radius={750}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 1.5}
        fill={fillColor}
      />
      
      {/* Central pole */}
      <Circle
        x={750}
        y={750}
        radius={150}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="rgba(0,0,0,0.1)"
      />
      
      {/* Spiral steps (radiating lines) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const innerR = 150;
        const outerR = 750;
        return (
          <Line
            key={i}
            points={[
              750 + innerR * Math.cos(angle),
              750 + innerR * Math.sin(angle),
              750 + outerR * Math.cos(angle),
              750 + outerR * Math.sin(angle),
            ]}
            stroke={strokeColor}
            strokeWidth={strokeWidth * 0.5}
            opacity={0.7}
          />
        );
      })}
      
      {/* Direction arrow (curved) */}
      <Arc
        x={750}
        y={750}
        innerRadius={400}
        outerRadius={400}
        angle={270}
        rotation={-45}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 2}
        pointerAtEnd
      />
    </Group>
  );
};

// ============================================================================
// SYMBOL REGISTRY
// ============================================================================

/**
 * Registry of all available symbols
 * Maps symbol type to its React component
 */
export const SYMBOL_REGISTRY: Record<ArchSymbolType, React.FC<SymbolProps>> = {
  // Doors
  door_swing_left: DoorSwingLeft,
  door_swing_right: DoorSwingRight,
  door_double: DoorDouble,
  door_sliding: DoorSliding,
  door_pocket: DoorSliding, // Alias
  
  // Windows
  window_standard: WindowStandard,
  window_double: WindowStandard, // Same as standard
  window_corner: WindowCorner,
  
  // Bathroom - Toilet
  toilet_standard: ToiletStandard,
  toilet_wall_hung: ToiletWallHung,
  
  // Bathroom - Sink
  sink_single: SinkSingle,
  sink_double: SinkDouble,
  
  // Bathroom - Bath/Shower
  bathtub_standard: BathtubStandard,
  bathtub_corner: BathtubStandard, // Could create variant
  shower_square: ShowerSquare,
  shower_corner: ShowerSquare, // Could create variant
  
  // Kitchen
  stove_4burner: Stove4Burner,
  sink_kitchen: SinkKitchen,
  refrigerator: Refrigerator,
  dishwasher: Refrigerator, // Similar appearance
  
  // Furniture - Beds
  bed_single: BedSingle,
  bed_double: BedDouble,
  
  // Furniture - Sofas
  sofa_2seat: Sofa2Seat,
  sofa_3seat: Sofa3Seat,
  sofa_corner: Sofa3Seat, // Could create L-shaped variant
  
  // Furniture - Tables
  table_round: TableRound,
  table_rectangular: TableRectangular,
  chair: Chair,
  
  // Stairs
  stair_straight_up: StairStraightUp,
  stair_straight_down: StairStraightUp, // Same, just rotated 180
  stair_spiral: StairSpiral,
};

/**
 * Symbol metadata for UI display
 */
export interface SymbolMetadata {
  type: ArchSymbolType;
  name: string;
  category: string;
  dimensions: string; // Human-readable size
  description?: string;
}

export const SYMBOL_METADATA: SymbolMetadata[] = [
  // Doors
  { type: 'door_swing_left', name: 'Door (Left Swing)', category: 'Doors', dimensions: '900mm' },
  { type: 'door_swing_right', name: 'Door (Right Swing)', category: 'Doors', dimensions: '900mm' },
  { type: 'door_double', name: 'Double Door', category: 'Doors', dimensions: '1800mm' },
  { type: 'door_sliding', name: 'Sliding Door', category: 'Doors', dimensions: '900mm' },
  
  // Windows
  { type: 'window_standard', name: 'Standard Window', category: 'Windows', dimensions: '1200mm' },
  { type: 'window_corner', name: 'Corner Window', category: 'Windows', dimensions: '1200mm × 1200mm' },
  
  // Bathroom
  { type: 'toilet_standard', name: 'Toilet', category: 'Bathroom', dimensions: '500×700mm' },
  { type: 'toilet_wall_hung', name: 'Wall-Hung Toilet', category: 'Bathroom', dimensions: '400×550mm' },
  { type: 'sink_single', name: 'Single Sink', category: 'Bathroom', dimensions: '600×450mm' },
  { type: 'sink_double', name: 'Double Sink', category: 'Bathroom', dimensions: '1200×450mm' },
  { type: 'bathtub_standard', name: 'Bathtub', category: 'Bathroom', dimensions: '1700×750mm' },
  { type: 'shower_square', name: 'Shower', category: 'Bathroom', dimensions: '900×900mm' },
  
  // Kitchen
  { type: 'stove_4burner', name: '4-Burner Stove', category: 'Kitchen', dimensions: '600×600mm' },
  { type: 'sink_kitchen', name: 'Kitchen Sink', category: 'Kitchen', dimensions: '1000×500mm' },
  { type: 'refrigerator', name: 'Refrigerator', category: 'Kitchen', dimensions: '700×700mm' },
  
  // Furniture
  { type: 'bed_single', name: 'Single Bed', category: 'Furniture', dimensions: '1000×2000mm' },
  { type: 'bed_double', name: 'Double Bed', category: 'Furniture', dimensions: '1600×2000mm' },
  { type: 'sofa_2seat', name: '2-Seat Sofa', category: 'Furniture', dimensions: '1600×800mm' },
  { type: 'sofa_3seat', name: '3-Seat Sofa', category: 'Furniture', dimensions: '2200×800mm' },
  { type: 'table_round', name: 'Round Table', category: 'Furniture', dimensions: 'Ø1200mm' },
  { type: 'table_rectangular', name: 'Rectangular Table', category: 'Furniture', dimensions: '2000×1000mm' },
  { type: 'chair', name: 'Chair', category: 'Furniture', dimensions: '500×500mm' },
  
  // Stairs
  { type: 'stair_straight_up', name: 'Straight Stairs', category: 'Stairs', dimensions: '1000×3000mm' },
  { type: 'stair_spiral', name: 'Spiral Stairs', category: 'Stairs', dimensions: 'Ø1500mm' },
];

/**
 * Get symbol component by type
 */
export const getSymbolComponent = (type: ArchSymbolType): React.FC<SymbolProps> | null => {
  return SYMBOL_REGISTRY[type] || null;
};

/**
 * Get all symbols in a category
 */
export const getSymbolsByCategory = (category: string): SymbolMetadata[] => {
  return SYMBOL_METADATA.filter(s => s.category === category);
};

/**
 * Get all unique categories
 */
export const getSymbolCategories = (): string[] => {
  const categories = SYMBOL_METADATA.map(s => s.category);
  return Array.from(new Set(categories));
};
