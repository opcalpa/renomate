import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const { message, email } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new Error("Message is required");
    }

    const replyTo = email && typeof email === "string" && email.includes("@") ? email : undefined;

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Feedback / Bug Report</h2>
        ${replyTo ? `<p><strong>From:</strong> ${replyTo}</p>` : "<p><em>Anonymous (no email provided)</em></p>"}
        <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
        <div style="white-space: pre-wrap; background: #f9f9f9; padding: 16px; border-radius: 8px;">
${message.trim()}
        </div>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Renomate Feedback <hello@letsrenomate.com>",
        to: ["hello@letsrenomate.com"],
        subject: "Feedback / Bug Report — Renomate",
        html: emailHtml,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error sending feedback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
