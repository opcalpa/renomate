import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { lockProject, unlockProject } from "./projectLockService";
import { inviteCustomerAsClient } from "./intakeService";

const ROT_RATE = 0.3;

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["draft", "accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};

export function calculateRotDeduction(totalPrice: number, isEligible: boolean): number {
  return isEligible ? Math.round(totalPrice * ROT_RATE * 100) / 100 : 0;
}

export function recalculateQuoteTotals(items: { total_price: number; is_rot_eligible: boolean; rot_deduction: number }[]) {
  const totalAmount = items.reduce((sum, i) => sum + (i.total_price ?? 0), 0);
  const totalRotDeduction = items.reduce((sum, i) => sum + (i.rot_deduction ?? 0), 0);
  return {
    total_amount: Math.round(totalAmount * 100) / 100,
    total_rot_deduction: Math.round(totalRotDeduction * 100) / 100,
    total_after_rot: Math.round((totalAmount - totalRotDeduction) * 100) / 100,
  };
}

export async function createQuote(projectId: string, title: string, creatorId: string, clientIdRef?: string, freeText?: string) {
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      project_id: projectId,
      title,
      creator_id: creatorId,
      ...(clientIdRef ? { client_id_ref: clientIdRef } : {}),
      ...(freeText ? { free_text: freeText } : {}),
    })
    .select()
    .single();
  if (error) {
    console.error("Failed to create quote:", error);
    toast.error("Kunde inte skapa offert");
    return null;
  }

  // Mark onboarding step for creating first quote
  await supabase
    .from("profiles")
    .update({ onboarding_created_quote: true })
    .eq("id", creatorId);

  return data;
}

export async function addQuoteItem(quoteId: string, item: { description: string; quantity: number; unit_price: number; unit?: string; is_rot_eligible?: boolean; room_id?: string; sort_order?: number }) {
  const rotDeduction = calculateRotDeduction(item.quantity * item.unit_price, item.is_rot_eligible ?? false);
  const { data, error } = await supabase
    .from("quote_items")
    .insert({ quote_id: quoteId, ...item, rot_deduction: rotDeduction })
    .select()
    .single();
  if (error) {
    console.error("Failed to add quote item:", error);
    toast.error("Kunde inte lägga till rad");
    return null;
  }
  return data;
}

export async function updateQuoteStatus(quoteId: string, newStatus: string) {
  const { data: quote, error: fetchErr } = await supabase
    .from("quotes")
    .select("status, project_id, intake_request_id, creator_id")
    .eq("id", quoteId)
    .single();
  if (fetchErr || !quote) {
    toast.error("Kunde inte hämta offert");
    return null;
  }
  const allowed = VALID_TRANSITIONS[quote.status] ?? [];
  if (!allowed.includes(newStatus)) {
    toast.error(`Kan inte ändra status från ${quote.status} till ${newStatus}`);
    return null;
  }
  const { data, error } = await supabase.from("quotes").update({ status: newStatus }).eq("id", quoteId).select().single();
  if (error) {
    console.error("Failed to update quote status:", error);
    toast.error("Kunde inte uppdatera status");
    return null;
  }

  // Handle project locking based on quote status
  if (quote.project_id) {
    try {
      if (newStatus === "sent") {
        // Lock project when quote is sent
        await lockProject(quote.project_id, quoteId);
      } else if (newStatus === "draft" || newStatus === "accepted" || newStatus === "rejected") {
        // Unlock project when quote is reverted to draft or finalized
        await unlockProject(quote.project_id);
      }
    } catch (lockError) {
      console.error("Failed to update project lock status:", lockError);
      // Don't fail the status update if lock fails, just log it
    }
  }

  // When quote is accepted, invite the customer as client (if from intake request)
  if (newStatus === "accepted" && quote.intake_request_id && quote.project_id) {
    try {
      // Fetch intake request to get customer info
      const { data: intake } = await supabase
        .from("customer_intake_requests")
        .select("customer_email, customer_name")
        .eq("id", quote.intake_request_id)
        .single();

      if (intake?.customer_email) {
        await inviteCustomerAsClient(
          quote.project_id,
          intake.customer_email,
          intake.customer_name || intake.customer_email,
          quote.creator_id
        );
      }
    } catch (inviteError) {
      console.error("Failed to invite customer as client:", inviteError);
      // Don't fail the status update if invite fails
    }
  }

  return data;
}

export async function fetchQuoteWithItems(quoteId: string) {
  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();
  if (qErr || !quote) return null;

  const [itemsRes, creatorRes, projectRes] = await Promise.all([
    supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("profiles")
      .select("name, company_name, avatar_url")
      .eq("id", quote.creator_id)
      .single(),
    supabase
      .from("projects")
      .select("name")
      .eq("id", quote.project_id)
      .single(),
  ]);

  return {
    quote,
    items: itemsRes.data ?? [],
    creator: creatorRes.data,
    projectName: projectRes.data?.name ?? "",
  };
}

export async function createTasksFromQuote(quoteId: string) {
  const result = await fetchQuoteWithItems(quoteId);
  if (!result) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) return;

  let count = 0;
  for (const item of result.items) {
    if (!item.description) continue;
    const { error } = await supabase.from("tasks").insert({
      project_id: result.quote.project_id,
      title: item.description,
      status: "planned",
      priority: "medium",
      room_id: item.room_id ?? null,
      budget: item.total_price ?? null,
      created_by_user_id: profile.id,
    });
    if (!error) count++;
  }

  if (count > 0) {
    toast.success(`${count} tasks created from quote`);
  }
}
