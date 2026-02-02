import React, { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  label: string;
  value: string;
  description?: string;
}

interface HoverTabMenuProps {
  trigger: React.ReactNode;
  items: MenuItem[];
  onSelect: (value: string) => void;
  onMainClick?: () => void;
  activeValue?: string;
  className?: string;
}

export const HoverTabMenu: React.FC<HoverTabMenuProps> = ({
  trigger,
  items,
  onSelect,
  onMainClick,
  activeValue,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const menuRef = useRef<HTMLDivElement>(null);

  const hasSubmenu = items.length > 0;

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (hasSubmenu) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleItemClick = (value: string) => {
    setIsOpen(false);
    onSelect(value);
  };

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={menuRef}
    >
      {/* Trigger with optional chevron */}
      <div
        className={cn(
          "cursor-pointer transition-colors duration-200 flex items-center gap-1",
          activeValue && "font-semibold"
        )}
        onClick={(e) => {
          onMainClick?.();
          // Toggle dropdown on touch devices (no hover)
          if (hasSubmenu && 'ontouchstart' in window) {
            setIsOpen((prev) => !prev);
          }
        }}
      >
        {trigger}
        {hasSubmenu && (
          <ChevronDown className={cn(
            "h-3 w-3 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && hasSubmenu && (
        <div
          className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-[100] min-w-[200px] py-1"
          onMouseEnter={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          {items.map((item) => (
            <button
              key={item.value}
              onClick={() => handleItemClick(item.value)}
              className={cn(
                "w-full text-left px-4 py-2 hover:bg-accent transition-colors duration-150",
                activeValue === item.value && "bg-accent text-accent-foreground font-medium"
              )}
            >
              <div className="font-medium text-sm">{item.label}</div>
              {item.description && (
                <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
