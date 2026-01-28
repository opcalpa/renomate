/**
 * ElevationSymbolGallery - Gallery for selecting elevation symbols
 *
 * Displays architectural symbols organized by category for use in elevation view.
 * Similar to floor plan template gallery but optimized for elevation objects.
 */

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Search,
  DoorOpen,
  Zap,
  Lightbulb,
  ChefHat,
  Ruler,
  Wind,
  Sofa,
  X,
  Info,
  Plus,
} from 'lucide-react';
import {
  ELEVATION_SYMBOL_DEFINITIONS,
  ELEVATION_SYMBOL_CATEGORIES,
  ElevationSymbolDefinition,
  ElevationSymbolType,
} from './ElevationSymbolLibrary';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ElevationSymbolGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSymbol: (symbol: ElevationSymbolDefinition) => void;
}

// Category icons mapping
const categoryIcons: Record<string, React.ReactNode> = {
  openings: <DoorOpen className="h-4 w-4" />,
  electrical: <Zap className="h-4 w-4" />,
  lighting: <Lightbulb className="h-4 w-4" />,
  kitchen: <ChefHat className="h-4 w-4" />,
  trim: <Ruler className="h-4 w-4" />,
  hvac: <Wind className="h-4 w-4" />,
  furniture: <Sofa className="h-4 w-4" />,
};

// Simple SVG preview icons for symbols
const getSymbolPreview = (type: ElevationSymbolType): React.ReactNode => {
  switch (type) {
    // Openings
    case 'window_standard':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="4" y="8" width="40" height="32" fill="#e0f2fe" stroke="#374151" strokeWidth="2" />
          <line x1="4" y1="24" x2="44" y2="24" stroke="#374151" strokeWidth="1.5" />
          <rect x="4" y="40" width="40" height="4" fill="#d1d5db" stroke="#374151" strokeWidth="1" />
        </svg>
      );
    case 'window_double':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="4" y="8" width="40" height="32" fill="#e0f2fe" stroke="#374151" strokeWidth="2" />
          <line x1="24" y1="8" x2="24" y2="40" stroke="#374151" strokeWidth="2" />
          <rect x="4" y="40" width="40" height="4" fill="#d1d5db" stroke="#374151" strokeWidth="1" />
        </svg>
      );
    case 'window_triple':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="2" y="8" width="44" height="32" fill="#e0f2fe" stroke="#374151" strokeWidth="2" />
          <line x1="16" y1="8" x2="16" y2="40" stroke="#374151" strokeWidth="1.5" />
          <line x1="32" y1="8" x2="32" y2="40" stroke="#374151" strokeWidth="1.5" />
        </svg>
      );
    case 'door_standard':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="8" y="4" width="32" height="40" fill="#f9fafb" stroke="#374151" strokeWidth="2" />
          <rect x="12" y="8" width="12" height="10" stroke="#374151" strokeWidth="1" fill="none" />
          <rect x="26" y="8" width="12" height="10" stroke="#374151" strokeWidth="1" fill="none" />
          <rect x="12" y="22" width="12" height="18" stroke="#374151" strokeWidth="1" fill="none" />
          <rect x="26" y="22" width="12" height="18" stroke="#374151" strokeWidth="1" fill="none" />
          <circle cx="36" cy="26" r="2" fill="#374151" />
        </svg>
      );
    case 'door_double':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="4" y="4" width="40" height="40" fill="#f9fafb" stroke="#374151" strokeWidth="2" />
          <line x1="24" y1="4" x2="24" y2="44" stroke="#374151" strokeWidth="2" />
          <circle cx="20" cy="26" r="2" fill="#374151" />
          <circle cx="28" cy="26" r="2" fill="#374151" />
        </svg>
      );
    case 'door_sliding':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="4" y="4" width="40" height="40" fill="#e0f2fe" stroke="#374151" strokeWidth="2" />
          <rect x="6" y="6" width="18" height="36" fill="#f9fafb" stroke="#374151" strokeWidth="1" />
          <path d="M 32 24 L 40 20 L 40 28 Z" fill="#374151" />
        </svg>
      );
    case 'wall_opening':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="8" y="4" width="32" height="40" fill="none" stroke="#374151" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="8" y1="4" x2="16" y2="4" stroke="#374151" strokeWidth="2" />
          <line x1="8" y1="4" x2="8" y2="12" stroke="#374151" strokeWidth="2" />
          <line x1="40" y1="4" x2="32" y2="4" stroke="#374151" strokeWidth="2" />
          <line x1="40" y1="4" x2="40" y2="12" stroke="#374151" strokeWidth="2" />
        </svg>
      );
    case 'arch_opening':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <path d="M 8 44 L 8 14 Q 8 4 24 4 Q 40 4 40 14 L 40 44" fill="none" stroke="#374151" strokeWidth="2" />
        </svg>
      );

    // Electrical
    case 'outlet_single':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="8" y="8" width="32" height="32" fill="#ffffff" stroke="#374151" strokeWidth="2" rx="4" />
          <circle cx="24" cy="24" r="12" fill="none" stroke="#374151" strokeWidth="1.5" />
          <circle cx="18" cy="24" r="3" fill="#374151" />
          <circle cx="30" cy="24" r="3" fill="#374151" />
          <line x1="24" y1="14" x2="24" y2="18" stroke="#374151" strokeWidth="2" />
          <line x1="24" y1="30" x2="24" y2="34" stroke="#374151" strokeWidth="2" />
        </svg>
      );
    case 'outlet_double':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="4" y="12" width="40" height="24" fill="#ffffff" stroke="#374151" strokeWidth="2" rx="4" />
          <circle cx="16" cy="24" r="8" fill="none" stroke="#374151" strokeWidth="1" />
          <circle cx="12" cy="24" r="2" fill="#374151" />
          <circle cx="20" cy="24" r="2" fill="#374151" />
          <circle cx="32" cy="24" r="8" fill="none" stroke="#374151" strokeWidth="1" />
          <circle cx="28" cy="24" r="2" fill="#374151" />
          <circle cx="36" cy="24" r="2" fill="#374151" />
        </svg>
      );
    case 'outlet_usb':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="8" y="8" width="32" height="32" fill="#ffffff" stroke="#374151" strokeWidth="2" rx="4" />
          <circle cx="24" cy="18" r="6" fill="none" stroke="#374151" strokeWidth="1" />
          <circle cx="21" cy="18" r="1.5" fill="#374151" />
          <circle cx="27" cy="18" r="1.5" fill="#374151" />
          <rect x="18" y="28" width="12" height="8" fill="#374151" rx="1" />
          <text x="24" y="34" textAnchor="middle" fontSize="6" fill="#ffffff">USB</text>
        </svg>
      );
    case 'switch_single':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="8" y="8" width="32" height="32" fill="#ffffff" stroke="#374151" strokeWidth="2" rx="4" />
          <rect x="14" y="14" width="20" height="20" fill="#f3f4f6" stroke="#374151" strokeWidth="1" rx="2" />
          <line x1="24" y1="18" x2="24" y2="26" stroke="#374151" strokeWidth="2" />
        </svg>
      );
    case 'switch_double':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="8" y="4" width="32" height="40" fill="#ffffff" stroke="#374151" strokeWidth="2" rx="4" />
          <rect x="12" y="8" width="24" height="14" fill="#f3f4f6" stroke="#374151" strokeWidth="1" rx="2" />
          <rect x="12" y="26" width="24" height="14" fill="#f3f4f6" stroke="#374151" strokeWidth="1" rx="2" />
          <line x1="24" y1="11" x2="24" y2="17" stroke="#374151" strokeWidth="2" />
          <line x1="24" y1="29" x2="24" y2="35" stroke="#374151" strokeWidth="2" />
        </svg>
      );
    case 'switch_dimmer':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="8" y="8" width="32" height="32" fill="#ffffff" stroke="#374151" strokeWidth="2" rx="4" />
          <circle cx="24" cy="24" r="10" fill="#f3f4f6" stroke="#374151" strokeWidth="1.5" />
          <line x1="24" y1="16" x2="24" y2="20" stroke="#374151" strokeWidth="2" />
          <line x1="18" y1="24" x2="24" y2="24" stroke="#fbbf24" strokeWidth="2" />
        </svg>
      );
    case 'thermostat':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="10" y="6" width="28" height="36" fill="#ffffff" stroke="#374151" strokeWidth="2" rx="4" />
          <circle cx="24" cy="22" r="8" fill="#f3f4f6" stroke="#374151" strokeWidth="1" />
          <text x="24" y="26" textAnchor="middle" fontSize="8" fill="#374151">21°</text>
          <line x1="16" y1="36" x2="32" y2="36" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    // Lighting
    case 'wall_lamp':
    case 'wall_sconce':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="18" y="4" width="12" height="6" fill="#d1d5db" stroke="#374151" strokeWidth="1" />
          <line x1="24" y1="10" x2="24" y2="16" stroke="#374151" strokeWidth="2" />
          <path d="M 10 16 L 38 16 L 32 40 L 16 40 Z" fill="#fef3c7" stroke="#374151" strokeWidth="2" />
          <line x1="8" y1="32" x2="4" y2="40" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="40" y1="32" x2="44" y2="40" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      );
    case 'ceiling_lamp':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <line x1="4" y1="4" x2="44" y2="4" stroke="#374151" strokeWidth="1" strokeDasharray="3 2" />
          <rect x="20" y="4" width="8" height="6" fill="#d1d5db" stroke="#374151" strokeWidth="1" />
          <rect x="12" y="10" width="24" height="32" fill="#ffffff" stroke="#374151" strokeWidth="2" rx="4" />
        </svg>
      );
    case 'pendant_lamp':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="20" y="2" width="8" height="4" fill="#d1d5db" stroke="#374151" strokeWidth="1" />
          <line x1="24" y1="6" x2="24" y2="14" stroke="#374151" strokeWidth="1.5" />
          <path d="M 10 14 Q 10 14 24 14 Q 38 14 38 14 L 32 38 L 16 38 Z" fill="#fef3c7" stroke="#374151" strokeWidth="2" />
          <circle cx="24" cy="22" r="4" fill="#fbbf24" opacity="0.5" />
          <line x1="14" y1="32" x2="10" y2="44" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="34" y1="32" x2="38" y2="44" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      );
    case 'spotlight':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <circle cx="24" cy="24" r="16" fill="#f3f4f6" stroke="#374151" strokeWidth="2" />
          <circle cx="24" cy="24" r="10" fill="#fef3c7" stroke="#374151" strokeWidth="1" />
          <circle cx="24" cy="24" r="4" fill="#fbbf24" />
        </svg>
      );
    case 'led_strip':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="4" y="20" width="40" height="8" fill="#f3f4f6" stroke="#374151" strokeWidth="2" rx="2" />
          <circle cx="10" cy="24" r="2" fill="#fbbf24" />
          <circle cx="18" cy="24" r="2" fill="#fbbf24" />
          <circle cx="26" cy="24" r="2" fill="#fbbf24" />
          <circle cx="34" cy="24" r="2" fill="#fbbf24" />
          <line x1="10" y1="28" x2="10" y2="36" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="26" y1="28" x2="26" y2="36" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      );

    // Kitchen
    case 'cabinet_base':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="4" y="4" width="40" height="36" fill="#f9fafb" stroke="#374151" strokeWidth="2" />
          <rect x="8" y="8" width="32" height="24" fill="none" stroke="#374151" strokeWidth="1" />
          <rect x="8" y="34" width="32" height="4" fill="none" stroke="#374151" strokeWidth="1" />
          <line x1="18" y1="20" x2="30" y2="20" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
          <line x1="18" y1="36" x2="30" y2="36" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
          <rect x="6" y="40" width="36" height="6" fill="#e5e7eb" stroke="#374151" strokeWidth="1" />
        </svg>
      );
    case 'cabinet_wall':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="4" y="8" width="40" height="32" fill="#f9fafb" stroke="#374151" strokeWidth="2" />
          <rect x="8" y="12" width="32" height="24" fill="none" stroke="#374151" strokeWidth="1" />
          <line x1="18" y1="30" x2="30" y2="30" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'cabinet_tall':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="8" y="2" width="32" height="42" fill="#f9fafb" stroke="#374151" strokeWidth="2" />
          <rect x="12" y="6" width="24" height="18" fill="none" stroke="#374151" strokeWidth="1" />
          <rect x="12" y="26" width="24" height="14" fill="none" stroke="#374151" strokeWidth="1" />
          <line x1="18" y1="15" x2="30" y2="15" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
          <line x1="18" y1="33" x2="30" y2="33" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'range_hood':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <path d="M 8 40 L 8 16 L 16 8 L 32 8 L 40 16 L 40 40 Z" fill="#e5e7eb" stroke="#374151" strokeWidth="2" />
          <rect x="12" y="28" width="24" height="8" fill="#d1d5db" stroke="#374151" strokeWidth="1" />
          <circle cx="24" cy="14" r="4" fill="#f3f4f6" stroke="#374151" strokeWidth="1" />
        </svg>
      );
    case 'countertop':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="2" y="20" width="44" height="8" fill="#f9fafb" stroke="#374151" strokeWidth="2" />
          <line x1="2" y1="22" x2="46" y2="22" stroke="#374151" strokeWidth="1" />
        </svg>
      );

    // Trim
    case 'skirting':
    case 'chair_rail':
    case 'picture_rail':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="2" y="16" width="44" height="16" fill="#ffffff" stroke="#374151" strokeWidth="2" />
          <line x1="2" y1="20" x2="46" y2="20" stroke="#374151" strokeWidth="1" />
          <line x1="2" y1="32" x2="46" y2="32" stroke="#374151" strokeWidth="1" />
        </svg>
      );
    case 'crown_molding':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <line x1="2" y1="8" x2="46" y2="8" stroke="#374151" strokeWidth="1" strokeDasharray="3 2" />
          <path d="M 2 8 L 2 16 L 46 16 L 46 8" fill="#ffffff" stroke="#374151" strokeWidth="2" />
          <path d="M 2 16 L 2 28 L 46 28 L 46 16" fill="#ffffff" stroke="#374151" strokeWidth="2" />
          <line x1="2" y1="22" x2="46" y2="22" stroke="#374151" strokeWidth="1" />
        </svg>
      );

    // HVAC
    case 'radiator':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="4" y="8" width="40" height="32" fill="#f9fafb" stroke="#374151" strokeWidth="2" rx="4" />
          <line x1="10" y1="12" x2="10" y2="36" stroke="#374151" strokeWidth="1" />
          <line x1="18" y1="12" x2="18" y2="36" stroke="#374151" strokeWidth="1" />
          <line x1="26" y1="12" x2="26" y2="36" stroke="#374151" strokeWidth="1" />
          <line x1="34" y1="12" x2="34" y2="36" stroke="#374151" strokeWidth="1" />
          <line x1="8" y1="16" x2="40" y2="16" stroke="#374151" strokeWidth="1.5" />
          <line x1="8" y1="32" x2="40" y2="32" stroke="#374151" strokeWidth="1.5" />
          <circle cx="40" cy="24" r="3" fill="#dc2626" />
        </svg>
      );
    case 'vent_grille':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="6" y="12" width="36" height="24" fill="#f9fafb" stroke="#374151" strokeWidth="2" rx="2" />
          <line x1="10" y1="18" x2="38" y2="18" stroke="#374151" strokeWidth="1" />
          <line x1="10" y1="24" x2="38" y2="24" stroke="#374151" strokeWidth="1" />
          <line x1="10" y1="30" x2="38" y2="30" stroke="#374151" strokeWidth="1" />
        </svg>
      );
    case 'vent_round':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <circle cx="24" cy="24" r="18" fill="#f9fafb" stroke="#374151" strokeWidth="2" />
          <circle cx="24" cy="24" r="12" fill="none" stroke="#374151" strokeWidth="1" />
          <circle cx="24" cy="24" r="6" fill="none" stroke="#374151" strokeWidth="1" />
          <circle cx="24" cy="24" r="2" fill="#374151" />
        </svg>
      );
    case 'smoke_detector':
    case 'co_detector':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <line x1="4" y1="8" x2="44" y2="8" stroke="#374151" strokeWidth="1" strokeDasharray="3 2" />
          <rect x="8" y="8" width="32" height="16" fill="#ffffff" stroke="#374151" strokeWidth="2" rx="4" />
          <circle cx="24" cy="16" r="4" fill="#ef4444" />
          <circle cx="14" cy="16" r="2" fill="#22c55e" />
        </svg>
      );

    // Furniture
    case 'shelf':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="4" y="16" width="40" height="4" fill="#f9fafb" stroke="#374151" strokeWidth="2" />
          <line x1="10" y1="20" x2="10" y2="32" stroke="#374151" strokeWidth="2" />
          <line x1="38" y1="20" x2="38" y2="32" stroke="#374151" strokeWidth="2" />
          <line x1="10" y1="32" x2="6" y2="32" stroke="#374151" strokeWidth="2" />
          <line x1="38" y1="32" x2="42" y2="32" stroke="#374151" strokeWidth="2" />
        </svg>
      );
    case 'mirror':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="8" y="4" width="32" height="40" fill="#e0f2fe" stroke="#374151" strokeWidth="2" rx="2" />
          <rect x="10" y="6" width="28" height="36" fill="none" stroke="#374151" strokeWidth="1" />
          <line x1="14" y1="10" x2="22" y2="8" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          <line x1="16" y1="16" x2="20" y2="12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="8" y="8" width="32" height="32" fill="#f3f4f6" stroke="#374151" strokeWidth="2" />
          <text x="24" y="28" textAnchor="middle" fontSize="10" fill="#374151">?</text>
        </svg>
      );
  }
};

export const ElevationSymbolGallery: React.FC<ElevationSymbolGalleryProps> = ({
  open,
  onOpenChange,
  onSelectSymbol,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [hoveredSymbol, setHoveredSymbol] = useState<ElevationSymbolDefinition | null>(null);

  // Filter symbols based on search and category
  const filteredSymbols = useMemo(() => {
    return ELEVATION_SYMBOL_DEFINITIONS.filter((symbol) => {
      const matchesSearch =
        searchQuery === '' ||
        symbol.nameSv.toLowerCase().includes(searchQuery.toLowerCase()) ||
        symbol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        symbol.descriptionSv.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = activeCategory === 'all' || symbol.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  // Group symbols by category
  const groupedSymbols = useMemo(() => {
    const groups: Record<string, ElevationSymbolDefinition[]> = {};
    filteredSymbols.forEach((symbol) => {
      if (!groups[symbol.category]) {
        groups[symbol.category] = [];
      }
      groups[symbol.category].push(symbol);
    });
    return groups;
  }, [filteredSymbols]);

  const handleSelectSymbol = (symbol: ElevationSymbolDefinition) => {
    onSelectSymbol(symbol);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-amber-600" />
            Elevation Symbolbibliotek
          </DialogTitle>
          <DialogDescription>
            Välj arkitektoniska symboler att placera på elevation-vyn. Typiska objekt för byggnadsritningar.
          </DialogDescription>
        </DialogHeader>

        {/* Search and filters */}
        <div className="flex flex-col gap-3 pb-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök symboler..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Category tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Alla
              </TabsTrigger>
              {Object.entries(ELEVATION_SYMBOL_CATEGORIES).map(([key, cat]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1"
                >
                  {categoryIcons[key]}
                  {cat.nameSv}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Symbol grid */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {activeCategory === 'all' ? (
            // Show grouped by category
            <div className="space-y-6 py-4">
              {Object.entries(groupedSymbols).map(([category, symbols]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    {categoryIcons[category]}
                    <h3 className="font-medium text-sm">
                      {ELEVATION_SYMBOL_CATEGORIES[category as keyof typeof ELEVATION_SYMBOL_CATEGORIES]?.nameSv}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {symbols.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                    {symbols.map((symbol) => (
                      <SymbolCard
                        key={symbol.type}
                        symbol={symbol}
                        onSelect={handleSelectSymbol}
                        onHover={setHoveredSymbol}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Show flat grid for selected category
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 py-4">
              {filteredSymbols.map((symbol) => (
                <SymbolCard
                  key={symbol.type}
                  symbol={symbol}
                  onSelect={handleSelectSymbol}
                  onHover={setHoveredSymbol}
                />
              ))}
            </div>
          )}

          {filteredSymbols.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Inga symboler hittades</p>
              <p className="text-sm">Försök med en annan sökning</p>
            </div>
          )}
        </ScrollArea>

        {/* Info panel for hovered symbol */}
        {hoveredSymbol && (
          <div className="border-t pt-3 mt-3 flex items-start gap-4">
            <div className="w-16 h-16 bg-gray-50 rounded-lg p-2 flex-shrink-0">
              {getSymbolPreview(hoveredSymbol.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium">{hoveredSymbol.nameSv}</h4>
              <p className="text-sm text-muted-foreground">{hoveredSymbol.descriptionSv}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {hoveredSymbol.defaultWidth} × {hoveredSymbol.defaultHeight} mm
                </Badge>
                {hoveredSymbol.typicalHeightFromFloor !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    Höjd från golv: {hoveredSymbol.typicalHeightFromFloor} mm
                  </Badge>
                )}
              </div>
              {hoveredSymbol.materialNotes && (
                <p className="text-xs text-muted-foreground mt-1 italic">{hoveredSymbol.materialNotes}</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Symbol card component
interface SymbolCardProps {
  symbol: ElevationSymbolDefinition;
  onSelect: (symbol: ElevationSymbolDefinition) => void;
  onHover: (symbol: ElevationSymbolDefinition | null) => void;
}

const SymbolCard: React.FC<SymbolCardProps> = ({ symbol, onSelect, onHover }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            'group relative flex flex-col items-center p-2 rounded-lg border-2 border-transparent',
            'bg-gray-50 hover:bg-gray-100 hover:border-primary/50',
            'transition-all duration-150 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
          )}
          onClick={() => onSelect(symbol)}
          onMouseEnter={() => onHover(symbol)}
          onMouseLeave={() => onHover(null)}
        >
          <div className="w-12 h-12 flex items-center justify-center">
            {getSymbolPreview(symbol.type)}
          </div>
          <span className="text-xs text-center mt-1 line-clamp-2 text-gray-700">
            {symbol.nameSv}
          </span>
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus className="h-3 w-3 text-primary" />
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px]">
        <p className="font-medium">{symbol.nameSv}</p>
        <p className="text-xs text-muted-foreground">{symbol.descriptionSv}</p>
        <p className="text-xs mt-1">
          {symbol.defaultWidth} × {symbol.defaultHeight} mm
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

export default ElevationSymbolGallery;
