/**
 * Pinterest Picker Component
 *
 * Allows users to browse and select pins from their Pinterest boards
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Check, Grid3X3, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  getPinterestBoards,
  getBoardPins,
  getPinImageUrl,
  isPinterestConnected,
  PinterestBoard,
  PinterestPin,
} from "@/services/pinterest";
import { PinterestConnect } from "./PinterestConnect";

interface PinterestPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (pins: SelectedPin[]) => void;
  multiSelect?: boolean;
  maxSelect?: number;
}

export interface SelectedPin {
  pinId: string;
  imageUrl: string;
  title?: string;
  description?: string;
  sourceUrl?: string;
}

type ViewMode = 'boards' | 'pins';

export function PinterestPicker({
  open,
  onOpenChange,
  onSelect,
  multiSelect = true,
  maxSelect = 20,
}: PinterestPickerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('boards');
  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [boardsBookmark, setBoardsBookmark] = useState<string | undefined>();

  const [selectedBoard, setSelectedBoard] = useState<PinterestBoard | null>(null);
  const [pins, setPins] = useState<PinterestPin[]>([]);
  const [pinsBookmark, setPinsBookmark] = useState<string | undefined>();

  const [selectedPins, setSelectedPins] = useState<Set<string>>(new Set());

  // Check connection on open
  useEffect(() => {
    if (open) {
      checkConnectionAndLoadBoards();
    }
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setViewMode('boards');
      setSelectedBoard(null);
      setPins([]);
      setSelectedPins(new Set());
    }
  }, [open]);

  const checkConnectionAndLoadBoards = async () => {
    setLoading(true);
    try {
      const connected = await isPinterestConnected();
      setIsConnected(connected);

      if (connected) {
        await loadBoards();
      }
    } catch (error) {
      console.error("Error checking Pinterest connection:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBoards = async (bookmark?: string) => {
    if (bookmark) {
      setLoadingMore(true);
    }

    try {
      const result = await getPinterestBoards(25, bookmark);
      if (result) {
        if (bookmark) {
          setBoards(prev => [...prev, ...result.items]);
        } else {
          setBoards(result.items);
        }
        setBoardsBookmark(result.bookmark);
      }
    } catch (error) {
      console.error("Error loading boards:", error);
      toast.error("Kunde inte ladda Pinterest-boards");
    } finally {
      setLoadingMore(false);
    }
  };

  const loadBoardPins = async (boardId: string, bookmark?: string) => {
    if (bookmark) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await getBoardPins(boardId, 50, bookmark);
      if (result) {
        if (bookmark) {
          setPins(prev => [...prev, ...result.items]);
        } else {
          setPins(result.items);
        }
        setPinsBookmark(result.bookmark);
      }
    } catch (error) {
      console.error("Error loading pins:", error);
      toast.error("Kunde inte ladda pins");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleBoardSelect = async (board: PinterestBoard) => {
    setSelectedBoard(board);
    setViewMode('pins');
    setPins([]);
    setPinsBookmark(undefined);
    await loadBoardPins(board.id);
  };

  const handleBackToBoards = () => {
    setViewMode('boards');
    setSelectedBoard(null);
    setPins([]);
    setSelectedPins(new Set());
  };

  const handlePinToggle = (pinId: string) => {
    setSelectedPins(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pinId)) {
        newSet.delete(pinId);
      } else {
        if (!multiSelect) {
          newSet.clear();
        }
        if (newSet.size < maxSelect) {
          newSet.add(pinId);
        } else {
          toast.error(`Max ${maxSelect} bilder kan väljas`);
          return prev;
        }
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    const selected: SelectedPin[] = [];

    pins.forEach(pin => {
      if (selectedPins.has(pin.id)) {
        const imageUrl = getPinImageUrl(pin, 'large');
        if (imageUrl) {
          selected.push({
            pinId: pin.id,
            imageUrl,
            title: pin.title,
            description: pin.description,
            sourceUrl: pin.link,
          });
        }
      }
    });

    onSelect(selected);
    onOpenChange(false);
  };

  const handleConnected = () => {
    setIsConnected(true);
    loadBoards();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {viewMode === 'pins' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 mr-1"
                onClick={handleBackToBoards}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {viewMode === 'boards' ? (
              <>
                <Grid3X3 className="h-5 w-5 text-[#E60023]" />
                Välj Pinterest Board
              </>
            ) : (
              <>
                <ImageIcon className="h-5 w-5 text-[#E60023]" />
                {selectedBoard?.name}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {viewMode === 'boards'
              ? "Välj en board för att se dess bilder"
              : `Välj bilder att importera (${selectedPins.size}/${maxSelect} valda)`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#E60023]" />
            </div>
          ) : !isConnected ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-gray-500">Koppla ditt Pinterest-konto för att importera bilder</p>
              <PinterestConnect onConnected={handleConnected} />
            </div>
          ) : viewMode === 'boards' ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {boards.map(board => (
                  <button
                    key={board.id}
                    onClick={() => handleBoardSelect(board)}
                    className="group relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-[#E60023] transition-all"
                  >
                    {board.image_cover_url ? (
                      <img
                        src={board.image_cover_url}
                        alt={board.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Grid3X3 className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <div className="font-medium truncate">{board.name}</div>
                      <div className="text-xs text-white/70">{board.pin_count} pins</div>
                    </div>
                  </button>
                ))}
              </div>

              {boardsBookmark && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => loadBoards(boardsBookmark)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Ladda fler boards
                  </Button>
                </div>
              )}

              {boards.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Grid3X3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Inga boards hittades</p>
                </div>
              )}
            </ScrollArea>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {pins.map(pin => {
                  const imageUrl = getPinImageUrl(pin, 'medium');
                  if (!imageUrl) return null;

                  const isSelected = selectedPins.has(pin.id);

                  return (
                    <button
                      key={pin.id}
                      onClick={() => handlePinToggle(pin.id)}
                      className={`
                        relative aspect-square rounded-lg overflow-hidden
                        border-2 transition-all
                        ${isSelected
                          ? 'border-[#E60023] ring-2 ring-[#E60023] ring-offset-2'
                          : 'border-transparent hover:border-gray-300'
                        }
                      `}
                    >
                      <img
                        src={imageUrl}
                        alt={pin.title || 'Pinterest pin'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-[#E60023] rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {pinsBookmark && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => selectedBoard && loadBoardPins(selectedBoard.id, pinsBookmark)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Ladda fler pins
                  </Button>
                </div>
              )}

              {pins.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Inga pins i denna board</p>
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        {viewMode === 'pins' && isConnected && (
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedPins.size === 0}
              style={{ backgroundColor: '#E60023' }}
              className="hover:opacity-90"
            >
              Importera {selectedPins.size} {selectedPins.size === 1 ? 'bild' : 'bilder'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PinterestPicker;
