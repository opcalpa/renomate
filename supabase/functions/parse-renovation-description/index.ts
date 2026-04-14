import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

const VALID_ROOMS = [
  "kitchen", "bathroom", "livingRoom", "bedroom", "wcShower",
  "laundry", "hallway", "office", "kidsRoom", "balcony",
  "basement", "attic", "garage", "patio",
];

const VALID_WORK_TYPES = [
  "rivning", "el", "vvs", "kakel", "snickeri", "malning",
  "golv", "kok", "badrum", "fonster_dorrar", "fasad",
  "tak", "tradgard", "annat",
];

const ROOM_NAME_MAP: Record<string, string> = {
  kitchen: "Kök", bathroom: "Badrum", livingRoom: "Vardagsrum",
  bedroom: "Sovrum", wcShower: "WC/Dusch", laundry: "Tvättstuga",
  hallway: "Hall", office: "Kontor", kidsRoom: "Barnrum",
  balcony: "Balkong", basement: "Källare", attic: "Vind",
  garage: "Garage", patio: "Uteplats",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const { description, language } = await req.json();

    if (!description || typeof description !== "string") {
      return jsonResponse({ error: "description is required" }, 400, req);
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return jsonResponse({ error: "OpenAI API key not configured" }, 500, req);
    }

    const lang = language || "sv";

    const systemPrompt = `You are a renovation planning assistant. Parse the user's free-text renovation description and extract structured data.

Return JSON with this exact structure:
{
  "rooms": [
    { "nameKey": "<one of the valid room keys>", "name": "<display name in ${lang}>", "suggestedWorkTypes": ["<valid work types>"] }
  ],
  "globalWorkTypes": ["<work types that apply to ALL rooms>"],
  "summary": "<one sentence summary>"
}

Valid room keys: ${VALID_ROOMS.join(", ")}
Room display names (Swedish): ${Object.entries(ROOM_NAME_MAP).map(([k, v]) => `${k}=${v}`).join(", ")}

Valid work types: ${VALID_WORK_TYPES.join(", ")}
Work type meanings: rivning=demolition, el=electrical, vvs=plumbing, kakel=tiling, snickeri=carpentry, malning=painting, golv=flooring, kok=kitchen installation, badrum=bathroom installation, fonster_dorrar=windows/doors, fasad=facade, tak=roofing, tradgard=landscaping, annat=other

Rules:
- Map rooms to the closest valid nameKey. If "sovrum" mentioned, use "bedroom". If "toalett" or "gästtoalett", use "wcShower". If "matsal", use "livingRoom".
- If a room doesn't match any predefined key, still include it with the closest match or use a descriptive name.
- IMPORTANT: If the user mentions MULTIPLE rooms of the same type (e.g. "2 barnrum", "3 sovrum", "båda badrummen"), create SEPARATE entries for each with numbered names (e.g. "Barnrum 1", "Barnrum 2"). Use the same nameKey for each but different display names.
- Work types mentioned without a specific room context (e.g. "måla om överallt") go in globalWorkTypes.
- Work types mentioned for a specific room go in that room's suggestedWorkTypes.
- "malning" (painting) and "el" (electrical) are commonly global — only put them in globalWorkTypes if the text implies they apply everywhere.
- Return valid JSON only, no markdown.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: description },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", errorText);
      return jsonResponse({ error: "AI service error" }, 502, req);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return jsonResponse({ error: "Empty AI response" }, 502, req);
    }

    const parsed = JSON.parse(content);

    // Validate and filter to valid values
    const validatedRooms = (parsed.rooms || []).map((r: Record<string, unknown>) => ({
      nameKey: VALID_ROOMS.includes(r.nameKey as string) ? r.nameKey : "annat",
      name: r.name || ROOM_NAME_MAP[r.nameKey as string] || r.nameKey,
      suggestedWorkTypes: ((r.suggestedWorkTypes as string[]) || []).filter((wt: string) =>
        VALID_WORK_TYPES.includes(wt)
      ),
    }));

    const validatedGlobals = ((parsed.globalWorkTypes as string[]) || []).filter((wt: string) =>
      VALID_WORK_TYPES.includes(wt)
    );

    return jsonResponse(
      {
        rooms: validatedRooms,
        globalWorkTypes: validatedGlobals,
        summary: parsed.summary || "",
      },
      200,
      req
    );
  } catch (err) {
    console.error("parse-renovation-description error:", err);
    return jsonResponse({ error: "Internal error" }, 500, req);
  }
});
