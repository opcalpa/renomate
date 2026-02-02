/**
 * SAVE TEMPLATE DIALOG
 * 
 * Dialog for saving selected shapes as a reusable template
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { FloorMapShape } from './types';
import {
  Template,
  TemplateCategory,
  calculateBounds,
  normalizeShapes,
  addTemplate,
} from './templateDefinitions';

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedShapes: FloorMapShape[];
  onSaveSuccess?: () => void;
}

export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({
  open,
  onOpenChange,
  selectedShapes,
  onSaveSuccess,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('other');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('saveTemplateDialog.enterNameError'));
      return;
    }
    
    if (selectedShapes.length === 0) {
      toast.error(t('saveTemplateDialog.noObjectsError'));
      return;
    }
    
    setSaving(true);
    
    try {
      // DON'T normalize! Just save the shapes as-is
      // When placing, we'll calculate the offset dynamically
      // This is more reliable than trying to normalize to (0,0)
      
      // Calculate bounds from ORIGINAL shapes (for preview only)
      const bounds = calculateBounds(selectedShapes);
      
      // Templates are user-specific, not project-specific
      // This allows templates to be reused across multiple projects
      
      // Save to database - save ORIGINAL shapes without normalization
      // Placement logic will handle the coordinate transformation
      const result = await addTemplate({
        user_id: '', // Will be set by addTemplate function
        project_id: undefined, // Templates are personal, not project-specific
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        shapes: selectedShapes, // Save as-is, no normalization!
        bounds,
        tags: tags.trim() ? tags.split(',').map(t => t.trim()) : undefined,
      });
      
      if (result) {
        toast.success(t('saveTemplateDialog.templateSaved', { name }));
        
        // Reset form
        setName('');
        setDescription('');
        setCategory('other');
        setTags('');
        
        // Close dialog
        onOpenChange(false);
        
        // Notify parent
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      } else {
        toast.error(t('saveTemplateDialog.saveError'));
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(t('saveTemplateDialog.saveException'));
    } finally {
      setSaving(false);
    }
  };
  
  const handleCancel = () => {
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('saveTemplateDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('saveTemplateDialog.description', { count: selectedShapes.length })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="template-name">{t('saveTemplateDialog.nameLabel')}</Label>
            <Input
              id="template-name"
              placeholder={t('saveTemplateDialog.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          
          {/* Category */}
          <div>
            <Label htmlFor="template-category">{t('saveTemplateDialog.categoryLabel')}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
              <SelectTrigger id="template-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
          </div>
          
          {/* Description */}
          <div>
            <Label htmlFor="template-description">{t('saveTemplateDialog.descriptionLabel')}</Label>
            <Textarea
              id="template-description"
              placeholder={t('saveTemplateDialog.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          {/* Tags */}
          <div>
            <Label htmlFor="template-tags">{t('saveTemplateDialog.tagsLabel')}</Label>
            <Input
              id="template-tags"
              placeholder={t('saveTemplateDialog.tagsPlaceholder')}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          
          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>{t('saveTemplateDialog.sizeInfo')}</strong>{' '}
              {t('saveTemplateDialog.objectCount', { count: selectedShapes.length })}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {t('saveTemplateDialog.relativeCoordinatesNote')}
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {t('saveTemplateDialog.saveTemplate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
