import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://app.renofine.com",
  "https://renofine.com",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResponse(data: unknown, status: number, req: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", sv: "Swedish", de: "German", fr: "French",
  es: "Spanish", pl: "Polish", uk: "Ukrainian", ro: "Romanian",
  lt: "Lithuanian", et: "Estonian",
};

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

interface TaskToTranslate {
  id: string;
  title: string;
  description: string | null;
  checklists: Checklist[] | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const { taskIds, targetLanguage } = await req.json();

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return jsonResponse({ error: "taskIds array is required" }, 400, req);
    }
    if (!targetLanguage || typeof targetLanguage !== "string") {
      return jsonResponse({ error: "targetLanguage is required" }, 400, req);
    }

    // Skip translation for English/Swedish source languages
    if (targetLanguage === "en" || targetLanguage === "sv") {
      return jsonResponse({ translated: 0, skipped: "source language" }, 200, req);
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return jsonResponse({ error: "OpenAI API key not configured" }, 500, req);
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check which tasks already have translations
    const { data: existing } = await sb
      .from("task_translations")
      .select("task_id")
      .in("task_id", taskIds)
      .eq("language", targetLanguage);

    const existingIds = new Set((existing || []).map((e) => e.task_id));
    const missingIds = taskIds.filter((id: string) => !existingIds.has(id));

    if (missingIds.length === 0) {
      return jsonResponse({ translated: 0, skipped: "all cached" }, 200, req);
    }

    // Fetch task data
    const { data: tasks } = await sb
      .from("tasks")
      .select("id, title, description, checklists")
      .in("id", missingIds);

    if (!tasks || tasks.length === 0) {
      return jsonResponse({ translated: 0, skipped: "no tasks found" }, 200, req);
    }

    const targetName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

    // Build translation prompt
    const tasksPayload = (tasks as TaskToTranslate[]).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || "",
      checklistItems: (t.checklists as Checklist[] || []).flatMap((cl) =>
        cl.items.map((item) => ({ checklistId: cl.id, itemId: item.id, title: item.title }))
      ),
    }));

    const prompt = JSON.stringify(tasksPayload, null, 0);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `You translate renovation/construction work instructions to ${targetName}.

Rules:
- Translate title, description, and checklistItems[].title for each task
- NEVER translate product names, brand names, color codes (NCS, RAL, Pantone), material codes, or measurements
- Keep the same JSON structure
- Return ONLY a JSON array — no markdown, no explanation

Input/output format:
[{
  "id": "task-uuid",
  "title": "translated title",
  "description": "translated description",
  "checklistItems": [{ "checklistId": "...", "itemId": "...", "title": "translated" }]
}]`,
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", errorText);
      return jsonResponse({ error: "Translation API error" }, 502, req);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || "[]";

    // Strip markdown fences if present
    const cleaned = rawContent.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "");

    let translated: Array<{
      id: string;
      title: string;
      description: string;
      checklistItems: Array<{ checklistId: string; itemId: string; title: string }>;
    }>;

    try {
      translated = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse translation:", cleaned);
      return jsonResponse({ error: "Invalid translation response" }, 502, req);
    }

    // Rebuild checklists with translated item titles
    const upserts = translated.map((tr) => {
      const originalTask = (tasks as TaskToTranslate[]).find((t) => t.id === tr.id);
      const originalChecklists = (originalTask?.checklists as Checklist[]) || [];

      // Map translated items back into checklist structure
      const translatedChecklists = originalChecklists.map((cl) => ({
        ...cl,
        items: cl.items.map((item) => {
          const translatedItem = tr.checklistItems?.find(
            (ti) => ti.checklistId === cl.id && ti.itemId === item.id
          );
          return {
            ...item,
            title: translatedItem?.title || item.title,
          };
        }),
      }));

      return {
        task_id: tr.id,
        language: targetLanguage,
        title: tr.title,
        description: tr.description || null,
        checklists: translatedChecklists.length > 0 ? translatedChecklists : null,
        translated_at: new Date().toISOString(),
      };
    });

    // Upsert translations
    const { error: upsertError } = await sb
      .from("task_translations")
      .upsert(upserts, { onConflict: "task_id,language" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return jsonResponse({ error: "Failed to save translations" }, 500, req);
    }

    return jsonResponse({ translated: upserts.length }, 200, req);
  } catch (error) {
    console.error("translate-task-content error:", error);
    return jsonResponse({ error: error.message }, 500, req);
  }
});
