/**
 * useBatchClassification — parallel AI classification for multiple files.
 * Uses a semaphore pattern (4 concurrent) with streaming results.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { saveClassificationMetadata, type FileRef } from '@/services/fileLinkService';

export interface ClassificationResult {
  type: string;
  confidence: number;
  summary: string;
  vendor_name: string | null;
  invoice_date: string | null;
  invoice_amount: number | null;
  suggested_action: string;
}

export interface BatchClassificationItem {
  file: FileRef & { id: string; type: string; size: number };
  status: 'pending' | 'classifying' | 'done' | 'error';
  result: ClassificationResult | null;
  suggestedName: string | null;
  error?: string;
}

const CONCURRENCY = 4;

function generateStructuredName(originalName: string, result: ClassificationResult): string {
  const ext = originalName.includes('.') ? '.' + originalName.split('.').pop() : '';
  const parts: string[] = [];

  if (result.invoice_date) parts.push(result.invoice_date);
  if (result.vendor_name) parts.push(result.vendor_name);
  if (result.invoice_amount != null) parts.push(`${result.invoice_amount.toLocaleString('sv-SE')} kr`);

  if (parts.length === 0) return originalName;
  return parts.join(' — ') + ext;
}

async function classifyFile(
  file: BatchClassificationItem['file'],
): Promise<ClassificationResult> {
  const { data, error } = await supabase.functions.invoke('classify-document', {
    body: { filePath: file.path, fileName: file.name },
  });
  if (error) throw new Error(error.message || 'Classification failed');
  if (!data) throw new Error('No result returned');
  return data as ClassificationResult;
}

export function useBatchClassification(
  files: BatchClassificationItem['file'][],
  projectId: string,
  autoStart = true,
) {
  const [items, setItems] = useState<BatchClassificationItem[]>(() =>
    files.map(file => ({
      file,
      status: 'pending',
      result: null,
      suggestedName: null,
    })),
  );

  const startedRef = useRef(false);

  const updateItem = useCallback((path: string, updates: Partial<BatchClassificationItem>) => {
    setItems(prev => prev.map(item =>
      item.file.path === path ? { ...item, ...updates } : item,
    ));
  }, []);

  // Run parallel classification
  useEffect(() => {
    if (!autoStart || files.length === 0 || startedRef.current) return;
    startedRef.current = true;

    const queue = [...files];
    let active = 0;

    const processNext = async () => {
      if (queue.length === 0) return;
      const file = queue.shift()!;
      active++;

      setItems(prev => prev.map(item =>
        item.file.path === file.path ? { ...item, status: 'classifying' } : item,
      ));

      try {
        const result = await classifyFile(file);
        const suggestedName = generateStructuredName(file.name, result);

        // Save metadata to task_file_links
        await saveClassificationMetadata(projectId, file, {
          vendor_name: result.vendor_name,
          invoice_date: result.invoice_date,
          invoice_amount: result.invoice_amount,
          ai_summary: result.summary,
        });

        setItems(prev => prev.map(item =>
          item.file.path === file.path
            ? { ...item, status: 'done', result, suggestedName }
            : item,
        ));
      } catch (err) {
        setItems(prev => prev.map(item =>
          item.file.path === file.path
            ? { ...item, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' }
            : item,
        ));
      }

      active--;
      processNext();
    };

    // Start up to CONCURRENCY workers
    for (let i = 0; i < Math.min(CONCURRENCY, files.length); i++) {
      processNext();
    }
  }, [autoStart, files, projectId]);

  const progress = {
    done: items.filter(i => i.status === 'done' || i.status === 'error').length,
    total: items.length,
    errors: items.filter(i => i.status === 'error').length,
  };

  return { items, progress, isComplete: progress.done === progress.total, updateItem };
}
