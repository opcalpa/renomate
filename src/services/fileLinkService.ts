/**
 * Shared file-link utilities for task_file_links table.
 * Used by ProjectFilesTab and BatchSmartTolkDialog.
 */

import { supabase } from '@/integrations/supabase/client';

export interface FileRef {
  path: string;
  name: string;
}

export interface FileLinkMetadata {
  vendor_name?: string | null;
  invoice_date?: string | null;
  invoice_amount?: number | null;
  rot_amount?: number | null;
  ai_summary?: string | null;
}

/** Create or find an orphan task_file_link for storing metadata */
export async function ensureFileLink(
  projectId: string,
  file: FileRef,
): Promise<string | null> {
  // Check if one already exists
  const { data: existing } = await supabase
    .from('task_file_links')
    .select('id')
    .eq('project_id', projectId)
    .eq('file_path', file.path)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('task_file_links')
    .insert({
      project_id: projectId,
      file_path: file.path,
      file_name: file.name || file.path.split('/').pop() || 'unknown',
    })
    .select('id')
    .single();

  if (error) {
    console.error('ensureFileLink failed:', error.message, file.path);
    return null;
  }
  return data?.id || null;
}

/** Update metadata on an existing file link */
export async function updateFileLink(
  linkId: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('task_file_links')
    .update(updates)
    .eq('id', linkId);
  if (error) console.error('updateFileLink failed:', error.message);
}

/** Link a file to an entity (task, material, or room) */
export async function linkFileToEntity(
  projectId: string,
  filePath: string,
  entityType: 'task' | 'material' | 'room',
  entityId: string,
): Promise<string | null> {
  const field = entityType === 'task' ? 'task_id' : entityType === 'material' ? 'material_id' : 'room_id';
  const { data, error } = await supabase
    .from('task_file_links')
    .insert({
      project_id: projectId,
      file_path: filePath,
      [field]: entityId,
    })
    .select('id')
    .single();
  if (error) {
    console.error('linkFileToEntity failed:', error.message);
    return null;
  }
  return data?.id || null;
}

/** Save classification metadata to task_file_links */
export async function saveClassificationMetadata(
  projectId: string,
  file: FileRef,
  metadata: FileLinkMetadata,
): Promise<string | null> {
  const linkId = await ensureFileLink(projectId, file);
  if (!linkId) return null;

  const updates: Record<string, unknown> = {};
  if (metadata.vendor_name) updates.vendor_name = metadata.vendor_name;
  if (metadata.invoice_date) updates.invoice_date = metadata.invoice_date;
  if (metadata.invoice_amount) updates.invoice_amount = metadata.invoice_amount;
  if (metadata.ai_summary) updates.ai_summary = metadata.ai_summary;

  if (Object.keys(updates).length > 0) {
    await updateFileLink(linkId, updates);
  }
  return linkId;
}

/** Update file_path in all task_file_links for a given file (after rename) */
export async function updateFileLinkPaths(
  oldPath: string,
  newPath: string,
): Promise<void> {
  const { error } = await supabase
    .from('task_file_links')
    .update({ file_path: newPath })
    .eq('file_path', oldPath);
  if (error) console.error('updateFileLinkPaths failed:', error.message);
}
