import React, { useState, ReactNode } from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface SubmenuItem {
  id: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  shortcut?: string;
  onClick: () => void;
  isActive?: boolean;
}

interface ToolbarSubmenuProps {
  icon: LucideIcon;
  label: string;
  tooltip: string;
  items: SubmenuItem[];
  isActive?: boolean;
  activeItemId?: string;
}

export const ToolbarSubmenu: React.FC<ToolbarSubmenuProps> = ({
  icon: Icon,
  label,
  tooltip,
  items,
  isActive = false,
  activeItemId,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Find the active item to potentially show its icon
  const activeItem = items.find(item => item.id === activeItemId || item.isActive);

  return (
    <div className="relative group">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant={isActive ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "w-12 h-12 relative",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {/* Submenu indicator */}
                <ChevronRight className="h-2.5 w-2.5 absolute bottom-1 right-1 opacity-60" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{tooltip}</p>
              <p className="text-xs text-muted-foreground">Klicka för verktyg</p>
            </div>
          </TooltipContent>
        </Tooltip>

        <PopoverContent
          side="right"
          align="start"
          className={cn(
            "w-56 p-2 ml-2",
            "bg-white/95 backdrop-blur-xl",
            "border border-white/20",
            "rounded-xl shadow-lg shadow-black/10",
            "animate-in fade-in slide-in-from-left-2 duration-200"
          )}
        >
          <div className="flex flex-col gap-1">
            <div className="px-2 py-1.5 text-sm font-semibold border-b border-border/50 mb-1 text-gray-700">
              {label}
            </div>

            {items.map((item) => {
              const ItemIcon = item.icon;
              const isItemActive = item.id === activeItemId || item.isActive;

              return (
                <Button
                  key={item.id}
                  variant={isItemActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-start gap-3 h-10 px-2",
                    "hover:bg-black/5",
                    isItemActive && "bg-primary/10 text-primary"
                  )}
                  onClick={() => {
                    item.onClick();
                    setIsOpen(false);
                  }}
                >
                  <ItemIcon className={cn("h-4 w-4", isItemActive && "text-primary")} />
                  <div className="flex flex-col items-start flex-1">
                    <span className="text-sm">{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </div>
                  {item.shortcut && (
                    <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                      {item.shortcut}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
