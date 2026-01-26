/**
 * Shared types for shape renderer components
 */

import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { FloorMapShape } from '../types';

/**
 * Base props for all shape components
 */
export interface ShapeComponentProps {
  shape: FloorMapShape;
  isSelected: boolean;
  onSelect: (evt?: KonvaEventObject<MouseEvent>) => void;
  onTransform: (updates: Partial<FloorMapShape>) => void;
  shapeRefsMap: Map<string, Konva.Node>;
}

/**
 * Extended props for shapes that need view/scale context
 */
export interface ShapeWithViewProps extends ShapeComponentProps {
  viewState: {
    zoom: number;
    panX: number;
    panY: number;
  };
  scaleSettings: {
    pixelsPerMm: number;
  };
  projectSettings: {
    snapEnabled: boolean;
    showDimensions: boolean;
    unit: 'mm' | 'cm' | 'm';
    gridInterval?: number;
  };
}

/**
 * Props for wall shape with optional transform state
 */
export interface WallShapeProps extends ShapeWithViewProps {
  transformState?: {
    scaleX: number;
    scaleY: number;
    rotation: number;
    x: number;
    y: number;
  };
}

/**
 * Props for room shape
 */
export interface RoomShapeProps extends ShapeComponentProps {
  onDoubleClick?: () => void;
}

/**
 * Props for text shape with edit support
 */
export interface TextShapeProps extends ShapeComponentProps {
  onEdit?: (shape: FloorMapShape) => void;
}
