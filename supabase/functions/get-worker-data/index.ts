import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://app.letsrenomate.com",
  "https://letsrenomate.com",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return jsonResponse({ error: "Token is required" }, 400, req);
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Validate token
    const { data: tokenRecord, error: tokenError } = await sb
      .from("worker_access_tokens")
      .select("*")
      .eq("token", token)
      .is("revoked_at", null)
      .single();

    if (tokenError || !tokenRecord) {
      return jsonResponse({ error: "not_found" }, 404, req);
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return jsonResponse({ error: "expired" }, 410, req);
    }

    // 2. Update last_accessed_at (best-effort)
    sb.from("worker_access_tokens")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", tokenRecord.id)
      .then(() => {});

    // 3. Fetch project name
    const { data: project } = await sb
      .from("projects")
      .select("name")
      .eq("id", tokenRecord.project_id)
      .single();

    // 4. Fetch assigned tasks
    const taskIds: string[] = tokenRecord.assigned_task_ids || [];
    if (taskIds.length === 0) {
      return jsonResponse({
        projectName: project?.name || "",
        workerName: tokenRecord.worker_name,
        language: tokenRecord.worker_language,
        canUploadPhotos: tokenRecord.can_upload_photos,
        canToggleChecklist: tokenRecord.can_toggle_checklist,
        tasks: [],
      }, 200, req);
    }

    const { data: tasks } = await sb
      .from("tasks")
      .select("id, title, description, status, progress, checklists, room_id")
      .in("id", taskIds);

    // 5. Fetch rooms for those tasks
    const roomIds = [...new Set((tasks || []).map((t) => t.room_id).filter(Boolean))];
    let roomsMap: Record<string, unknown> = {};
    if (roomIds.length > 0) {
      const { data: rooms } = await sb
        .from("rooms")
        .select("id, name, wall_spec, floor_spec, ceiling_spec, joinery_spec, dimensions, ceiling_height_mm")
        .in("id", roomIds);
      for (const room of rooms || []) {
        roomsMap[room.id] = room;
      }
    }

    // 5b. Fetch floor plan shapes for the project (rooms only, for mini-map)
    const { data: floorShapes } = await sb
      .from("floor_map_shapes")
      .select("id, shape_type, shape_data, room_id, color, stroke_color")
      .eq("project_id", tokenRecord.project_id)
      .eq("shape_type", "room");

    const floorPlanShapes = (floorShapes || []).map((s) => ({
      id: s.id,
      roomId: s.room_id,
      points: (s.shape_data as Record<string, unknown>)?.points || [],
      color: s.color || "rgba(59, 130, 246, 0.2)",
      strokeColor: s.stroke_color || "rgba(41, 91, 172, 0.8)",
      name: roomsMap[s.room_id as string] ? (roomsMap[s.room_id as string] as Record<string, unknown>).name : null,
    }));

    // 5c. Fetch translations for worker's language
    const workerLang = tokenRecord.worker_language;
    let translationsMap: Record<string, { title: string; description: string | null; checklists: unknown }> = {};
    if (workerLang && workerLang !== "en" && workerLang !== "sv") {
      const { data: translations } = await sb
        .from("task_translations")
        .select("task_id, title, description, checklists")
        .in("task_id", taskIds)
        .eq("language", workerLang);
      for (const tr of translations || []) {
        translationsMap[tr.task_id] = { title: tr.title, description: tr.description, checklists: tr.checklists };
      }
    }

    // 6. Fetch photos for tasks
    const { data: photos } = await sb
      .from("photos")
      .select("id, url, caption, linked_to_id, created_at")
      .eq("linked_to_type", "task")
      .in("linked_to_id", taskIds)
      .order("created_at", { ascending: false });

    const photosByTask: Record<string, unknown[]> = {};
    for (const photo of photos || []) {
      const tid = photo.linked_to_id;
      if (!photosByTask[tid]) photosByTask[tid] = [];
      photosByTask[tid].push({ id: photo.id, url: photo.url, caption: photo.caption });
    }

    // 7. Assemble response (use translations when available)
    const workerTasks = (tasks || []).map((task) => {
      const room = task.room_id ? roomsMap[task.room_id] as Record<string, unknown> | undefined : null;
      const tr = translationsMap[task.id];
      return {
        id: task.id,
        title: tr?.title || task.title,
        description: tr?.description ?? task.description,
        status: task.status,
        progress: task.progress || 0,
        checklists: tr?.checklists || task.checklists || [],
        photos: photosByTask[task.id] || [],
        roomId: task.room_id || null,
        room: room
          ? {
              name: room.name,
              wallSpec: room.wall_spec || null,
              floorSpec: room.floor_spec || null,
              ceilingSpec: room.ceiling_spec || null,
              joinerySpec: room.joinery_spec || null,
              dimensions: room.dimensions || null,
              ceilingHeightMm: room.ceiling_height_mm || null,
            }
          : null,
      };
    });

    return jsonResponse({
      projectName: project?.name || "",
      workerName: tokenRecord.worker_name,
      language: tokenRecord.worker_language,
      canUploadPhotos: tokenRecord.can_upload_photos,
      canToggleChecklist: tokenRecord.can_toggle_checklist,
      tasks: workerTasks,
      floorPlan: floorPlanShapes.length > 0 ? floorPlanShapes : null,
    }, 200, req);
  } catch (error) {
    console.error("get-worker-data error:", error);
    return jsonResponse({ error: error.message }, 500, req);
  }
});
