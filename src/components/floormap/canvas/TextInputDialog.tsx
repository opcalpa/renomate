/**
 * Text Input Dialog
 *
 * Dialog for creating and editing text shapes on the canvas.
 * Supports font size, bold/italic styling, rotation, and background.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { FloorMapShape } from '../types';
import { toast } from 'sonner';

export interface TextDialogState {
  isOpen: boolean;
  value: string;
  isBold: boolean;
  isItalic: boolean;
  fontSize: number;
  rotation: 0 | 90 | 180 | 270;
  hasBackground: boolean;
  editingShapeId: string | null;
  pendingPosition: { x: number; y: number; width?: number; height?: number } | null;
}

export const initialTextDialogState: TextDialogState = {
  isOpen: false,
  value: '',
  isBold: false,
  isItalic: false,
  fontSize: 16,
  rotation: 0,
  hasBackground: false,
  editingShapeId: null,
  pendingPosition: null,
};

interface TextInputDialogProps {
  state: TextDialogState;
  onStateChange: (state: Partial<TextDialogState>) => void;
  onSubmit: (shape: FloorMapShape) => void;
  onUpdate: (shapeId: string, updates: Partial<FloorMapShape>) => void;
  currentPlanId: string | null;
}

export const TextInputDialog: React.FC<TextInputDialogProps> = ({
  state,
  onStateChange,
  onSubmit,
  onUpdate,
  currentPlanId,
}) => {
  const handleClose = useCallback(() => {
    onStateChange(initialTextDialogState);
  }, [onStateChange]);

  const handleSubmit = useCallback(() => {
    if (!state.value.trim()) return;

    if (state.editingShapeId) {
      // Edit existing text shape
      onUpdate(state.editingShapeId, {
        text: state.value,
        textStyle: {
          isBold: state.isBold,
          isItalic: state.isItalic,
        },
        fontSize: state.fontSize,
        textRotation: state.rotation,
        hasBackground: state.hasBackground,
      });
      toast.success('Text uppdaterad');
    } else if (state.pendingPosition && currentPlanId) {
      // Create new text shape
      const newShape: FloorMapShape = {
        id: uuidv4(),
        planId: currentPlanId,
        type: 'text',
        coordinates: {
          x: state.pendingPosition.x,
          y: state.pendingPosition.y,
          width: state.pendingPosition.width,
          height: state.pendingPosition.height,
        },
        text: state.value,
        textStyle: {
          isBold: state.isBold,
          isItalic: state.isItalic,
        },
        fontSize: state.fontSize,
        textRotation: state.rotation,
        hasBackground: state.hasBackground,
      };
      onSubmit(newShape);
      toast.success('Text tillagd');
    }

    handleClose();
  }, [state, currentPlanId, onSubmit, onUpdate, handleClose]);

  const FONT_SIZES = [
    { label: 'S', value: 12 },
    { label: 'M', value: 16 },
    { label: 'L', value: 24 },
    { label: 'XL', value: 36 },
  ];

  const ROTATIONS = [0, 90, 180, 270] as const;

  return (
    <Dialog open={state.isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {state.editingShapeId ? 'Redigera text' : 'Lägg till text'}
          </DialogTitle>
          <DialogDescription>
            {state.editingShapeId
              ? 'Ändra textinnehåll och stil.'
              : 'Skriv text och välj stil för att placera på ritningen.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Text content */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Text</label>
            <Input
              value={state.value}
              onChange={(e) => onStateChange({ value: e.target.value })}
              placeholder="Skriv din text här..."
              autoFocus
            />
          </div>

          {/* Font size */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Storlek</label>
            <div className="flex gap-2">
              {FONT_SIZES.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onStateChange({ fontSize: preset.value })}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    state.fontSize === preset.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Stil</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onStateChange({ isBold: !state.isBold })}
                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${
                  state.isBold
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => onStateChange({ isItalic: !state.isItalic })}
                className={`px-3 py-1.5 rounded-md text-sm italic transition-colors ${
                  state.isItalic
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                I
              </button>
              <button
                type="button"
                onClick={() => onStateChange({ hasBackground: !state.hasBackground })}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  state.hasBackground
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
                title="Bakgrund"
              >
                ▢
              </button>
            </div>
          </div>

          {/* Rotation */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rotation</label>
            <div className="flex gap-2">
              {ROTATIONS.map((angle) => (
                <button
                  key={angle}
                  type="button"
                  onClick={() => onStateChange({ rotation: angle })}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    state.rotation === angle
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {angle}°
                </button>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!state.value.trim()}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.editingShapeId ? 'Spara' : 'Lägg till'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Hook for managing text dialog state.
 * Use this for easier integration with existing components.
 */
export function useTextDialog() {
  const [state, setState] = useState<TextDialogState>(initialTextDialogState);

  const updateState = useCallback((updates: Partial<TextDialogState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const openForCreate = useCallback((position: { x: number; y: number; width?: number; height?: number }) => {
    setState({
      ...initialTextDialogState,
      isOpen: true,
      pendingPosition: position,
    });
  }, []);

  const openForEdit = useCallback((shape: FloorMapShape) => {
    if (shape.type !== 'text') return;

    setState({
      isOpen: true,
      value: shape.text || '',
      isBold: shape.textStyle?.isBold || false,
      isItalic: shape.textStyle?.isItalic || false,
      fontSize: shape.fontSize || 16,
      rotation: (shape.textRotation || 0) as 0 | 90 | 180 | 270,
      hasBackground: shape.hasBackground || false,
      editingShapeId: shape.id,
      pendingPosition: null,
    });
  }, []);

  const close = useCallback(() => {
    setState(initialTextDialogState);
  }, []);

  return {
    state,
    updateState,
    openForCreate,
    openForEdit,
    close,
  };
}
