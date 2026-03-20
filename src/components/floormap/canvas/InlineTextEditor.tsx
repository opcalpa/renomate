/**
 * InlineTextEditor — WYSIWYG text editing directly on the canvas
 *
 * Renders an HTML textarea positioned exactly over a Konva text/sticky_note
 * shape, with a floating format toolbar above it. The user sees their edits
 * in real-time in context, without a modal dialog.
 *
 * Save triggers: blur, Escape, or clicking away.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FloorMapShape, TextCoordinates, ViewState } from '../types';
import { Bold, Italic, Minus, Plus } from 'lucide-react';

interface InlineTextEditorProps {
  shape: FloorMapShape;
  viewState: ViewState;
  onSave: (shapeId: string, updates: Partial<FloorMapShape>) => void;
  onClose: () => void;
}

const FONT_SIZES = [10, 12, 13, 14, 16, 20, 24, 32, 48];

export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  shape,
  viewState,
  onSave,
  onClose,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const coords = shape.coordinates as TextCoordinates;
  const isStickyNote = shape.type === 'sticky_note';
  const defaultW = isStickyNote ? 200 : 160;
  const defaultH = isStickyNote ? 150 : 40;
  const w = coords.width || defaultW;
  const h = coords.height || defaultH;
  const padding = isStickyNote ? 8 : (shape.hasBackground ? 8 : 4);

  // Editing state
  const [text, setText] = useState(shape.text || '');
  const [isBold, setIsBold] = useState(shape.textStyle?.isBold || false);
  const [isItalic, setIsItalic] = useState(shape.textStyle?.isItalic || false);
  const [fontSize, setFontSize] = useState(
    isStickyNote ? 13 : (shape.fontSize || 16),
  );

  // Screen position: world coords → screen pixels
  const screenX = coords.x * viewState.zoom + viewState.panX;
  const screenY = coords.y * viewState.zoom + viewState.panY;
  const screenW = w * viewState.zoom;
  const screenH = h * viewState.zoom;
  const screenFontSize = fontSize * viewState.zoom;
  const screenPadding = padding * viewState.zoom;

  // Auto-focus on mount
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
  }, []);

  // Save and close
  const handleSave = useCallback(() => {
    const updates: Partial<FloorMapShape> = {
      text: text,
      textStyle: { isBold, isItalic },
      fontSize,
    };
    onSave(shape.id, updates);
    onClose();
  }, [text, isBold, isItalic, fontSize, shape.id, onSave, onClose]);

  // Close on Escape, save on blur
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSave();
      }
      // Prevent canvas shortcuts from firing
      e.stopPropagation();
    },
    [handleSave],
  );

  // Click outside → save
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        handleSave();
      }
    };
    // Delay to avoid the double-click that opened the editor
    const timer = setTimeout(
      () => document.addEventListener('mousedown', handleClickOutside),
      100,
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleSave]);

  const fontFamily = isStickyNote
    ? "'Inter', system-ui, sans-serif"
    : 'system-ui, sans-serif';
  const bgColor = isStickyNote ? '#fef3c7' : (shape.hasBackground ? 'rgba(255,255,255,0.95)' : 'transparent');
  const textColor = isStickyNote ? '#1c1917' : (shape.color || '#000000');

  const changeFontSize = (delta: number) => {
    const idx = FONT_SIZES.indexOf(fontSize);
    const newIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta));
    setFontSize(FONT_SIZES[newIdx]);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'auto' }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Format toolbar — positioned above the textarea */}
      <div
        style={{
          position: 'fixed',
          left: screenX,
          top: screenY - 36,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          padding: '2px 4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          fontSize: 13,
          userSelect: 'none',
        }}
      >
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setIsBold((b) => !b); }}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            border: 'none',
            background: isBold ? '#e0e7ff' : 'transparent',
            cursor: 'pointer',
            fontWeight: 700,
            color: isBold ? '#4338ca' : '#374151',
          }}
          title="Fet"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setIsItalic((i) => !i); }}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            border: 'none',
            background: isItalic ? '#e0e7ff' : 'transparent',
            cursor: 'pointer',
            color: isItalic ? '#4338ca' : '#374151',
          }}
          title="Kursiv"
        >
          <Italic size={14} />
        </button>

        <div
          style={{
            width: 1,
            height: 20,
            background: '#e5e7eb',
            margin: '0 2px',
          }}
        />

        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); changeFontSize(-1); }}
          style={{
            width: 24, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: '#374151',
          }}
          title="Mindre"
        >
          <Minus size={12} />
        </button>
        <span
          style={{
            minWidth: 24,
            textAlign: 'center',
            fontSize: 12,
            fontVariantNumeric: 'tabular-nums',
            color: '#374151',
          }}
        >
          {fontSize}
        </span>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); changeFontSize(1); }}
          style={{
            width: 24, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: '#374151',
          }}
          title="Större"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Textarea overlay — matches Konva text position exactly */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isStickyNote ? 'Skriv här...' : 'Text...'}
        style={{
          position: 'fixed',
          left: screenX,
          top: screenY,
          width: screenW,
          height: screenH,
          padding: screenPadding,
          fontFamily,
          fontSize: screenFontSize,
          fontWeight: isBold ? 700 : 400,
          fontStyle: isItalic ? 'italic' : 'normal',
          color: textColor,
          background: bgColor,
          border: isStickyNote ? '2px solid #f59e0b' : '2px solid #3b82f6',
          borderRadius: isStickyNote ? 2 : 4,
          outline: 'none',
          resize: 'none',
          overflow: 'auto',
          lineHeight: 1.4,
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
};
