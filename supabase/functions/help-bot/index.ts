import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function buildSystemPrompt(language: string): string {
  const langName = LANGUAGE_NAMES[language] || "English";
  return `You are "Renomate" — a helpful assistant that is both a renovation/building expert AND a platform guide for the Renomate project management app.

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

   SMART TIPS TO SHARE WITH USERS:
   - "Set start and end dates on all tasks so they appear on the Timeline — this gives you a visual overview of your entire renovation schedule."
   - "Upload invoices under Files and link them to tasks — this way you always know which cost belongs to which job."
   - "Use AI Document Import to upload your room description (rumsbeskrivning) PDF — it automatically creates rooms and tasks, saving hours of manual input."
   - "In Space Planner, click a room to see its linked tasks and purchase orders — everything is connected."
   - "Use the Budget tab's saved views to track costs by category, room, or time period."
   - "Add photos to rooms in Space Planner to document before/during/after states."
   - "Use keyboard shortcut Ctrl+S regularly in Space Planner to save your work."`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, language = "en" } = await req.json();

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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 1024,
        messages: [
          { role: "system", content: buildSystemPrompt(language) },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI API error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "";

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
