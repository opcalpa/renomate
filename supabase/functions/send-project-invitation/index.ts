import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// 1. Hämta variablerna först
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// 2. Kontrollera dem sen
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
  console.error("Saknade variabler:", { 
    url: !!SUPABASE_URL, 
    role: !!SUPABASE_SERVICE_ROLE_KEY, 
    resend: !!RESEND_API_KEY 
  });
  // Vi kastar inte Error här ute för då dör hela servern, 
  // vi loggar det så vi ser det i Supabase-loggarna.
}

interface InvitationData {
  invitationId: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invitationId }: InvitationData = await req.json();

    if (!invitationId) {
      throw new Error("Missing invitationId");
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Fetch invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from("project_invitations")
      .select(`
        *,
        project:projects(id, name),
        inviter:profiles!invited_by_user_id(name, email)
      `)
      .eq("id", invitationId)
      .single();

    if (invitationError || !invitation) {
      throw new Error(`Failed to fetch invitation: ${invitationError?.message}`);
    }

    // Build invitation URL
    const invitationUrl = `${req.headers.get("origin") || "https://your-app.com"}/invitation?token=${invitation.token}`;

    // Prepare email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #f9f9f9;
              border-radius: 8px;
              padding: 30px;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #10b981;
              color: white !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .details {
              background: white;
              padding: 15px;
              border-radius: 6px;
              margin: 15px 0;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 14px;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>🏠 Project Invitation - ${invitation.project.name}</h2>
            <p>Hi!</p>
            <p><strong>${invitation.inviter.name || invitation.inviter.email}</strong> has invited you to collaborate on their renovation project: <strong>${invitation.project.name}</strong></p>
            
            <div class="details">
              <h3>Your Access Level</h3>
              <ul>
                <li><strong>Role:</strong> ${invitation.role}</li>
                <li><strong>Timeline:</strong> ${invitation.timeline_access || 'view'}</li>
                <li><strong>Tasks:</strong> ${invitation.tasks_access || 'view'} ${invitation.tasks_scope ? `(${invitation.tasks_scope})` : ''}</li>
                <li><strong>Space Planner:</strong> ${invitation.space_planner_access || 'view'}</li>
                <li><strong>Purchase Orders:</strong> ${invitation.purchases_access || 'view'} ${invitation.purchases_scope ? `(${invitation.purchases_scope})` : ''}</li>
                <li><strong>Overview:</strong> ${invitation.overview_access || 'view'}</li>
              </ul>
            </div>

            <p>Click the button below to accept the invitation and start collaborating:</p>
            
            <a href="${invitationUrl}" class="button">Accept Invitation</a>
            
            <p style="color: #666; font-size: 14px;">
              Or copy this link: <br>
              <code style="background: #eee; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 5px;">${invitationUrl}</code>
            </p>
          </div>
          
          <div class="footer">
            <p>This invitation will expire in 7 days.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Renomate <hello@letsrenomate.com>", // Change this after verifying your domain
        to: [invitation.email],
        subject: `You're invited to ${invitation.project.name} - Renomate`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const resendData = await resendResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: resendData.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending invitation:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
