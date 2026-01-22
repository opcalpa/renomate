/**
 * TEMPLATE GALLERY
 * 
 * Browse and select reusable templates
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Download,
  Upload,
  Trash2,
  Copy,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Template,
  TemplateCategory,
  getTemplates,
  deleteTemplate,
  exportTemplatesAsJSON,
  importTemplatesFromJSON,
  getAllTemplateCategories,
  DEFAULT_TEMPLATES,
} from './templateDefinitions';
import { useFloorMapStore } from './store';
import { TemplatePreview } from './TemplatePreview';

interface TemplateGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  open,
  onOpenChange,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState<'custom' | 'default'>('custom');
  
  const setPendingTemplateId = useFloorMapStore((state) => state.setPendingTemplateId);
  const pendingTemplateId = useFloorMapStore((state) => state.pendingTemplateId);
  
  // Convert default templates to full Template objects for display
  const defaultTemplates: Template[] = DEFAULT_TEMPLATES.map((t, idx) => ({
    ...t,
    id: `default-${idx}`,
    user_id: 'system',
    created_at: new Date().toISOString(),
  }));
  
  // Load templates and categories
  useEffect(() => {
    if (open) {
      loadTemplates();
      loadCategories();
    }
  }, [open]);
  
  const loadTemplates = async () => {
    try {
      const loaded = await getTemplates();
      setTemplates(loaded);
    } catch (error) {
      setTemplates([]);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await getAllTemplateCategories();
      setCategories(cats);
    } catch (error) {
      setCategories([]);
    }
  };
  
  // Get templates based on active tab
  const currentTemplates = activeTab === 'custom' ? templates : defaultTemplates;
  
  // Filter templates
  const filteredTemplates = currentTemplates.filter(template => {
    // Category filter
    if (selectedCategory !== 'all' && template.category !== selectedCategory) {
      return false;
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return true;
  });
  
  // Handle select template
  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setPendingTemplateId(template.id);
    toast.success(`Mall "${template.name}" vald. Klicka på canvas för att placera.`);
  };
  
  // Handle delete
  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('Är du säker på att du vill radera denna mall?')) {
      const success = await deleteTemplate(templateId);
      if (success) {
        loadTemplates();
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
        }
        if (pendingTemplateId === templateId) {
          setPendingTemplateId(null);
        }
        toast.success('Mall raderad');
      } else {
        toast.error('Kunde inte radera mall');
      }
    }
  };
  
  // Handle export
  const handleExport = async () => {
    const json = await exportTemplatesAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `templates-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Mallar exporterade!');
  };
  
  // Handle import
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const json = e.target?.result as string;
      const result = await importTemplatesFromJSON(json);
      
      if (result.success) {
        loadTemplates();
        toast.success(`${result.count} mallar importerade!`);
      } else {
        toast.error(`Import misslyckades: ${result.error}`);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Mall-Galleri
          </DialogTitle>
          <DialogDescription>
            Välj en mall för att placera på canvas. Alla objekt blir vanliga editerbara shapes.
          </DialogDescription>
          
          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'custom'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Egna Mallar ({templates.length})
            </button>
            <button
              onClick={() => setActiveTab('default')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'default'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Fördefinierade ({defaultTemplates.length})
            </button>
          </div>
        </DialogHeader>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel - Template list */}
          <div className="w-2/3 border-r flex flex-col">
            {/* Filters */}
            <div className="p-4 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Sök mallar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Category filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Alla kategorier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla kategorier</SelectItem>
                  <SelectItem value="walls">Väggar</SelectItem>
                  <SelectItem value="bathroom">Badrum</SelectItem>
                  <SelectItem value="kitchen">Kök</SelectItem>
                  <SelectItem value="electrical">El</SelectItem>
                  <SelectItem value="furniture">Möbler</SelectItem>
                  <SelectItem value="doors_windows">Dörrar & Fönster</SelectItem>
                  <SelectItem value="stairs">Trappor</SelectItem>
                  <SelectItem value="structural">Struktur</SelectItem>
                  <SelectItem value="other">Övrigt</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Action buttons (only for custom templates) */}
              {activeTab === 'custom' && (
                <div className="flex gap-2">
                  <Button onClick={handleExport} variant="outline" size="sm" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Exportera
                  </Button>
                  <label className="flex-1">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Importera
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Template list */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">Inga mallar hittades</p>
                    {searchQuery && (
                      <p className="text-xs mt-1">Prova ett annat sökord</p>
                    )}
                    {!searchQuery && activeTab === 'custom' && templates.length === 0 && (
                      <div className="mt-4">
                        <p className="text-xs mb-3">
                          Du har inga egna mallar än. Markera objekt på canvas och klicka "Spara som Mall".
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id || pendingTemplateId === template.id
                          ? 'bg-accent border-primary'
                          : ''
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="shrink-0">
                          <TemplatePreview template={template} width={60} height={60} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{template.name}</h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {template.description || 'Ingen beskrivning'}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {template.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {template.shapes.length} {template.shapes.length === 1 ? 'objekt' : 'objekt'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(template.bounds.width)}×{Math.round(template.bounds.height)}mm
                            </span>
                          </div>
                          {template.tags && template.tags.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {template.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Actions (only for custom templates) */}
                        {activeTab === 'custom' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                            className="shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          
          {/* Right panel - Template details */}
          <div className="w-1/3 bg-muted/30 p-6">
            {selectedTemplate ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="mb-3 flex justify-center">
                    <TemplatePreview template={selectedTemplate} width={150} height={150} />
                  </div>
                  <h3 className="font-semibold text-lg">{selectedTemplate.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTemplate.description || 'Ingen beskrivning'}
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Kategori</Label>
                    <p className="text-sm font-medium capitalize">{selectedTemplate.category}</p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Antal objekt</Label>
                    <p className="text-sm font-medium">
                      {selectedTemplate.shapes.length} {selectedTemplate.shapes.length === 1 ? 'objekt' : 'objekt'}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Storlek</Label>
                    <p className="text-sm font-medium">
                      {Math.round(selectedTemplate.bounds.width)}×{Math.round(selectedTemplate.bounds.height)}mm
                    </p>
                  </div>
                  
                  {selectedTemplate.tags && selectedTemplate.tags.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Taggar</Label>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {selectedTemplate.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Skapad</Label>
                    <p className="text-sm">
                      {new Date(selectedTemplate.created_at).toLocaleDateString('sv-SE')}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => {
                      handleSelectTemplate(selectedTemplate);
                      onOpenChange(false); // Close gallery after selection
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Placera Mall
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Klicka för att välja mallen, sedan klicka på canvas för att placera.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <p className="text-sm">Välj en mall till vänster för att se detaljer</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper label component
const Label: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={className}>{children}</div>
);
