/**
 * TEMPLATE GALLERY
 * 
 * Browse and select reusable templates
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    toast.success(t('templateGallery.templateSelected', { name: template.name }));
  };
  
  // Handle delete
  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm(t('templateGallery.confirmDelete'))) {
      const success = await deleteTemplate(templateId);
      if (success) {
        loadTemplates();
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
        }
        if (pendingTemplateId === templateId) {
          setPendingTemplateId(null);
        }
        toast.success(t('templateGallery.templateDeleted'));
      } else {
        toast.error(t('templateGallery.deleteError'));
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
    toast.success(t('templateGallery.templatesExported'));
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
        toast.success(t('templateGallery.templatesImported', { count: result.count }));
      } else {
        toast.error(t('templateGallery.importFailed', { error: result.error }));
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full md:max-w-5xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            {t('templateGallery.title')}
          </DialogTitle>
          <DialogDescription>
            {t('templateGallery.description')}
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
              {t('templateGallery.customTemplates')} ({templates.length})
            </button>
            <button
              onClick={() => setActiveTab('default')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'default'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {t('templateGallery.predefined')} ({defaultTemplates.length})
            </button>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left panel - Template list */}
          <div className="w-full md:w-2/3 border-b md:border-b-0 md:border-r flex flex-col">
            {/* Filters */}
            <div className="p-4 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('templateGallery.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Category filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={t('templateGallery.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('templateGallery.allCategories')}</SelectItem>
                  <SelectItem value="walls">{t('saveTemplateDialog.walls')}</SelectItem>
                  <SelectItem value="bathroom">{t('saveTemplateDialog.bathroom')}</SelectItem>
                  <SelectItem value="kitchen">{t('saveTemplateDialog.kitchen')}</SelectItem>
                  <SelectItem value="electrical">{t('saveTemplateDialog.electrical')}</SelectItem>
                  <SelectItem value="furniture">{t('saveTemplateDialog.furniture')}</SelectItem>
                  <SelectItem value="doors_windows">{t('saveTemplateDialog.doorsWindows')}</SelectItem>
                  <SelectItem value="stairs">{t('saveTemplateDialog.stairs')}</SelectItem>
                  <SelectItem value="structural">{t('saveTemplateDialog.structural')}</SelectItem>
                  <SelectItem value="other">{t('saveTemplateDialog.other')}</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Action buttons (only for custom templates) */}
              {activeTab === 'custom' && (
                <div className="flex gap-2">
                  <Button onClick={handleExport} variant="outline" size="sm" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    {t('templateGallery.export')}
                  </Button>
                  <label className="flex-1">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {t('templateGallery.import')}
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
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">{t('templateGallery.noTemplatesFound')}</p>
                    {searchQuery && (
                      <p className="text-xs mt-1">{t('templateGallery.tryAnotherSearch')}</p>
                    )}
                    {!searchQuery && activeTab === 'custom' && templates.length === 0 && (
                      <div className="mt-4">
                        <p className="text-xs mb-3">
                          {t('templateGallery.noCustomTemplates')}
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
                            {template.description || t('templateGallery.noDescription')}
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
          <div className="w-full md:w-1/3 bg-muted/30 p-4 md:p-6">
            {selectedTemplate ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="mb-3 flex justify-center">
                    <TemplatePreview template={selectedTemplate} width={150} height={150} />
                  </div>
                  <h3 className="font-semibold text-lg">{selectedTemplate.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTemplate.description || t('templateGallery.noDescription')}
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('templateGallery.category')}</Label>
                    <p className="text-sm font-medium capitalize">{selectedTemplate.category}</p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('templateGallery.objectCount')}</Label>
                    <p className="text-sm font-medium">
                      {t('saveTemplateDialog.objectCount', { count: selectedTemplate.shapes.length })}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('templateGallery.sizeLabel')}</Label>
                    <p className="text-sm font-medium">
                      {Math.round(selectedTemplate.bounds.width)}×{Math.round(selectedTemplate.bounds.height)}mm
                    </p>
                  </div>
                  
                  {selectedTemplate.tags && selectedTemplate.tags.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('templateGallery.tags')}</Label>
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
                    <Label className="text-xs text-muted-foreground">{t('templateGallery.created')}</Label>
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
                    {t('templateGallery.placeTemplate')}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    {t('templateGallery.placeInstructions')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <p className="text-sm">{t('templateGallery.selectTemplatePrompt')}</p>
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
