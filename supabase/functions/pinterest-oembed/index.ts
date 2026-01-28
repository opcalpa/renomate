import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pinUrl } = await req.json();

    if (!pinUrl) {
      return new Response(
        JSON.stringify({ error: "pinUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate it's a Pinterest URL
    if (!pinUrl.includes("pinterest")) {
      return new Response(
        JSON.stringify({ error: "Invalid Pinterest URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch from Pinterest oEmbed
    const oEmbedUrl = `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(pinUrl)}`;

    const response = await fetch(oEmbedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Renomate/1.0)",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ error: "Pin not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Pinterest API error: ${response.status}`);
    }

    const data = await response.json();

    // Get largest possible image URL
    // Pinterest sizes: 236x, 474x, 736x, originals
    let imageUrl = data.thumbnail_url || "";
    if (imageUrl.includes("/236x/")) {
      imageUrl = imageUrl.replace("/236x/", "/originals/");
    } else if (imageUrl.includes("/474x/")) {
      imageUrl = imageUrl.replace("/474x/", "/originals/");
    } else if (imageUrl.includes("/736x/")) {
      imageUrl = imageUrl.replace("/736x/", "/originals/");
    }

    // Extract pin ID from URL
    const pinIdMatch = pinUrl.match(/\/pin\/(\d+)/);
    const pinId = pinIdMatch ? pinIdMatch[1] : data.pin_id || "";

    const result = {
      pinId,
      title: data.title || "Pinterest pin",
      imageUrl,
      authorName: data.author_name || "",
      authorUrl: data.author_url || "",
      sourceUrl: pinUrl,
      width: data.width || data.thumbnail_width || 0,
      height: data.height || data.thumbnail_height || 0,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch pin data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
