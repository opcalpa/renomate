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
    { key: "Ctrl/⌘ + Z", action: "Ångra" },
    { key: "Ctrl/⌘ + Y", action: "Gör om" },
    { key: "Ctrl/⌘ + A", action: "Markera allt" },
    { key: "Ctrl/⌘ + C", action: "Kopiera" },
    { key: "Ctrl/⌘ + V", action: "Klistra in" },
    { key: "Ctrl/⌘ + D", action: "Duplicera" },
    { key: "Ctrl/⌘ + S", action: "Spara" },
    { key: "Delete", action: "Ta bort markerade" },
    { key: "Escape", action: "Avbryt" },
    { key: "Mouse Wheel", action: "Zooma vid muspekare" },
    { key: "Space + Drag", action: "Panorera canvas" },
    { key: "Double-click", action: "Redigera rum/egenskaper" },
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
          <DialogTitle>{t("Keyboard Shortcuts")}</DialogTitle>
          <DialogDescription>
            {t("Quick reference for Space Planner")}
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
        <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-muted-foreground">
          <strong>Tip:</strong> Use the grid and snap features for precise measurements. Right-click
          any shape to assign it to a room for color coding.
        </div>
      </DialogContent>
    </Dialog>
  );
};
