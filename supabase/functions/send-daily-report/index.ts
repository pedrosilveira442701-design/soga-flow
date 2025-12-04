import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Proposta {
  id: string;
  cliente: { nome: string } | null;
  m2: number;
  valor_total: number;
  liquido: number;
  margem_pct: number;
  servicos: any;
  status: string;
}

interface ReportRequest {
  userId?: string;
  immediate?: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
};

const generatePropostasTable = (
  propostas: Proposta[],
  title: string
): string => {
  if (propostas.length === 0) {
    return `
      <div style="margin-bottom: 24px;">
        <h3 style="color: #1a1a1a; font-size: 16px; margin-bottom: 12px;">${title}</h3>
        <p style="color: #666; font-style: italic;">Nenhuma proposta encontrada</p>
      </div>
    `;
  }

  const totalValor = propostas.reduce((sum, p) => sum + (p.valor_total || 0), 0);
  const totalLiquido = propostas.reduce((sum, p) => sum + (p.liquido || 0), 0);

  const rows = propostas
    .map(
      (p) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.cliente?.nome || "Cliente não informado"}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${p.m2?.toFixed(2) || "0.00"} m²</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(p.valor_total)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(p.liquido)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${(p.margem_pct || 0).toFixed(1)}%</td>
      </tr>
    `
    )
    .join("");

  return `
    <div style="margin-bottom: 32px;">
      <h3 style="color: #1a1a1a; font-size: 16px; margin-bottom: 12px;">${title}</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Cliente</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Área</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Valor Total</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Líquido</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Margem</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr style="background-color: #f9f9f9; font-weight: bold;">
            <td style="padding: 10px; border-top: 2px solid #ddd;">Total (${propostas.length} propostas)</td>
            <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd;">—</td>
            <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd;">${formatCurrency(totalValor)}</td>
            <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd;">${formatCurrency(totalLiquido)}</td>
            <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd;">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
};

const generateEmailHtml = (
  propostasAbertas: Proposta[],
  propostasRepouso: Proposta[],
  includeAbertas: boolean,
  includeRepouso: boolean
): string => {
  const date = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let content = "";
  if (includeAbertas) {
    content += generatePropostasTable(propostasAbertas, "📋 Propostas em Aberto");
  }
  if (includeRepouso) {
    content += generatePropostasTable(propostasRepouso, "😴 Propostas em Repouso");
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">📊 Relatório Diário</h1>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">${date}</p>
      </div>
      
      <div style="background: white; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
        ${content || '<p style="color: #666; font-style: italic;">Nenhum relatório selecionado nas preferências.</p>'}
        
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
          <p>Este relatório foi enviado automaticamente pelo Só Garagens Hub.</p>
          <p>
            <a href="https://sogaragens.lovable.app/conta/preferencias?tab=notificacoes" style="color: #667eea; text-decoration: none;">
              Gerenciar preferências de relatório
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, immediate } = (await req.json()) as ReportRequest;

    console.log("📬 Starting daily report generation", { userId, immediate });

    // Get users to send report to
    let query = supabaseClient
      .from("notificacao_preferencias")
      .select("*, profiles:user_id(email, nome)")
      .eq("relatorio_diario_ativo", true);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: preferences, error: prefError } = await query;

    if (prefError) {
      console.error("Error fetching preferences:", prefError);
      throw prefError;
    }

    console.log(`Found ${preferences?.length || 0} users with report enabled`);

    const results: { userId: string; success: boolean; error?: string }[] = [];

    for (const pref of preferences || []) {
      try {
        // Check if email channel is enabled
        if (!pref.relatorio_diario_email) {
          console.log(`Skipping user ${pref.user_id} - email not enabled`);
          continue;
        }

        // Get user email
        const userEmail = pref.email_customizado || (pref.profiles as any)?.email;
        const userName = (pref.profiles as any)?.nome || "Usuário";

        if (!userEmail) {
          console.log(`Skipping user ${pref.user_id} - no email found`);
          continue;
        }

        // Fetch propostas for this user
        const { data: propostasAbertas } = await supabaseClient
          .from("propostas")
          .select("id, m2, valor_total, liquido, margem_pct, servicos, status, cliente:clientes(nome)")
          .eq("user_id", pref.user_id)
          .eq("status", "aberta");

        const { data: propostasRepouso } = await supabaseClient
          .from("propostas")
          .select("id, m2, valor_total, liquido, margem_pct, servicos, status, cliente:clientes(nome)")
          .eq("user_id", pref.user_id)
          .eq("status", "repouso");

        const emailHtml = generateEmailHtml(
          (propostasAbertas || []) as unknown as Proposta[],
          (propostasRepouso || []) as unknown as Proposta[],
          pref.relatorio_propostas_abertas,
          pref.relatorio_propostas_repouso
        );

        // Send email via Resend API
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: Deno.env.get("REMINDERS_FROM_EMAIL") || "Só Garagens <onboarding@resend.dev>",
            to: [userEmail],
            subject: `📊 Relatório Diário - Só Garagens Hub`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.error(`Error sending email to ${userEmail}:`, errorData);
          results.push({ userId: pref.user_id, success: false, error: errorData.message || "Email send failed" });
          continue;
        }

        // Update last sent timestamp
        await supabaseClient
          .from("notificacao_preferencias")
          .update({ relatorio_ultimo_envio: new Date().toISOString() })
          .eq("user_id", pref.user_id);

        console.log(`✅ Report sent to ${userEmail}`);
        results.push({ userId: pref.user_id, success: true });
      } catch (userError: any) {
        console.error(`Error processing user ${pref.user_id}:`, userError);
        results.push({ userId: pref.user_id, success: false, error: userError.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`📬 Report generation complete: ${successCount}/${results.length} sent successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${successCount} relatório(s) enviado(s) com sucesso`,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-daily-report function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
