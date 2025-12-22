import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailQueueItem {
  id: string;
  anotacao_id: string | null;
  to_email: string;
  subject: string;
  body_html: string;
  send_at: string;
  sent_at: string | null;
  attempts: number;
  last_error: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendEmailWithResend(
  apiKey: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "So Garagens Hub <onboarding@resend.dev>",
        to: [toEmail],
        subject: subject,
        html: html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      return { success: false, error: data.message || JSON.stringify(data) };
    }

    console.log("✅ Email sent via Resend:", data);
    return { success: true };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("📧 [send-anotacao-reminders] Starting...");

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("REMINDERS_FROM_EMAIL") || "lembretes@resend.dev";

  if (!resendApiKey) {
    console.error("❌ RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const now = new Date().toISOString();
    console.log(`⏰ Current time: ${now}`);

    // Fetch pending emails that are due to be sent (limit to 10 to avoid rate limits)
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("email_queue")
      .select("*")
      .is("sent_at", null)
      .lte("send_at", now)
      .lt("attempts", 3)
      .order("send_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("❌ Error fetching email queue:", fetchError);
      throw fetchError;
    }

    console.log(`📬 Found ${pendingEmails?.length || 0} pending emails to send`);

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No pending emails" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    let errorCount = 0;

    for (let i = 0; i < pendingEmails.length; i++) {
      const email = pendingEmails[i] as EmailQueueItem;
      console.log(`📤 Sending email ${i + 1}/${pendingEmails.length} to: ${email.to_email}, subject: ${email.subject}`);

      const result = await sendEmailWithResend(
        resendApiKey,
        fromEmail,
        email.to_email,
        email.subject,
        email.body_html
      );

      if (result.success) {
        // Update email_queue to mark as sent
        const { error: updateError } = await supabase
          .from("email_queue")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", email.id);

        if (updateError) {
          console.error(`❌ Error updating email_queue for ${email.id}:`, updateError);
        }

        // Update anotacao to mark email as sent
        if (email.anotacao_id) {
          const { error: anotacaoError } = await supabase
            .from("anotacoes")
            .update({ reminder_email_sent_at: new Date().toISOString() })
            .eq("id", email.anotacao_id);

          if (anotacaoError) {
            console.error(`❌ Error updating anotacao ${email.anotacao_id}:`, anotacaoError);
          }
        }

        // Also update email_reminders_queue if exists
        if (email.anotacao_id) {
          const { error: reminderQueueError } = await supabase
            .from("email_reminders_queue")
            .update({ 
              sent_at: new Date().toISOString(),
              status: "sent" 
            })
            .eq("send_at", email.send_at)
            .eq("to_email", email.to_email);

          if (reminderQueueError) {
            console.error(`❌ Error updating email_reminders_queue:`, reminderQueueError);
          }
        }

        sentCount++;
      } else {
        console.error(`❌ Error sending email ${email.id}:`, result.error);
        errorCount++;

        // Update attempts and last_error
        const { error: updateError } = await supabase
          .from("email_queue")
          .update({ 
            attempts: email.attempts + 1,
            last_error: result.error || "Unknown error"
          })
          .eq("id", email.id);

        if (updateError) {
          console.error(`❌ Error updating attempts for ${email.id}:`, updateError);
        }
      }

      // Wait 600ms between emails to respect Resend rate limit (2 per second)
      if (i < pendingEmails.length - 1) {
        await sleep(600);
      }
    }

    console.log(`📧 Email processing complete: ${sentCount} sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        errors: errorCount,
        total: pendingEmails.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Error in send-anotacao-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
