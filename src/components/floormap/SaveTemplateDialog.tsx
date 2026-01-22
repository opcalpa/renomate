/**
 * SAVE TEMPLATE DIALOG
 * 
 * Dialog for saving selected shapes as a reusable template
 */

import React, { useState } from 'react';
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('other');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Ange ett namn för mallen');
      return;
    }
    
    if (selectedShapes.length === 0) {
      toast.error('Inga objekt markerade');
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
        toast.success(`✅ Mall "${name}" sparad!`);
        
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
        toast.error('Kunde inte spara mall. Försök igen.');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Ett fel uppstod vid sparning');
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
          <DialogTitle>💾 Spara som Mall</DialogTitle>
          <DialogDescription>
            Spara {selectedShapes.length} {selectedShapes.length === 1 ? 'objekt' : 'objekt'} som
            en återanvändbar mall
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="template-name">Namn *</Label>
            <Input
              id="template-name"
              placeholder="t.ex. Badrum komplett, L-formad vägg..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          
          {/* Category */}
          <div>
            <Label htmlFor="template-category">Kategori</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
              <SelectTrigger id="template-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
          </div>
          
          {/* Description */}
          <div>
            <Label htmlFor="template-description">Beskrivning (valfritt)</Label>
            <Textarea
              id="template-description"
              placeholder="Beskriv vad denna mall innehåller..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          {/* Tags */}
          <div>
            <Label htmlFor="template-tags">Taggar (valfritt)</Label>
            <Input
              id="template-tags"
              placeholder="standard, modern, kompakt (separera med komma)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          
          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Storlek:</strong>{' '}
              {selectedShapes.length} {selectedShapes.length === 1 ? 'objekt' : 'objekt'}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Mallen sparas med relativa koordinater och kan placeras var som helst på canvas.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            💾 Spara Mall
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
