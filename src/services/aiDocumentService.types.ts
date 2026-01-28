/**
 * TypeScript types for AI Document Extraction
 * Used for extracting rooms and tasks from uploaded documents (PDF, DOC, TXT)
 */

/**
 * Task categories that map to cost_center values in the database
 */
export type TaskCategory =
  | 'rivning'     // Demolition
  | 'el'          // Electrical
  | 'vvs'         // Plumbing
  | 'malning'     // Painting
  | 'golv'        // Flooring
  | 'kok'         // Kitchen
  | 'badrum'      // Bathroom
  | 'snickeri'    // Carpentry
  | 'kakel'       // Tiles
  | 'ovrigt';     // Other

/**
 * Extracted room from document
 */
export interface ExtractedRoom {
  name: string;
  estimatedAreaSqm: number | null;
  description: string | null;
  confidence: number; // 0-1, indicates AI confidence in extraction
  sourceText: string; // Original text from document
}

/**
 * Extracted task from document
 */
export interface ExtractedTask {
  title: string;
  description: string | null;
  category: TaskCategory;
  roomName: string | null; // Reference to room by name for linking
  confidence: number; // 0-1, indicates AI confidence in extraction
  sourceText: string; // Original text from document
}

/**
 * Result from AI document analysis
 */
export interface AIDocumentExtractionResult {
  rooms: ExtractedRoom[];
  tasks: ExtractedTask[];
  documentSummary: string;
}

/**
 * Room with selection state for UI
 */
export interface SelectableRoom extends ExtractedRoom {
  index: number;
  selected: boolean;
  edited: boolean;
}

/**
 * Task with selection state for UI
 */
export interface SelectableTask extends ExtractedTask {
  index: number;
  selected: boolean;
  edited: boolean;
}

/**
 * Maps task categories to Swedish display names
 */
export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  rivning: 'Rivning',
  el: 'El',
  vvs: 'VVS',
  malning: 'Målning',
  golv: 'Golv',
  kok: 'Kök',
  badrum: 'Badrum',
  snickeri: 'Snickeri',
  kakel: 'Kakel',
  ovrigt: 'Övrigt',
};

/**
 * Maps task categories to cost_center values in database
 */
export const TASK_CATEGORY_TO_COST_CENTER: Record<TaskCategory, string> = {
  rivning: 'construction',
  el: 'electricity',
  vvs: 'plumbing',
  malning: 'paint',
  golv: 'floor',
  kok: 'kitchen',
  badrum: 'bathrooms',
  snickeri: 'carpentry',
  kakel: 'tiles',
  ovrigt: 'construction',
};
