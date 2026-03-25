/**
 * Batch file rename using Supabase Storage .move() API.
 * Renames files in-place (same folder, new filename) and updates task_file_links.
 */

import { supabase } from '@/integrations/supabase/client';
import { updateFileLinkPaths } from '@/services/fileLinkService';

/** Sanitize a filename for storage (remove unsafe chars) */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Rename a single file in Supabase Storage and update file links */
export async function renameFileInStorage(
  oldPath: string,
  newFileName: string,
): Promise<{ newPath: string } | { error: string }> {
  const folder = oldPath.substring(0, oldPath.lastIndexOf('/'));
  const safeName = sanitizeFileName(newFileName);
  const newPath = `${folder}/${safeName}`;

  if (oldPath === newPath) return { newPath: oldPath };

  const { error } = await supabase.storage
    .from('project-files')
    .move(oldPath, newPath);

  if (error) {
    console.error('Storage move failed:', oldPath, '->', newPath, error.message);
    return { error: error.message };
  }

  // Update all task_file_links references
  await updateFileLinkPaths(oldPath, newPath);

  return { newPath };
}

/** Batch rename multiple files. Sequential to avoid race conditions. */
export async function batchRename(
  renames: Array<{ oldPath: string; newFileName: string }>,
): Promise<{ success: number; failed: number; results: Array<{ oldPath: string; newPath?: string; error?: string }> }> {
  let success = 0;
  let failed = 0;
  const results: Array<{ oldPath: string; newPath?: string; error?: string }> = [];

  for (const { oldPath, newFileName } of renames) {
    const result = await renameFileInStorage(oldPath, newFileName);
    if ('error' in result) {
      failed++;
      results.push({ oldPath, error: result.error });
    } else {
      success++;
      results.push({ oldPath, newPath: result.newPath });
    }
  }

  return { success, failed, results };
}
