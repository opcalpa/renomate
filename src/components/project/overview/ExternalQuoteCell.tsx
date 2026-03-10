import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import type { ExternalQuote } from "./ImportQuotePopover";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuoteAssignment {
  id: string;
  external_quote_id: string;
  task_id: string;
  allocated_amount: number;
}

interface ExternalQuoteCellProps {
  taskId: string;
  quotes: ExternalQuote[];
  /** Current assignment for this task (if any) */
  assignment: QuoteAssignment | null;
  currency?: string | null;
  onAssignmentChange: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExternalQuoteCell({
  taskId,
  quotes,
  assignment,
  currency,
  onAssignmentChange,
}: ExternalQuoteCellProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountValue, setAmountValue] = useState("");

  // When opening amount editor, pre-fill current allocation
  useEffect(() => {
    if (editingAmount && assignment) {
      setAmountValue(assignment.allocated_amount > 0 ? assignment.allocated_amount.toString() : "");
    }
  }, [editingAmount, assignment]);

  const assignedQuote = assignment
    ? quotes.find((q) => q.id === assignment.external_quote_id)
    : null;

  // ---- Assign a quote to this task ----
  const handleAssign = async (quoteId: string) => {
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) return;

    // Remove existing assignment if switching
    if (assignment) {
      await supabase.from("external_quote_assignments").delete().eq("id", assignment.id);
    }

    // Calculate default amount: if this is the only task, use full amount.
    // Otherwise use remaining unallocated amount.
    const remaining = quote.total_amount - quote.allocated;
    const isOnlyTask = quote.task_count === 0;
    const defaultAmount = isOnlyTask ? quote.total_amount : Math.max(0, remaining);

    const { error } = await supabase.from("external_quote_assignments").insert({
      external_quote_id: quoteId,
      task_id: taskId,
      allocated_amount: defaultAmount,
    });

    if (error) {
      toast({ variant: "destructive", description: error.message });
    } else {
      onAssignmentChange();
      // If quote already has other tasks, open amount editor immediately
      if (!isOnlyTask) {
        setEditingAmount(true);
      } else {
        setOpen(false);
      }
    }
  };

  // ---- Remove assignment ----
  const handleRemove = async () => {
    if (!assignment) return;
    const { error } = await supabase
      .from("external_quote_assignments")
      .delete()
      .eq("id", assignment.id);
    if (error) {
      toast({ variant: "destructive", description: error.message });
    } else {
      setOpen(false);
      onAssignmentChange();
    }
  };

  // ---- Update allocated amount ----
  const handleAmountSave = async () => {
    if (!assignment) return;
    const parsed = parseFloat(amountValue);
    if (isNaN(parsed) || parsed < 0) return;

    const { error } = await supabase
      .from("external_quote_assignments")
      .update({ allocated_amount: parsed })
      .eq("id", assignment.id);

    if (error) {
      toast({ variant: "destructive", description: error.message });
    } else {
      setEditingAmount(false);
      onAssignmentChange();
    }
  };

  // ---- Trigger display ----
  if (!assignedQuote && !assignment) {
    // No assignment — show dash, clickable
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors text-sm"
          >
            –
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start">
          {quotes.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2 text-center">
              {t("externalQuotes.noQuotesYet", "Import a quote first")}
            </p>
          ) : (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground px-2 py-1">
                {t("externalQuotes.assignQuote", "Assign quote")}
              </p>
              {quotes.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  className="flex items-center gap-2 w-full text-sm px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-left"
                  onClick={() => handleAssign(q.id)}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: q.color }}
                  />
                  <span className="truncate flex-1">{q.builder_name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {formatCurrency(q.total_amount, currency)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  // Has assignment — show badge with quote color + name
  return (
    <Popover open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) setEditingAmount(false); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 text-xs max-w-[140px] hover:bg-muted px-1.5 py-0.5 rounded transition-colors"
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: assignedQuote?.color ?? "#6366f1" }}
          />
          <span className="truncate">
            {assignedQuote?.builder_name ?? "?"}
          </span>
          {assignment && assignment.allocated_amount > 0 && (
            <span className="text-muted-foreground tabular-nums shrink-0">
              {formatCurrency(assignment.allocated_amount, currency)}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" align="start">
        <div className="space-y-3">
          {/* Current assignment info */}
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: assignedQuote?.color ?? "#6366f1" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{assignedQuote?.builder_name}</p>
              <p className="text-xs text-muted-foreground">
                {t("externalQuotes.totalLabel", "Total")}: {formatCurrency(assignedQuote?.total_amount ?? 0, currency)}
              </p>
            </div>
          </div>

          {/* Amount allocation */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              {t("externalQuotes.allocatedToTask", "Allocated to this task")}
            </label>
            {editingAmount ? (
              <div className="flex gap-1.5">
                <Input
                  autoFocus
                  type="number"
                  step="1"
                  min="0"
                  value={amountValue}
                  onChange={(e) => setAmountValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAmountSave();
                    if (e.key === "Escape") setEditingAmount(false);
                  }}
                  className="h-7 text-sm flex-1"
                />
                <Button size="sm" className="h-7 text-xs px-2" onClick={handleAmountSave}>
                  {t("common.save", "Save")}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="text-sm font-medium tabular-nums hover:bg-muted px-1.5 py-0.5 rounded cursor-text"
                onClick={() => setEditingAmount(true)}
              >
                {formatCurrency(assignment?.allocated_amount ?? 0, currency)}
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {/* Switch to different quote */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 text-xs h-7">
                  {t("externalQuotes.changeQuote", "Change")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="start" side="top">
                {quotes.filter((q) => q.id !== assignedQuote?.id).map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    className="flex items-center gap-2 w-full text-sm px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-left"
                    onClick={() => { handleAssign(q.id); }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: q.color }} />
                    <span className="truncate flex-1">{q.builder_name}</span>
                  </button>
                ))}
                {quotes.filter((q) => q.id !== assignedQuote?.id).length === 0 && (
                  <p className="text-xs text-muted-foreground p-2 text-center">
                    {t("externalQuotes.noOtherQuotes", "No other quotes")}
                  </p>
                )}
              </PopoverContent>
            </Popover>

            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-destructive hover:text-destructive h-7"
              onClick={handleRemove}
            >
              <X className="h-3 w-3 mr-1" />
              {t("common.remove", "Remove")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
