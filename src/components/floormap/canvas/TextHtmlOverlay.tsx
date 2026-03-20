/**
 * TextHtmlOverlay — renders rich HTML text over Konva text/sticky_note shapes
 *
 * Positioned outside the Konva Stage as fixed HTML divs with
 * pointerEvents: none so all clicks pass through to Konva.
 * Only renders for shapes whose text contains HTML formatting.
 */

import React from 'react';
import { FloorMapShape, TextCoordinates, ViewState } from '../types';
import { hasHtmlContent } from './InlineTextEditor';

interface TextHtmlOverlayProps {
  shapes: FloorMapShape[];
  viewState: ViewState;
  /** ID of shape currently being inline-edited (skip overlay for it) */
  editingShapeId: string | null;
}

export const TextHtmlOverlay: React.FC<TextHtmlOverlayProps> = ({
  shapes,
  viewState,
  editingShapeId,
}) => {
  const textShapes = shapes.filter(
    (s) =>
      (s.type === 'text' || s.type === 'sticky_note') &&
      s.id !== editingShapeId &&
      s.text &&
      hasHtmlContent(s.text),
  );

  if (textShapes.length === 0) return null;

  return (
    <>
      {textShapes.map((shape) => {
        const coords = shape.coordinates as TextCoordinates;
        const isStickyNote = shape.type === 'sticky_note';
        const w = coords.width || (isStickyNote ? 200 : 160);
        const h = coords.height || (isStickyNote ? 150 : 40);
        const padding = isStickyNote ? 8 : (shape.hasBackground ? 8 : 4);
        const baseFontSize = isStickyNote ? 13 : (shape.fontSize || 16);

        const screenX = coords.x * viewState.zoom + viewState.panX;
        const screenY = coords.y * viewState.zoom + viewState.panY;
        const screenW = w * viewState.zoom;
        const screenH = h * viewState.zoom;
        const screenFontSize = baseFontSize * viewState.zoom;
        const screenPadding = padding * viewState.zoom;

        // Skip if off-screen (rough cull)
        if (
          screenX + screenW < -50 ||
          screenX > window.innerWidth + 50 ||
          screenY + screenH < -50 ||
          screenY > window.innerHeight + 50
        ) {
          return null;
        }

        const fontFamily = isStickyNote
          ? "'Inter', system-ui, sans-serif"
          : 'system-ui, sans-serif';
        const textColor = isStickyNote ? '#1c1917' : (shape.color || '#000000');

        return (
          <div
            key={`html-overlay-${shape.id}`}
            style={{
              position: 'fixed',
              left: screenX,
              top: screenY,
              width: screenW,
              height: screenH,
              padding: screenPadding,
              fontFamily,
              fontSize: screenFontSize,
              color: textColor,
              lineHeight: 1.4,
              boxSizing: 'border-box',
              overflow: 'hidden',
              pointerEvents: 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              zIndex: 5,
            }}
            dangerouslySetInnerHTML={{ __html: shape.text || '' }}
          />
        );
      })}
    </>
  );
};
