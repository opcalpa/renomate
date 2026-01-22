import { memo } from "react";
import { Tool } from "./types";
import { Hand, Minus, DoorOpen, RectangleHorizontal, Square, Circle, Triangle, RulerIcon } from "lucide-react";

interface ToolContextMenuProps {
  x: number;
  y: number;
  recentTools: Tool[];
  onSelectTool: (tool: Tool) => void;
  onClose: () => void;
}

const getToolIcon = (tool: Tool) => {
  switch (tool) {
    case 'select': return Hand;
    case 'wall': return Minus;
    case 'door': return DoorOpen;
    case 'opening': return RectangleHorizontal;
    case 'rectangle': return Square;
    case 'circle': return Circle;
    case 'triangle': return Triangle;
    case 'measure': return RulerIcon;
    default: return Hand;
  }
};

const getToolName = (tool: Tool): string => {
  switch (tool) {
    case 'select': return 'Select';
    case 'wall': return 'Wall';
    case 'door': return 'Door';
    case 'opening': return 'Wall Opening';
    case 'rectangle': return 'Rectangle';
    case 'circle': return 'Circle';
    case 'triangle': return 'Triangle';
    case 'measure': return 'Measure';
    case 'text': return 'Text';
    case 'symbol': return 'Objects';
    default: return tool;
  }
};

export const ToolContextMenu = memo(({ x, y, recentTools, onSelectTool, onClose }: ToolContextMenuProps) => {
  const topTools = recentTools.slice(0, 3);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Context Menu */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
        style={{
          left: `${x}px`,
          top: `${y}px`,
        }}
      >
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Recent Tools
        </div>
        {topTools.map((tool, index) => {
          const Icon = getToolIcon(tool);
          return (
            <button
              key={`${tool}-${index}`}
              className="w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left text-sm"
              onClick={() => {
                onSelectTool(tool);
                onClose();
              }}
            >
              <Icon className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-700">{getToolName(tool)}</span>
              {index === 0 && (
                <span className="ml-auto text-xs text-gray-400">Most recent</span>
              )}
            </button>
          );
        })}
        {topTools.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-500 italic">
            No recent tools
          </div>
        )}
      </div>
    </>
  );
});

ToolContextMenu.displayName = "ToolContextMenu";
