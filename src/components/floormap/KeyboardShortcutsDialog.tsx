import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export const KeyboardShortcutsDialog = () => {
  const { t } = useTranslation();

  const shortcuts = [
    { key: "Ctrl/⌘ + Z", action: t('floormap.undo') },
    { key: "Ctrl/⌘ + Y", action: t('floormap.redo') },
    { key: "Ctrl/⌘ + A", action: t('floormap.selectAll') },
    { key: "Ctrl/⌘ + C", action: t('floormap.copy') },
    { key: "Ctrl/⌘ + V", action: t('floormap.paste') },
    { key: "Ctrl/⌘ + D", action: t('floormap.duplicate') },
    { key: "Ctrl/⌘ + S", action: t('common.save') },
    { key: "Delete", action: t('floormap.deleteSelected') },
    { key: "Escape", action: t('common.cancel') },
    { key: "Mouse Wheel", action: t('floormap.zoomAtCursor') },
    { key: "Space + Drag", action: t('floormap.panCanvas') },
    { key: "Double-click", action: t('floormap.editRoomProperties') },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('floormap.keyboardShortcuts', 'Keyboard Shortcuts')}</DialogTitle>
          <DialogDescription>
            {t('floormap.keyboardShortcutsDescription', 'Quick reference for Space Planner')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <span className="text-sm text-muted-foreground">{shortcut.action}</span>
              <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
        {/* Touch gestures section for mobile */}
        <div className="mt-4 space-y-3 md:hidden">
          <h4 className="text-sm font-semibold">{t('floormap.touchGestures', 'Touch Gestures')}</h4>
          {[
            { gesture: t('floormap.touchOneFingerDrag', 'One-finger drag'), action: t('floormap.panCanvas') },
            { gesture: t('floormap.touchPinch', 'Pinch'), action: t('floormap.zoomInOut', 'Zoom in/out') },
            { gesture: t('floormap.touchTapShape', 'Tap shape'), action: t('floormap.selectShape', 'Select shape') },
            { gesture: t('floormap.touchDoubleTap', 'Double-tap room'), action: t('floormap.editRoomProperties') },
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <span className="text-sm text-muted-foreground">{item.action}</span>
              <span className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">
                {item.gesture}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-muted-foreground">
          <strong>Tip:</strong> {t('floormap.shortcutsTip', 'Use the grid and snap features for precise measurements. Right-click any shape to assign it to a room for color coding.')}
        </div>
      </DialogContent>
    </Dialog>
  );
};
