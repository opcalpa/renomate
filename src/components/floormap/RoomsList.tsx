import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Home, Plus, Search, Trash2, MapPin, Calendar, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

interface Room {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  dimensions: {
    area_sqm?: number;
    width_mm?: number;
    height_mm?: number;
    perimeter_mm?: number;
  } | null;
  floor_plan_position: {
    points?: { x: number; y: number }[];
  } | null;
  created_at: string;
  updated_at: string;
}

interface RoomsListProps {
  projectId: string;
  rooms?: Room[];
  onRoomClick: (room: Room) => void;
  onAddRoom?: () => void;
  onDeleteRoom?: (roomId: string) => void;
  onRoomDeleted?: () => void;
  onNavigateToRoom?: (room: Room) => void;
  onPlaceRoom?: (room: Room) => void;
}

export const RoomsList = ({ projectId, rooms: externalRooms, onRoomClick, onAddRoom, onDeleteRoom, onRoomDeleted, onNavigateToRoom, onPlaceRoom }: RoomsListProps) => {
  const { t, i18n } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(!externalRooms);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language === 'sv' ? 'sv-SE' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Check if a room is placed on canvas
  const isRoomPlacedOnCanvas = (room: Room): boolean => {
    return !!(room.floor_plan_position?.points && room.floor_plan_position.points.length > 0);
  };

  // Use external rooms if provided, otherwise fetch locally
  useEffect(() => {
    if (externalRooms) {
      setRooms(externalRooms);
      setLoading(false);
    } else {
      setLoading(true);
      fetchRooms().finally(() => setLoading(false));
    }
  }, [externalRooms, projectId]);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRooms(data || []);
    } catch (error: unknown) {
      console.error("Error fetching rooms:", error);
      toast.error(t('rooms.fetchError', 'Kunde inte hämta rum'));
    }
  };

  // Filter rooms based on search term
  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Selection handlers
  const toggleRoomSelection = useCallback((roomId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedRoomIds(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedRoomIds(new Set(filteredRooms.map(r => r.id)));
  }, [filteredRooms]);

  const clearSelection = useCallback(() => {
    setSelectedRoomIds(new Set());
  }, []);

  const isAllSelected = filteredRooms.length > 0 && filteredRooms.every(r => selectedRoomIds.has(r.id));
  const isSomeSelected = selectedRoomIds.size > 0;

  // Bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    if (selectedRoomIds.size === 0) return;

    const count = selectedRoomIds.size;
    const confirmMessage = t('rooms.confirmBulkDelete', { count });

    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      // Delete rooms one by one to trigger proper callbacks
      for (const roomId of selectedRoomIds) {
        if (onDeleteRoom) {
          onDeleteRoom(roomId);
        }
      }

      clearSelection();
      toast.success(t('rooms.bulkDeleteSuccess', { count }));
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(t('rooms.bulkDeleteError'));
    } finally {
      setIsDeleting(false);
    }
  }, [selectedRoomIds, onDeleteRoom, clearSelection, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t('rooms.title', 'Rum')}</h2>
          <Badge variant="secondary">{rooms.length}</Badge>
        </div>
        {onAddRoom && (
          <Button onClick={onAddRoom} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('rooms.newRoom', 'Nytt rum')}
          </Button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {isSomeSelected && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={(checked) => {
                if (checked) {
                  selectAllFiltered();
                } else {
                  clearSelection();
                }
              }}
            />
            <span className="text-sm font-medium text-blue-800">
              {t('rooms.selectedCount', { count: selectedRoomIds.size })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onDeleteRoom && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {t('rooms.deleteSelected', 'Ta bort')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('rooms.searchPlaceholder', 'Sök rum...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Rooms List */}
      <div className="space-y-2">
        {filteredRooms.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? t('rooms.noRoomsFound', 'Inga rum hittades') : t('rooms.noRoomsYet', 'Inga rum ännu')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? t('rooms.tryAnotherSearch', 'Prova en annan sökning')
                  : t('rooms.drawRoomHint', 'Rita ett rum på ritningen genom att använda Rum-verktyget')}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRooms.map((room) => (
            <Card
              key={room.id}
              className={`hover:bg-accent transition-colors ${selectedRoomIds.has(room.id) ? 'ring-2 ring-blue-400 bg-blue-50/50' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Selection checkbox */}
                    <div className="pt-1">
                      <Checkbox
                        checked={selectedRoomIds.has(room.id)}
                        onCheckedChange={() => toggleRoomSelection(room.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => onRoomClick(room)}
                    >
                    <h3 className="font-medium text-lg">{room.name}</h3>
                    {room.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {room.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3">
                      {room.dimensions?.area_sqm && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">{t('rooms.area', 'Yta')}:</span>
                          <span className="text-sm font-medium text-blue-600">
                            {room.dimensions.area_sqm.toFixed(2)} m²
                          </span>
                        </div>
                      )}
                      {room.dimensions?.perimeter_mm && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">{t('rooms.perimeter', 'Omkrets')}:</span>
                          <span className="text-sm font-medium">
                            {(room.dimensions.perimeter_mm / 1000).toFixed(2)} m
                          </span>
                        </div>
                      )}
                      {room.created_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {formatDate(room.created_at)}
                          </span>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {/* Map Pin Icon - Shows placement status */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={isRoomPlacedOnCanvas(room)
                              ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                              : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isRoomPlacedOnCanvas(room)) {
                                onNavigateToRoom?.(room);
                              } else {
                                onPlaceRoom?.(room);
                              }
                            }}
                          >
                            <MapPin className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isRoomPlacedOnCanvas(room)
                            ? t('rooms.showOnFloorPlan', 'Visa på ritning')
                            : t('rooms.placeOnFloorPlan', 'Placera på ritning')
                          }
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Delete Button */}
                    {onDeleteRoom && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteRoom?.(room.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t('common.delete', 'Ta bort')}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
