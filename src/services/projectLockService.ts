import { supabase } from "@/integrations/supabase/client";

export interface ProjectLockStatus {
  isLocked: boolean;
  lockedAt: string | null;
  lockedByQuoteId: string | null;
  quote?: {
    id: string;
    title: string;
    status: string;
  } | null;
}

/**
 * Get the lock status of a project.
 * The lock only applies during the quote_sent phase. If the project has moved
 * past that (e.g. active, completed) the lock is stale and should be ignored.
 */
export async function getProjectLockStatus(projectId: string): Promise<ProjectLockStatus> {
  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      status,
      locked_for_quote,
      locked_at,
      locked_by_quote_id,
      quotes!locked_by_quote_id (
        id,
        title,
        status
      )
    `)
    .eq("id", projectId)
    .single();

  if (error) {
    console.error("Failed to get project lock status:", error);
    return { isLocked: false, lockedAt: null, lockedByQuoteId: null };
  }

  // Lock only applies during quote_sent phase
  const lockableStatuses = ["planning", "quote_created", "quote_sent"];
  const projectStatus = project.status ?? "planning";
  const effectivelyLocked =
    (project.locked_for_quote || false) && lockableStatuses.includes(projectStatus);

  const quote = Array.isArray(project.quotes) ? project.quotes[0] : project.quotes;

  // Auto-clear stale lock in the background (fire-and-forget)
  if (project.locked_for_quote && !effectivelyLocked) {
    supabase
      .from("projects")
      .update({ locked_for_quote: false, locked_at: null, locked_by_quote_id: null })
      .eq("id", projectId)
      .then(() => {});
  }

  return {
    isLocked: effectivelyLocked,
    lockedAt: effectivelyLocked ? project.locked_at : null,
    lockedByQuoteId: effectivelyLocked ? project.locked_by_quote_id : null,
    quote: effectivelyLocked && quote ? {
      id: quote.id,
      title: quote.title,
      status: quote.status,
    } : null,
  };
}

/**
 * Lock a project (called when quote is sent)
 */
export async function lockProject(projectId: string, quoteId: string): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({
      locked_for_quote: true,
      locked_at: new Date().toISOString(),
      locked_by_quote_id: quoteId,
    })
    .eq("id", projectId);

  if (error) {
    console.error("Failed to lock project:", error);
    throw new Error(error.message);
  }
}

/**
 * Unlock a project (called when quote is set back to draft or accepted/rejected)
 */
export async function unlockProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({
      locked_for_quote: false,
      locked_at: null,
      locked_by_quote_id: null,
    })
    .eq("id", projectId);

  if (error) {
    console.error("Failed to unlock project:", error);
    throw new Error(error.message);
  }
}

/**
 * Check if a project is locked and throw if it is
 * Use this before making changes to rooms, tasks, or materials
 */
export async function ensureProjectNotLocked(projectId: string): Promise<void> {
  const status = await getProjectLockStatus(projectId);
  if (status.isLocked) {
    throw new Error("Project is locked because a quote has been sent");
  }
}
