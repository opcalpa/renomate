/**
 * MobileCanvasToolbar — compact floating bottom toolbar for mobile canvas
 *
 * Optimised for touch: large tap targets, essential tools only.
 * Shown only on viewports < 768px (md breakpoint).
 *
 * Primary actions: Select, Post-it, Photo, Comment
 * Secondary (sheet): Text, Connector, Undo, Redo, Delete, Save
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MousePointer2,
  StickyNote,
  Camera,
  MessageCircle,
  MoreHorizontal,
  Type,
  ArrowRight,
  Undo2,
  Redo2,
  Trash2,
  Save,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useFloorMapStore } from './store';
import { cn } from '@/lib/utils';
import type { Tool } from './types';

interface MobileCanvasToolbarProps {
  onSave: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onPhotoCapture?: () => void;
}

interface ToolBtnProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
}

const ToolBtn: React.FC<ToolBtnProps> = ({
  icon: Icon,
  label,
  isActive,
  onClick,
  disabled,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-2 rounded-lg transition-colors',
      disabled && 'opacity-30',
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground active:bg-accent',
    )}
  >
    <Icon className="h-5 w-5" />
    <span className="text-[10px] leading-tight">{label}</span>
  </button>
);

export const MobileCanvasToolbar: React.FC<MobileCanvasToolbarProps> = ({
  onSave,
  onDelete,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onPhotoCapture,
}) => {
  const { t } = useTranslation();
  const { activeTool, setActiveTool } = useFloorMapStore();
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectTool = useCallback(
    (tool: Tool) => {
      setActiveTool(tool);
      setSheetOpen(false);
    },
    [setActiveTool],
  );

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around bg-background/95 backdrop-blur-sm border-t shadow-lg px-2 py-1">
        {/* Select */}
        <ToolBtn
          icon={MousePointer2}
          label={t('floormap.tools.select', 'Välj')}
          isActive={activeTool === 'select'}
          onClick={() => selectTool('select')}
        />

        {/* Post-it */}
        <ToolBtn
          icon={StickyNote}
          label="Post-it"
          isActive={activeTool === 'sticky_note'}
          onClick={() => selectTool('sticky_note')}
        />

        {/* Photo */}
        <ToolBtn
          icon={Camera}
          label={t('common.photo', 'Foto')}
          onClick={() => {
            if (onPhotoCapture) onPhotoCapture();
          }}
        />

        {/* Comment */}
        <ToolBtn
          icon={MessageCircle}
          label={t('comments.thread', 'Kommentar')}
          isActive={activeTool === 'measure'}
          onClick={() => {
            // In comment mode, tap a shape to open comment thread
            // Re-use select tool — comments open on right-click / long-press
            selectTool('select');
          }}
        />

        {/* More — opens sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-2 rounded-lg text-muted-foreground active:bg-accent"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] leading-tight">
                {t('common.more', 'Mer')}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)]">
            <SheetHeader>
              <SheetTitle>{t('floormap.tools.moreTools', 'Fler verktyg')}</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-4 gap-3 py-4">
              <ToolBtn
                icon={Type}
                label={t('floormap.tools.text', 'Text')}
                isActive={activeTool === 'text'}
                onClick={() => selectTool('text')}
              />
              <ToolBtn
                icon={ArrowRight}
                label={t('floormap.tools.connector', 'Koppling')}
                isActive={activeTool === 'connector'}
                onClick={() => selectTool('connector')}
              />
              <ToolBtn
                icon={Undo2}
                label={t('common.undo', 'Ångra')}
                onClick={onUndo}
                disabled={!canUndo}
              />
              <ToolBtn
                icon={Redo2}
                label={t('common.redo', 'Gör om')}
                onClick={onRedo}
                disabled={!canRedo}
              />
              <ToolBtn
                icon={Trash2}
                label={t('common.delete', 'Radera')}
                onClick={() => { onDelete(); setSheetOpen(false); }}
              />
              <ToolBtn
                icon={Save}
                label={t('common.save', 'Spara')}
                onClick={() => { onSave(); setSheetOpen(false); }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
