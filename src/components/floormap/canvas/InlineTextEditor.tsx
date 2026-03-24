/**
 * InlineTextEditor — Rich-text WYSIWYG editing on the canvas
 *
 * Uses a contenteditable div so the user can select individual words
 * and apply bold / italic / font-size independently.  The content is
 * stored as sanitised HTML in shape.text.
 *
 * Save triggers: click-outside, Escape.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FloorMapShape, TextCoordinates, ViewState } from '../types';
import { Bold, Italic, Minus, Plus } from 'lucide-react';

interface InlineTextEditorProps {
  shape: FloorMapShape;
  viewState: ViewState;
  onSave: (shapeId: string, updates: Partial<FloorMapShape>) => void;
  onClose: () => void;
}

/* Allowed tags — everything else is stripped on save */
const ALLOWED_TAGS = ['B', 'I', 'STRONG', 'EM', 'BR', 'SPAN', 'DIV', 'P'];

function sanitiseHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName;
    const children = Array.from(el.childNodes).map(walk).join('');
    if (!ALLOWED_TAGS.includes(tag)) return children;
    // Keep style only for SPAN (font-size)
    if (tag === 'SPAN' && el.style.fontSize) {
      return `<span style="font-size:${el.style.fontSize}">${children}</span>`;
    }
    if (tag === 'B' || tag === 'STRONG') return `<b>${children}</b>`;
    if (tag === 'I' || tag === 'EM') return `<i>${children}</i>`;
    if (tag === 'BR') return '<br>';
    if (tag === 'DIV' || tag === 'P') return `${children}<br>`;
    return children;
  };
  return walk(doc.body).replace(/(<br>)+$/, '');
}

/* Strip all HTML to plain text (for KonvaText fallback) */
export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

export function hasHtmlContent(text: string): boolean {
  return /<[^>]+>/.test(text);
}

const FONT_SIZES = [10, 12, 13, 14, 16, 20, 24, 32, 48];

export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  shape,
  viewState,
  onSave,
  onClose,
}) => {
  const editableRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef(false);

  const coords = shape.coordinates as TextCoordinates;
  const isStickyNote = shape.type === 'sticky_note';
  const defaultW = isStickyNote ? 200 : 160;
  const defaultH = isStickyNote ? 150 : 40;
  const w = coords.width || defaultW;
  const h = coords.height || defaultH;
  const padding = isStickyNote ? 8 : (shape.hasBackground ? 8 : 4);

  // Screen position
  const screenX = coords.x * viewState.zoom + viewState.panX;
  const screenY = coords.y * viewState.zoom + viewState.panY;
  const screenW = w * viewState.zoom;
  const screenH = h * viewState.zoom;
  const baseFontSize = isStickyNote ? 13 : (shape.fontSize || 16);
  const screenFontSize = baseFontSize * viewState.zoom;
  const screenPadding = padding * viewState.zoom;

  const fontFamily = isStickyNote
    ? "'Inter', system-ui, sans-serif"
    : 'system-ui, sans-serif';
  const bgColor = isStickyNote
    ? '#fef3c7'
    : shape.hasBackground ? 'rgba(255,255,255,0.95)' : 'transparent';
  const textColor = isStickyNote ? '#1c1917' : (shape.color || '#000000');

  // Focus and set cursor to end on mount
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    // Move cursor to end
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, []);

  // Save and close
  const handleSave = useCallback(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    const el = editableRef.current;
    const rawHtml = el?.innerHTML || '';
    const clean = sanitiseHtml(rawHtml);
    // If no HTML formatting, store plain text for backward compat
    const plainText = stripHtml(clean);
    const hasFormatting = clean !== plainText;
    onSave(shape.id, { text: hasFormatting ? clean : plainText });
    onClose();
  }, [shape.id, onSave, onClose]);

  // Escape → save
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); handleSave(); }
      e.stopPropagation();
    },
    [handleSave],
  );

  // Click outside → save
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 150);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [handleSave]);

  // ---- Selection preservation ----

  const savedSelectionRef = useRef<Range | null>(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const range = savedSelectionRef.current;
    if (!range) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  // ---- Format commands (operate on current selection) ----

  const execCmd = (cmd: string, value?: string) => {
    restoreSelection();
    document.execCommand(cmd, false, value);
    saveSelection();
  };

  const handleBold = (e: React.MouseEvent) => { e.preventDefault(); execCmd('bold'); };
  const handleItalic = (e: React.MouseEvent) => { e.preventDefault(); execCmd('italic'); };

  const handleFontSizeChange = (delta: number, e: React.MouseEvent) => {
    e.preventDefault();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !editableRef.current) return;

    // Determine current font size of selection
    const computed = window.getComputedStyle(
      sel.anchorNode?.parentElement || editableRef.current,
    );
    const current = parseFloat(computed.fontSize) || screenFontSize;
    const worldCurrent = current / viewState.zoom;
    const idx = FONT_SIZES.reduce((best, fs, i) =>
      Math.abs(fs - worldCurrent) < Math.abs(FONT_SIZES[best] - worldCurrent) ? i : best, 0);
    const newIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta));
    const newSize = FONT_SIZES[newIdx] * viewState.zoom;

    // Wrap selection in a span with the new font size
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = `${newSize}px`;
    try {
      range.surroundContents(span);
    } catch {
      // surroundContents fails if selection crosses element boundaries
      // Fall back to execCommand
      document.execCommand('fontSize', false, '7');
      const fontEls = editableRef.current.querySelectorAll('font[size="7"]');
      fontEls.forEach((el) => {
        const replacement = document.createElement('span');
        replacement.style.fontSize = `${newSize}px`;
        replacement.innerHTML = el.innerHTML;
        el.replaceWith(replacement);
      });
    }

    // Re-select the span content so user can keep clicking +/-
    const newRange = document.createRange();
    newRange.selectNodeContents(span.childNodes.length > 0 ? span : span.parentElement || span);
    sel.removeAllRanges();
    sel.addRange(newRange);
    saveSelection();
  };

  // Track active formatting state at cursor position
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);

  // Save selection + check formatting whenever selection changes
  useEffect(() => {
    const handleSelChange = () => {
      const sel = window.getSelection();
      if (sel && editableRef.current?.contains(sel.anchorNode)) {
        saveSelection();
        setIsBoldActive(document.queryCommandState('bold'));
        setIsItalicActive(document.queryCommandState('italic'));
      }
    };
    document.addEventListener('selectionchange', handleSelChange);
    return () => document.removeEventListener('selectionchange', handleSelChange);
  }, []);

  // Initial HTML content (convert plain text newlines to <br>)
  const initialHtml = (shape.text || '').replace(/\n/g, '<br>');

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'auto' }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Floating format toolbar */}
      <div
        style={{
          position: 'fixed',
          left: screenX,
          top: screenY - 38 >= 0 ? screenY - 38 : screenY + screenH + 4,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          padding: '3px 5px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          userSelect: 'none',
        }}
      >
        <button type="button" onMouseDown={handleBold}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: 'none', background: isBoldActive ? '#e0e7ff' : 'transparent', cursor: 'pointer', color: isBoldActive ? '#4338ca' : '#374151' }}
          title="Fet (markerad text)">
          <Bold size={14} />
        </button>
        <button type="button" onMouseDown={handleItalic}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: 'none', background: isItalicActive ? '#e0e7ff' : 'transparent', cursor: 'pointer', color: isItalicActive ? '#4338ca' : '#374151' }}
          title="Kursiv (markerad text)">
          <Italic size={14} />
        </button>
        <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 3px' }} />
        <button type="button" onMouseDown={(e) => handleFontSizeChange(-1, e)}
          style={{ width: 24, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: '#374151' }}
          title="Mindre (markerad text)">
          <Minus size={12} />
        </button>
        <span style={{ minWidth: 20, textAlign: 'center', fontSize: 11, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>Aa</span>
        <button type="button" onMouseDown={(e) => handleFontSizeChange(1, e)}
          style={{ width: 24, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: '#374151' }}
          title="Större (markerad text)">
          <Plus size={12} />
        </button>
      </div>

      {/* Contenteditable div — rich text editing */}
      <div
        ref={editableRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
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
          background: bgColor,
          border: isStickyNote ? '2px solid #f59e0b' : '2px solid #3b82f6',
          borderRadius: isStickyNote ? 2 : 4,
          outline: 'none',
          overflow: 'auto',
          lineHeight: 1.4,
          boxSizing: 'border-box',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          cursor: 'text',
        }}
      />
    </div>
  );
};
