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

interface NameRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (roomName: string) => void;
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

  const handleConfirm = () => {
    if (roomName.trim()) {
      onConfirm(roomName.trim());
      setRoomName('');
    }
  };

  const handleCancel = () => {
    onCancel();
    setRoomName('');
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="room-name" className="text-right">
              {t('common.name')}
            </Label>
            <Input
              id="room-name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
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
