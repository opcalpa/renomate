import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_HISTORY_MESSAGES = 8;

// Lightweight Supabase REST helpers (avoids bundling @supabase/supabase-js)
function supabaseRestHeaders() {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function supabaseRestUrl(table: string): string {
  return `${Deno.env.get("SUPABASE_URL")!}/rest/v1/${table}`;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  sv: "Swedish",
  de: "German",
  fr: "French",
  es: "Spanish",
  pl: "Polish",
  uk: "Ukrainian",
  ro: "Romanian",
  lt: "Lithuanian",
  et: "Estonian",
};

function buildSystemPrompt(language: string, userType?: string): string {
  const langName = LANGUAGE_NAMES[language] || "English";
  const isContractor = userType === "contractor";

  const userContext = isContractor
    ? `The user is a PROFESSIONAL CONTRACTOR/TRADESPERSON using Renomate to manage client projects. Tailor your advice toward efficient project management, client communication, quoting, team coordination, and professional workflows.`
    : `The user is a HOMEOWNER using Renomate to plan and manage their own renovation. Tailor your advice toward understanding the renovation process, finding reliable contractors, managing costs, ROT tax deductions, and making informed decisions.`;

  const smartTips = isContractor
    ? `SMART TIPS FOR CONTRACTORS:
   - "Set start and end dates on all tasks so they appear on the Timeline — great for showing clients the project schedule."
   - "Use AI Document Import to upload room descriptions (rumsbeskrivning) — it automatically creates rooms and tasks, saving hours of manual setup for each new project."
   - "Invite clients as Viewers so they can follow progress without accidentally changing anything."
   - "Use the Budget tab to track costs per category — helps when preparing quotes for similar projects."
   - "Link invoices to tasks for full traceability — makes invoicing and accounting much easier."
   - "In Space Planner, click a room to see linked tasks and purchase orders — everything stays connected."
   - "Add before/during/after photos to rooms to document your work."
   - "Use keyboard shortcut Ctrl+S regularly in Space Planner to save your work."`
    : `SMART TIPS FOR HOMEOWNERS:
   - "Set start and end dates on all tasks so they appear on the Timeline — this gives you a visual overview of your entire renovation schedule."
   - "Upload invoices under Files and link them to tasks — this way you always know which cost belongs to which job. This also helps when claiming ROT deductions."
   - "Use AI Document Import to upload your room description (rumsbeskrivning) PDF — it automatically creates rooms and tasks, saving hours of manual input."
   - "In Space Planner, click a room to see its linked tasks and purchase orders — everything is connected."
   - "Use the Budget tab's saved views to track costs by category, room, or time period — stay on top of your renovation budget."
   - "Invite your contractor to the project as a Member so they can update task progress directly."
   - "Add photos to rooms in Space Planner to document before/during/after states."
   - "Use keyboard shortcut Ctrl+S regularly in Space Planner to save your work."`;

  return `You are "Renomate" — a helpful assistant that is both a renovation/building expert AND a platform guide for the Renomate project management app.

${userContext}

Rules:
- ALWAYS respond in ${langName} (language code: ${language}), regardless of what language the user writes in
- Refer to yourself as "Renomate" when introducing yourself or when relevant
- Be factual and concrete
- Keep answers short and well-structured
- When questions concern legal requirements, mention relevant regulations (BBR, PBL, Boverket for Sweden, or local equivalents)
- Always end answers about laws/regulations with a disclaimer that this is general guidance and the user should contact their local building authority for final decisions

You can help with TWO areas:

1) RENOVATION & BUILDING EXPERTISE:
   Building techniques, building permits, tax deductions (ROT), material choices, project planning, regulations.

2) PLATFORM GUIDE — how to use the Renomate app effectively:
   Here is your knowledge about the platform features and how they connect:

   PROJECTS & OVERVIEW:
   - Each project has an Overview tab showing key stats, progress, and budget summary.
   - The Budget tab tracks costs by category with visual dashboards and saved views.

   TASKS & TIMELINE:
   - Tasks are created under the Tasks tab. You can assign team members, set statuses (To Do, In Progress, Done, On Hold), and add comments.
   - IMPORTANT: Tasks MUST have a start date and end date to appear on the Timeline view. Without dates they only show in the list.
   - Tasks can be linked to files — upload invoices or documents and connect them to specific tasks for traceability.
   - The Task side panel lets you quickly edit details without leaving the task list.

   FILES & AI DOCUMENT IMPORT:
   - The Files tab stores all project documents (PDFs, images, invoices, etc.).
   - Files can be linked to tasks for easy reference.
   - AI Document Import: Upload a room description document (PDF) and the system can automatically extract rooms and generate tasks from it. This saves significant manual work.

   SPACE PLANNER (Floor Map):
   - Draw floor plans with walls, rooms, and objects.
   - Rooms created in Space Planner are synced with the Rooms management section.
   - AI Floor Plan Import: Upload a floor plan image and AI will automatically detect and create rooms.
   - Each room can have detailed properties: dimensions, status (existing, new construction, to be renovated), materials, photos.
   - Rooms connect to tasks — you can see related tasks and purchase orders per room.
   - The Elevation View lets you visualize wall elevations with shapes, dimensions, and annotations.
   - Keyboard shortcuts (Ctrl+Z undo, Ctrl+S save, etc.) speed up work significantly.

   PURCHASE ORDERS & BUDGET:
   - Create purchase requests linked to tasks and rooms.
   - Track payment status and connect invoices.
   - The Budget dashboard aggregates costs across all purchases.

   TEAM MANAGEMENT:
   - Invite team members with different roles (Owner, Admin, Member, Viewer).
   - Each role has different permissions for editing, viewing, and managing the project.

   ${smartTips}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, language = "en", userType } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cache for single-message requests (quick prompts)
    const isSingleMessage = messages.length === 1;
    if (isSingleMessage) {
      const cacheKey = `${language}:${userType || "default"}:${messages[0].content}`;

      // Look up cache via REST API
      const cacheRes = await fetch(
        `${supabaseRestUrl("help_bot_cache")}?cache_key=eq.${encodeURIComponent(cacheKey)}&select=response&limit=1`,
        { headers: supabaseRestHeaders() },
      );
      if (cacheRes.ok) {
        const rows = await cacheRes.json();
        if (rows.length > 0 && rows[0].response) {
          return new Response(
            JSON.stringify({ reply: rows[0].response }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // Cache miss — call OpenAI and store result
      const reply = await callOpenAI(openaiApiKey, messages, language, userType);

      // Store in cache (fire-and-forget, don't block response)
      fetch(supabaseRestUrl("help_bot_cache"), {
        method: "POST",
        headers: { ...supabaseRestHeaders(), Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          cache_key: cacheKey,
          response: reply,
          language,
          user_type: userType || null,
        }),
      }).catch(() => {});

      return new Response(
        JSON.stringify({ reply }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Multi-message conversation — trim to last N messages and call OpenAI
    const trimmedMessages = messages.slice(-MAX_HISTORY_MESSAGES);
    const reply = await callOpenAI(openaiApiKey, trimmedMessages, language, userType);

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Help bot failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function callOpenAI(
  apiKey: string,
  messages: { role: string; content: string }[],
  language: string,
  userType?: string,
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 1024,
      messages: [
        { role: "system", content: buildSystemPrompt(language, userType) },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", errorText);
    throw new Error("AI API error");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}
