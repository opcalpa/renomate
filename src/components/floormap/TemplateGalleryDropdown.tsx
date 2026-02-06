/**
 * TEMPLATE GALLERY DROPDOWN
 *
 * Compact horizontal dropdown menu for browsing and selecting templates.
 * Replaces the full dialog with a more space-efficient UI.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Copy,
  Search,
  FolderOpen,
  Package,
  Bath,
  UtensilsCrossed,
  Zap,
  Sofa,
  DoorOpen,
  ArrowUpDown,
  Building2,
  MoreHorizontal,
  Layers,
  ChevronRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Template,
  TemplateCategory,
  getTemplates,
  DEFAULT_TEMPLATES,
} from './templateDefinitions';
import { useFloorMapStore } from './store';
import { TemplatePreview } from './TemplatePreview';

// Category icons mapping
const categoryIcons: Record<TemplateCategory | 'all', React.ReactNode> = {
  all: <Layers className="h-4 w-4" />,
  walls: <Building2 className="h-4 w-4" />,
  bathroom: <Bath className="h-4 w-4" />,
  kitchen: <UtensilsCrossed className="h-4 w-4" />,
  electrical: <Zap className="h-4 w-4" />,
  furniture: <Sofa className="h-4 w-4" />,
  doors_windows: <DoorOpen className="h-4 w-4" />,
  stairs: <ArrowUpDown className="h-4 w-4" />,
  structural: <Building2 className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

// Category labels (Swedish)
const categoryLabels: Record<TemplateCategory, string> = {
  walls: 'Väggar',
  bathroom: 'Badrum',
  kitchen: 'Kök',
  electrical: 'El',
  furniture: 'Möbler',
  doors_windows: 'Dörrar & Fönster',
  stairs: 'Trappor',
  structural: 'Konstruktion',
  other: 'Övrigt',
};

interface TemplateGalleryDropdownProps {
  trigger?: React.ReactNode;
}

export const TemplateGalleryDropdown: React.FC<TemplateGalleryDropdownProps> = ({
  trigger,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const setPendingTemplateId = useFloorMapStore((state) => state.setPendingTemplateId);

  // Convert default templates to Template objects
  const defaultTemplates: Template[] = useMemo(() =>
    DEFAULT_TEMPLATES.map((t, idx) => ({
      ...t,
      id: `default-${idx}`,
      user_id: 'system',
      created_at: new Date().toISOString(),
    })), []
  );

  // Load custom templates when dropdown opens
  useEffect(() => {
    if (open) {
      loadCustomTemplates();
    }
  }, [open]);

  const loadCustomTemplates = async () => {
    setIsLoading(true);
    try {
      const loaded = await getTemplates();
      setCustomTemplates(loaded);
    } catch (error) {
      setCustomTemplates([]);
    }
    setIsLoading(false);
  };

  // Filter templates by search query
  const filterTemplates = (templates: Template[]) => {
    if (!searchQuery.trim()) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query) ||
      t.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  };

  // Group templates by category
  const groupByCategory = (templates: Template[]) => {
    const groups: Record<string, Template[]> = {};
    templates.forEach(t => {
      const cat = t.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return groups;
  };

  const filteredCustom = filterTemplates(customTemplates);
  const filteredDefault = filterTemplates(defaultTemplates);
  const groupedCustom = groupByCategory(filteredCustom);
  const groupedDefault = groupByCategory(filteredDefault);

  // Handle template selection
  const handleSelectTemplate = (template: Template) => {
    setPendingTemplateId(template.id);
    setOpen(false);
    setSearchQuery('');
    toast.success(`Mall vald: ${template.name}. Klicka på canvasen för att placera.`);
  };

  // Template item component
  const TemplateItem: React.FC<{ template: Template }> = ({ template }) => {
    // Guard against missing shapes or bounds
    const hasValidData = template.shapes && template.shapes.length > 0 && template.bounds;

    return (
      <DropdownMenuItem
        className="flex items-center gap-2 cursor-pointer py-2 px-2"
        onClick={() => handleSelectTemplate(template)}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
          {hasValidData ? (
            <TemplatePreview
              template={template}
              width={40}
              height={40}
            />
          ) : (
            <Package className="h-5 w-5 text-gray-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{template.name}</div>
          {template.bounds && (
            <div className="text-xs text-muted-foreground">
              {Math.round(template.bounds.width)}×{Math.round(template.bounds.height)} mm
            </div>
          )}
        </div>
      </DropdownMenuItem>
    );
  };

  // Category submenu component
  const CategorySubmenu: React.FC<{
    category: TemplateCategory;
    templates: Template[];
  }> = ({ category, templates }) => (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center gap-2">
        {categoryIcons[category]}
        <span>{categoryLabels[category]}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {templates.length}
        </Badge>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-64 max-h-80">
        <ScrollArea className="h-full max-h-72">
          {templates.map(template => (
            <TemplateItem key={template.id} template={template} />
          ))}
        </ScrollArea>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );

  // Check if we have any results
  const hasCustomResults = filteredCustom.length > 0;
  const hasDefaultResults = filteredDefault.length > 0;
  const hasAnyResults = hasCustomResults || hasDefaultResults;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="w-10 h-10">
            <Copy className="h-5 w-5" />
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-72"
        align="start"
        side="right"
        sideOffset={8}
      >
        {/* Header with search */}
        <div className="p-2 pb-0">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Mall Galleri</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök mallar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <DropdownMenuSeparator className="my-2" />

        {/* No results message */}
        {!hasAnyResults && searchQuery && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Inga mallar hittades för "{searchQuery}"
          </div>
        )}

        {/* Custom Templates Section */}
        {(hasCustomResults || !searchQuery) && (
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-blue-500" />
                <span>Egna mallar</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {filteredCustom.length}
                </Badge>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-64">
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Laddar...
                  </div>
                ) : filteredCustom.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchQuery ? 'Inga träffar' : 'Inga egna mallar ännu'}
                  </div>
                ) : (
                  <ScrollArea className="max-h-80">
                    {Object.entries(groupedCustom).map(([category, templates]) => (
                      <CategorySubmenu
                        key={category}
                        category={category as TemplateCategory}
                        templates={templates}
                      />
                    ))}
                  </ScrollArea>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        )}

        {/* Default Templates Section */}
        {(hasDefaultResults || !searchQuery) && (
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <Package className="h-4 w-4 text-green-500" />
                <span>Standard mallar</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {filteredDefault.length}
                </Badge>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-64">
                <ScrollArea className="max-h-80">
                  {Object.entries(groupedDefault).map(([category, templates]) => (
                    <CategorySubmenu
                      key={category}
                      category={category as TemplateCategory}
                      templates={templates}
                    />
                  ))}
                </ScrollArea>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        )}

        {/* Quick access: Show all matching templates when searching */}
        {searchQuery && hasAnyResults && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Sökresultat ({filteredCustom.length + filteredDefault.length})
            </DropdownMenuLabel>
            <ScrollArea className="max-h-48">
              {[...filteredCustom, ...filteredDefault].slice(0, 8).map(template => (
                <TemplateItem key={template.id} template={template} />
              ))}
              {filteredCustom.length + filteredDefault.length > 8 && (
                <div className="px-2 py-1 text-xs text-muted-foreground text-center">
                  +{filteredCustom.length + filteredDefault.length - 8} fler...
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
