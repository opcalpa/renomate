import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Home, Plus, Search, Trash2, MapPin, Calendar, X, ArrowUpDown, LayoutGrid, Table as TableIcon, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";

type SortOption = 'name_asc' | 'name_desc' | 'area_desc' | 'area_asc' | 'created_desc' | 'created_asc';
type ViewMode = 'cards' | 'table';
type FieldKey = 'area' | 'perimeter' | 'status' | 'floorMaterial' | 'wallColor' | 'ceilingHeight' | 'priority' | 'created';

const SORT_STORAGE_KEY = 'renomate_rooms_sort';
const VIEW_MODE_STORAGE_KEY = 'renomate_rooms_view_mode';
const VISIBLE_FIELDS_STORAGE_KEY = 'renomate_rooms_visible_fields';

const DEFAULT_VISIBLE_FIELDS: FieldKey[] = ['area', 'status', 'created'];

interface FloorSpec {
  material?: string;
  specification?: string;
}

interface WallSpec {
  main_color?: string;
  treatments?: string[];
}

interface Room {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status?: string | null;
  priority?: string | null;
  ceiling_height_mm?: number | null;
  floor_spec?: FloorSpec | null;
  wall_spec?: WallSpec | null;
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

// Field definitions for visibility toggle
const FIELD_DEFINITIONS: { key: FieldKey; labelKey: string }[] = [
  { key: 'area', labelKey: 'rooms.area' },
  { key: 'perimeter', labelKey: 'rooms.perimeter' },
  { key: 'status', labelKey: 'common.status' },
  { key: 'floorMaterial', labelKey: 'rooms.floorMaterial' },
  { key: 'wallColor', labelKey: 'rooms.wallColor' },
  { key: 'ceilingHeight', labelKey: 'rooms.ceilingHeight' },
  { key: 'priority', labelKey: 'rooms.priority' },
  { key: 'created', labelKey: 'rooms.createdOn' },
];

export const RoomsList = ({ projectId, rooms: externalRooms, onRoomClick, onAddRoom, onDeleteRoom, onNavigateToRoom, onPlaceRoom }: RoomsListProps) => {
  const { t, i18n } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(!externalRooms);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Sort option with localStorage
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SORT_STORAGE_KEY);
      if (saved && ['name_asc', 'name_desc', 'area_desc', 'area_asc', 'created_desc', 'created_asc'].includes(saved)) {
        return saved as SortOption;
      }
    }
    return 'created_desc';
  });

  // View mode with localStorage (default to cards)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === 'table' || saved === 'cards') {
        return saved;
      }
    }
    return 'cards';
  });

  // Visible fields with localStorage
  const [visibleFields, setVisibleFields] = useState<Set<FieldKey>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VISIBLE_FIELDS_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as FieldKey[];
          return new Set(parsed);
        } catch {
          // Invalid JSON, use defaults
        }
      }
    }
    return new Set(DEFAULT_VISIBLE_FIELDS);
  });

  // Check if we're on desktop (for table view availability)
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

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

  // Handle sort change with localStorage persistence
  const handleSortChange = useCallback((value: SortOption) => {
    setSortOption(value);
    localStorage.setItem(SORT_STORAGE_KEY, value);
  }, []);

  // Handle view mode change with localStorage persistence
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  }, []);

  // Handle field visibility toggle with localStorage persistence
  const toggleFieldVisibility = useCallback((field: FieldKey) => {
    setVisibleFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      localStorage.setItem(VISIBLE_FIELDS_STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  // Filter and sort rooms
  const filteredRooms = useMemo(() => {
    const filtered = rooms.filter(room =>
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'name_asc':
          return a.name.localeCompare(b.name, i18n.language);
        case 'name_desc':
          return b.name.localeCompare(a.name, i18n.language);
        case 'area_desc':
          return (b.dimensions?.area_sqm ?? 0) - (a.dimensions?.area_sqm ?? 0);
        case 'area_asc':
          return (a.dimensions?.area_sqm ?? 0) - (b.dimensions?.area_sqm ?? 0);
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });
  }, [rooms, searchTerm, sortOption, i18n.language]);

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

  // Get status label
  const getStatusLabel = (status: string | null | undefined) => {
    if (!status) return '—';
    const statusMap: Record<string, string> = {
      existing: t('roomStatuses.existing', 'Befintligt'),
      to_be_renovated: t('roomStatuses.toBeRenovated', 'Renoveras'),
      new_construction: t('roomStatuses.newConstruction', 'Nybygge'),
    };
    return statusMap[status] || status;
  };

  // Get priority label
  const getPriorityLabel = (priority: string | null | undefined) => {
    if (!priority) return '—';
    const priorityMap: Record<string, string> = {
      low: t('priorities.low', 'Låg'),
      medium: t('priorities.medium', 'Medel'),
      high: t('priorities.high', 'Hög'),
    };
    return priorityMap[priority] || priority;
  };

  // Render field value for cards
  const renderFieldValue = (room: Room, field: FieldKey): React.ReactNode => {
    switch (field) {
      case 'area':
        return room.dimensions?.area_sqm ? (
          <span className="text-sm">
            <span className="text-muted-foreground">{t('rooms.area')}:</span>{' '}
            <span className="font-medium text-blue-600">{room.dimensions.area_sqm.toFixed(2)} m²</span>
          </span>
        ) : null;
      case 'perimeter':
        return room.dimensions?.perimeter_mm ? (
          <span className="text-sm">
            <span className="text-muted-foreground">{t('rooms.perimeter')}:</span>{' '}
            <span className="font-medium">{(room.dimensions.perimeter_mm / 1000).toFixed(2)} m</span>
          </span>
        ) : null;
      case 'status':
        return room.status ? (
          <Badge variant="outline" className="text-xs">
            {getStatusLabel(room.status)}
          </Badge>
        ) : null;
      case 'floorMaterial':
        return room.floor_spec?.material ? (
          <span className="text-sm">
            <span className="text-muted-foreground">{t('rooms.floorMaterial')}:</span>{' '}
            <span className="font-medium">{room.floor_spec.material}</span>
          </span>
        ) : null;
      case 'wallColor':
        return room.wall_spec?.main_color ? (
          <span className="text-sm">
            <span className="text-muted-foreground">{t('rooms.wallColor')}:</span>{' '}
            <span className="font-medium">{room.wall_spec.main_color}</span>
          </span>
        ) : null;
      case 'ceilingHeight':
        return room.ceiling_height_mm ? (
          <span className="text-sm">
            <span className="text-muted-foreground">{t('rooms.ceilingHeight')}:</span>{' '}
            <span className="font-medium">{(room.ceiling_height_mm / 1000).toFixed(2)} m</span>
          </span>
        ) : null;
      case 'priority':
        return room.priority ? (
          <span className="text-sm">
            <span className="text-muted-foreground">{t('rooms.priority')}:</span>{' '}
            <span className="font-medium">{getPriorityLabel(room.priority)}</span>
          </span>
        ) : null;
      case 'created':
        return room.created_at ? (
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(room.created_at)}
          </span>
        ) : null;
      default:
        return null;
    }
  };

  // Get table cell value
  const getTableCellValue = (room: Room, field: FieldKey): string => {
    switch (field) {
      case 'area':
        return room.dimensions?.area_sqm ? `${room.dimensions.area_sqm.toFixed(2)} m²` : '—';
      case 'perimeter':
        return room.dimensions?.perimeter_mm ? `${(room.dimensions.perimeter_mm / 1000).toFixed(2)} m` : '—';
      case 'status':
        return getStatusLabel(room.status);
      case 'floorMaterial':
        return room.floor_spec?.material || '—';
      case 'wallColor':
        return room.wall_spec?.main_color || '—';
      case 'ceilingHeight':
        return room.ceiling_height_mm ? `${(room.ceiling_height_mm / 1000).toFixed(2)} m` : '—';
      case 'priority':
        return getPriorityLabel(room.priority);
      case 'created':
        return room.created_at ? formatDate(room.created_at) : '—';
      default:
        return '—';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const visibleFieldsArray = Array.from(visibleFields);

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

      {/* Search, Sort, View Toggle, and Fields Settings */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('rooms.searchPlaceholder', 'Sök rum...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={sortOption} onValueChange={(v) => handleSortChange(v as SortOption)}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t('rooms.sort', 'Sortera')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name_asc">{t('rooms.sortNameAsc', 'Namn A-Ö')}</SelectItem>
            <SelectItem value="name_desc">{t('rooms.sortNameDesc', 'Namn Ö-A')}</SelectItem>
            <SelectItem value="area_desc">{t('rooms.sortAreaDesc', 'Yta (störst)')}</SelectItem>
            <SelectItem value="area_asc">{t('rooms.sortAreaAsc', 'Yta (minst)')}</SelectItem>
            <SelectItem value="created_desc">{t('rooms.sortCreatedDesc', 'Nyast först')}</SelectItem>
            <SelectItem value="created_asc">{t('rooms.sortCreatedAsc', 'Äldst först')}</SelectItem>
          </SelectContent>
        </Select>

        {/* View mode toggle - only on desktop */}
        {isDesktop && (
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => handleViewModeChange('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => handleViewModeChange('table')}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Fields visibility toggle */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('rooms.fields', 'Fält')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="space-y-2">
              <p className="text-sm font-medium mb-3">{t('rooms.visibleFields', 'Synliga fält')}</p>
              {FIELD_DEFINITIONS.map(({ key, labelKey }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={visibleFields.has(key)}
                    onCheckedChange={() => toggleFieldVisibility(key)}
                  />
                  {t(labelKey, key)}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Rooms List - Card or Table View */}
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
      ) : isDesktop && viewMode === 'table' ? (
        /* Table View - Desktop only */
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>{t('rooms.roomName', 'Namn')}</TableHead>
                {visibleFieldsArray.map(field => (
                  <TableHead key={field}>
                    {t(FIELD_DEFINITIONS.find(f => f.key === field)?.labelKey || field)}
                  </TableHead>
                ))}
                <TableHead className="w-24 text-right">{t('common.actions', 'Åtgärder')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms.map((room) => (
                <TableRow
                  key={room.id}
                  className={`cursor-pointer hover:bg-muted/50 ${selectedRoomIds.has(room.id) ? 'bg-blue-50' : ''}`}
                  onClick={() => onRoomClick(room)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRoomIds.has(room.id)}
                      onCheckedChange={() => toggleRoomSelection(room.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{room.name}</span>
                      {room.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {room.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  {visibleFieldsArray.map(field => (
                    <TableCell key={field} className="text-sm">
                      {field === 'status' && room.status ? (
                        <Badge variant="outline" className="text-xs">
                          {getStatusLabel(room.status)}
                        </Badge>
                      ) : (
                        getTableCellValue(room, field)
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
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
                              onClick={() => {
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
                      {onDeleteRoom && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => onDeleteRoom(room.id)}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Card View - Default and mobile */
        <div className="space-y-2">
          {filteredRooms.map((room) => (
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
                      {/* Dynamic fields based on visibility settings */}
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        {visibleFieldsArray.map(field => {
                          const value = renderFieldValue(room, field);
                          return value ? <span key={field}>{value}</span> : null;
                        })}
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
          ))}
        </div>
      )}
    </div>
  );
};
