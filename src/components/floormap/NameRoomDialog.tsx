import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROOM_PRESETS } from './roomPresets';
import { cn } from '@/lib/utils';

interface NameRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (roomName: string, color?: string) => void;
  onCancel: () => void;
  defaultName?: string;
}

export const NameRoomDialog: React.FC<NameRoomDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  defaultName = '',
}) => {
  const { t } = useTranslation();
  const [roomName, setRoomName] = useState(defaultName);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handleConfirm = () => {
    if (roomName.trim()) {
      const preset = ROOM_PRESETS.find(p => p.value === selectedPreset);
      onConfirm(roomName.trim(), preset?.color);
      setRoomName('');
      setSelectedPreset(null);
    }
  };

  const handleCancel = () => {
    onCancel();
    setRoomName('');
    setSelectedPreset(null);
  };

  const handlePresetClick = (preset: typeof ROOM_PRESETS[0]) => {
    setSelectedPreset(preset.value);
    setRoomName(t(preset.labelKey, preset.defaultName));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && roomName.trim()) {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('nameRoomDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('nameRoomDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Room type presets */}
          <div className="grid grid-cols-3 gap-2">
            {ROOM_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isActive = selectedPreset === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t(preset.labelKey, preset.defaultName)}</span>
                </button>
              );
            })}
          </div>

          {/* Custom name input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="room-name" className="text-right">
              {t('common.name')}
            </Label>
            <Input
              id="room-name"
              value={roomName}
              onChange={(e) => {
                setRoomName(e.target.value);
                setSelectedPreset(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('nameRoomDialog.placeholder')}
              className="col-span-3"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            onClick={handleConfirm}
            disabled={!roomName.trim()}
          >
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
