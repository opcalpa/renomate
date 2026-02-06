import { memo } from "react";
import { Tool } from "./types";
import {
  MousePointer2,
  Minus,
  Home,
  Square,
  Circle,
  Type,
  Pencil,
  Eraser,
  Scissors,
  Link,
  Spline,
  ImagePlus,
  Sparkles,
  Copy,
  Info,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Layers,
  Grid3X3,
} from "lucide-react";

// Custom icons
const WindowLineIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" y1="10" x2="20" y2="10" strokeWidth="1" />
    <line x1="4" y1="14" x2="20" y2="14" strokeWidth="1" />
    <line x1="12" y1="10" x2="12" y2="14" strokeWidth="1" />
  </svg>
);

const DoorLineIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" y1="12" x2="14" y2="12" strokeWidth="2" />
    <path d="M 14 12 Q 14 6 20 6" fill="none" strokeWidth="1" />
  </svg>
);

// Pinterest Logo SVG
const PinterestLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);

interface ToolContextMenuProps {
  x: number;
  y: number;
  recentTools: Tool[];
  onSelectTool: (tool: Tool) => void;
  onClose: () => void;
  onOpenAIImport?: () => void;
  onOpenImageImport?: () => void;
  onOpenPinterestImport?: () => void;
  onOpenTemplates?: () => void;
  // Selection-related actions
  hasSelection?: boolean;
  selectionCount?: number;
  selectionType?: string; // 'wall', 'room', 'shape', etc.
  hasRoomInSelection?: boolean; // True if at least one room is in the selection
  onShowProperties?: () => void;
  onDeleteSelection?: () => void;
  // Layer ordering actions
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  // Room-specific actions
  onCreateWallsFromRoom?: () => void;
}

type IconComponent = React.FC<{ className?: string }>;

const getToolIcon = (tool: Tool): IconComponent => {
  switch (tool) {
    case 'select': return MousePointer2;
    case 'wall': return Minus;
    case 'room': return Home;
    case 'rectangle': return Square;
    case 'circle': return Circle;
    case 'text': return Type;
    case 'freehand': return Pencil;
    case 'eraser': return Eraser;
    case 'scissors': return Scissors;
    case 'glue': return Link;
    case 'bezier': return Spline;
    case 'window_line': return WindowLineIcon;
    case 'door_line': return DoorLineIcon;
    case 'sliding_door_line': return DoorLineIcon;
    default: return MousePointer2;
  }
};

const getToolName = (tool: Tool): string => {
  switch (tool) {
    case 'select': return 'Välj';
    case 'wall': return 'Vägg';
    case 'room': return 'Rum';
    case 'rectangle': return 'Rektangel';
    case 'circle': return 'Cirkel';
    case 'text': return 'Text';
    case 'freehand': return 'Frihand';
    case 'eraser': return 'Sudd';
    case 'scissors': return 'Sax';
    case 'glue': return 'Klistra';
    case 'bezier': return 'Kurva';
    case 'window_line': return 'Fönster';
    case 'door_line': return 'Dörr';
    case 'sliding_door_line': return 'Skjutdörr';
    default: return tool;
  }
};

export const ToolContextMenu = memo(({
  x,
  y,
  recentTools,
  onSelectTool,
  onClose,
  onOpenAIImport,
  onOpenImageImport,
  onOpenPinterestImport,
  onOpenTemplates,
  hasSelection,
  selectionCount,
  selectionType,
  hasRoomInSelection,
  onShowProperties,
  onDeleteSelection,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onCreateWallsFromRoom,
}: ToolContextMenuProps) => {
  // Get top 3 unique recent tools
  const topTools = recentTools.slice(0, 3);

  // Adjust position to keep menu on screen
  const menuWidth = 200;
  const menuHeight = hasSelection ? 450 : 250;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 20);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 20);

  // Get selection label
  const getSelectionLabel = () => {
    if (!hasSelection || !selectionCount) return '';
    if (selectionCount === 1) {
      switch (selectionType) {
        case 'wall':
        case 'line': return '1 vägg markerad';
        case 'room': return '1 rum markerat';
        default: return '1 objekt markerat';
      }
    }
    return `${selectionCount} objekt markerade`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Context Menu */}
      <div
        className="fixed z-[101] bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/50 py-1.5 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
        style={{
          left: `${adjustedX}px`,
          top: `${adjustedY}px`,
        }}
      >
        {/* Selection Actions Section - shown when something is selected */}
        {hasSelection && (
          <>
            <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {getSelectionLabel()}
            </div>

            {onShowProperties && (
              <button
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
                onClick={() => {
                  onShowProperties();
                  onClose();
                }}
              >
                <Info className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Visa egenskaper</span>
                <span className="ml-auto text-[10px] text-gray-400">⌘I</span>
              </button>
            )}

            {onDeleteSelection && (
              <button
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-red-50 transition-colors text-left"
                onClick={() => {
                  onDeleteSelection();
                  onClose();
                }}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-gray-700">Ta bort</span>
                <span className="ml-auto text-[10px] text-gray-400">⌫</span>
              </button>
            )}

            {/* Room-specific actions */}
            {(selectionType === 'room' || hasRoomInSelection) && onCreateWallsFromRoom && (
              <>
                <div className="my-1.5 border-t border-gray-100" />
                <button
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-green-50 transition-colors text-left"
                  onClick={() => {
                    onCreateWallsFromRoom();
                    onClose();
                  }}
                >
                  <Grid3X3 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Skapa väggar</span>
                </button>
              </>
            )}

            {/* Divider before layer ordering */}
            <div className="my-1.5 border-t border-gray-100" />

            {/* Layer Ordering Section */}
            <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              Lagerordning
            </div>

            <div className="grid grid-cols-2 gap-1 px-2 pb-1">
              {onBringToFront && (
                <button
                  className="px-2 py-1.5 flex items-center gap-2 hover:bg-blue-50 transition-colors text-left rounded"
                  onClick={() => {
                    onBringToFront();
                    onClose();
                  }}
                >
                  <ArrowUpToLine className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-700">Överst</span>
                </button>
              )}
              {onSendToBack && (
                <button
                  className="px-2 py-1.5 flex items-center gap-2 hover:bg-blue-50 transition-colors text-left rounded"
                  onClick={() => {
                    onSendToBack();
                    onClose();
                  }}
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-700">Underst</span>
                </button>
              )}
              {onBringForward && (
                <button
                  className="px-2 py-1.5 flex items-center gap-2 hover:bg-blue-50 transition-colors text-left rounded"
                  onClick={() => {
                    onBringForward();
                    onClose();
                  }}
                >
                  <ArrowUp className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-700">Framåt</span>
                </button>
              )}
              {onSendBackward && (
                <button
                  className="px-2 py-1.5 flex items-center gap-2 hover:bg-blue-50 transition-colors text-left rounded"
                  onClick={() => {
                    onSendBackward();
                    onClose();
                  }}
                >
                  <ArrowDown className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-700">Bakåt</span>
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="my-1.5 border-t border-gray-100" />
          </>
        )}

        {/* Recent Tools Section */}
        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Senaste verktyg
        </div>

        {topTools.length > 0 ? (
          topTools.map((tool, index) => {
            const Icon = getToolIcon(tool);
            return (
              <button
                key={`${tool}-${index}`}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
                onClick={() => {
                  onSelectTool(tool);
                  onClose();
                }}
              >
                <Icon className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{getToolName(tool)}</span>
                {index === 0 && (
                  <span className="ml-auto text-[10px] text-blue-500 font-medium">Senast</span>
                )}
              </button>
            );
          })
        ) : (
          <div className="px-3 py-2 text-sm text-gray-400 italic">
            Inga senaste verktyg
          </div>
        )}

        {/* Divider */}
        <div className="my-1.5 border-t border-gray-100" />

        {/* Quick Actions Section */}
        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Snabbåtgärder
        </div>

        {onOpenAIImport && (
          <button
            className="w-full px-3 py-2 flex items-center gap-3 hover:bg-purple-50 transition-colors text-left"
            onClick={() => {
              onOpenAIImport();
              onClose();
            }}
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">AI Import</span>
          </button>
        )}

        {onOpenImageImport && (
          <button
            className="w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
            onClick={() => {
              onOpenImageImport();
              onClose();
            }}
          >
            <ImagePlus className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Importera bild</span>
          </button>
        )}

        {onOpenPinterestImport && (
          <button
            className="w-full px-3 py-2 flex items-center gap-3 hover:bg-[#E60023]/5 transition-colors text-left"
            onClick={() => {
              onOpenPinterestImport();
              onClose();
            }}
          >
            <PinterestLogo className="w-4 h-4 text-[#E60023]" />
            <span className="text-sm font-medium text-gray-700">Importera Pin</span>
          </button>
        )}

        {onOpenTemplates && (
          <button
            className="w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
            onClick={() => {
              onOpenTemplates();
              onClose();
            }}
          >
            <Copy className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Mallar</span>
          </button>
        )}
      </div>
    </>
  );
});

ToolContextMenu.displayName = "ToolContextMenu";
