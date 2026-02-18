/**
 * Canvas Module
 *
 * Extracted components and utilities from UnifiedKonvaCanvas.
 */

// Constants
export * from './constants';

// Utilities
export * from './utils';

// Components
export { Grid } from './Grid';
export type { GridProps } from './Grid';
export { CommentBadgesLayer } from './CommentBadgesLayer';
export { MeasurementOverlay } from './MeasurementOverlay';
export { SelectionPreviewOverlay } from './SelectionPreviewOverlay';
export { MultiSelectionBoundsOverlay, calculateMultiSelectionBounds } from './MultiSelectionBounds';
export { GhostPreviewOverlay } from './GhostPreviewOverlay';
