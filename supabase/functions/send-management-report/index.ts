import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReportRequest {
  userId?: string;
  immediate?: boolean;
  scheduled?: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
};

const formatDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
};

// Check if current time matches user's configured schedule
const shouldSendNow = (
  frequencia: string,
  hora: string,
  diaSemana: number,
  diaMes: number,
  timezone: string
): boolean => {
  try {
    const now = new Date();
    
    // Get current time in user's timezone
    const userTimeStr = now.toLocaleString("en-US", { 
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false 
    });
    
    const userDateStr = now.toLocaleDateString("en-US", {
      timeZone: timezone,
      weekday: "long"
    });
    
    const userDayOfMonth = parseInt(now.toLocaleDateString("en-US", {
      timeZone: timezone,
      day: "numeric"
    }));
    
    // Parse configured hour
    const [configuredHour, configuredMinute] = hora.split(":").map(Number);
    const [currentHour, currentMinute] = userTimeStr.split(":").map(Number);
    
    // Check if time matches
    const timeMatches = currentHour === configuredHour && currentMinute === configuredMinute;
    
    if (!timeMatches) return false;
    
    // For daily, just check time
    if (frequencia === "diaria") {
      return true;
    }
    
    // For weekly, check day of week (0=Sunday, 1=Monday, etc.)
    if (frequencia === "semanal") {
      const dayMap: { [key: string]: number } = {
        "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3,
        "Thursday": 4, "Friday": 5, "Saturday": 6
      };
      const currentDayOfWeek = dayMap[userDateStr.split(",")[0]] ?? 0;
      return currentDayOfWeek === diaSemana;
    }
    
    // For monthly, check day of month
    if (frequencia === "mensal") {
      // Handle months with fewer days
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const targetDay = Math.min(diaMes, lastDayOfMonth);
      return userDayOfMonth === targetDay;
    }
    
    return false;
  } catch (error) {
    console.error("Error checking schedule:", error);
    return false;
  }
};

// Generate section HTML
const generateSection = (title: string, icon: string, items: string[]): string => {
  if (items.length === 0) {
    return `
      <div style="margin-bottom: 24px;">
        <h3 style="color: #374151; font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          ${icon} ${title}
        </h3>
        <p style="color: #6b7280; font-style: italic; padding: 12px; background: #f9fafb; border-radius: 8px;">
          Nenhum dado relevante no período
        </p>
      </div>
    `;
  }

  return `
    <div style="margin-bottom: 24px;">
      <h3 style="color: #374151; font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        ${icon} ${title}
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        ${items.map(item => `<li style="margin-bottom: 6px;">${item}</li>`).join("")}
      </ul>
    </div>
  `;
};

// Generate parcelas table for "a vencer"
const generateParcelasTable = (parcelas: any[]): string => {
  if (parcelas.length === 0) {
    return `<p style="color: #6b7280; font-style: italic;">Nenhuma parcela a vencer</p>`;
  }

  const rows = parcelas.slice(0, 15).map(p => `
    <tr>
      <td style="padding: 6px 10px; border-bottom: 1px solid #e5e7eb;">${p.clienteNome || 'N/A'}</td>
      <td style="padding: 6px 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${formatDate(p.vencimento)}</td>
      <td style="padding: 6px 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(p.valor_liquido_parcela)}</td>
    </tr>
  `).join("");

  return `
    <div style="overflow-x: auto; margin-top: 8px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px 10px; text-align: left; border-bottom: 2px solid #d1d5db;">Cliente</th>
            <th style="padding: 8px 10px; text-align: center; border-bottom: 2px solid #d1d5db;">Vencimento</th>
            <th style="padding: 8px 10px; text-align: right; border-bottom: 2px solid #d1d5db;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      ${parcelas.length > 15 ? `<p style="color: #6b7280; font-size: 12px; margin-top: 8px;">... e mais ${parcelas.length - 15} parcelas</p>` : ''}
    </div>
  `;
};

// Generate geographic table
const generateGeographicTable = (regionData: any[]): string => {
  if (regionData.length === 0) {
    return `
      <div style="margin-bottom: 24px;">
        <h3 style="color: #374151; font-size: 16px; margin-bottom: 12px;">📍 Resumo Geográfico</h3>
        <p style="color: #6b7280; font-style: italic; padding: 12px; background: #f9fafb; border-radius: 8px;">
          Nenhum dado geográfico disponível
        </p>
      </div>
    `;
  }

  // Calculate totals
  const totals = regionData.reduce((acc, r) => ({
    abertas: acc.abertas + r.abertas,
    fechadas: acc.fechadas + r.fechadas,
    repouso: acc.repouso + r.repouso,
    perdidas: acc.perdidas + r.perdidas,
    total: acc.total + r.total,
  }), { abertas: 0, fechadas: 0, repouso: 0, perdidas: 0, total: 0 });

  const totalConversao = totals.total > 0 ? (totals.fechadas / totals.total) * 100 : 0;

  const rows = regionData.slice(0, 10).map(r => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${r.regiao}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${r.abertas}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${r.fechadas}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${r.repouso}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${r.perdidas}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${r.total}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600; color: ${r.conversao >= 50 ? '#059669' : r.conversao >= 25 ? '#d97706' : '#dc2626'};">
        ${r.conversao.toFixed(1)}%
      </td>
    </tr>
  `).join("");

  return `
    <div style="margin-bottom: 24px;">
      <h3 style="color: #374151; font-size: 16px; margin-bottom: 12px;">📍 Resumo Geográfico (Top 10 Regiões - por quantidade)</h3>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #d1d5db;">Região</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d1d5db;">Abertas</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d1d5db;">Fechadas</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d1d5db;">Repouso</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d1d5db;">Perdidas</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d1d5db;">Total</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d1d5db;">Conversão</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="background-color: #f9fafb; font-weight: 700;">
              <td style="padding: 10px; border-top: 2px solid #d1d5db;">TOTAL GERAL</td>
              <td style="padding: 10px; border-top: 2px solid #d1d5db; text-align: center;">${totals.abertas}</td>
              <td style="padding: 10px; border-top: 2px solid #d1d5db; text-align: center;">${totals.fechadas}</td>
              <td style="padding: 10px; border-top: 2px solid #d1d5db; text-align: center;">${totals.repouso}</td>
              <td style="padding: 10px; border-top: 2px solid #d1d5db; text-align: center;">${totals.perdidas}</td>
              <td style="padding: 10px; border-top: 2px solid #d1d5db; text-align: center;">${totals.total}</td>
              <td style="padding: 10px; border-top: 2px solid #d1d5db; text-align: center; color: ${totalConversao >= 50 ? '#059669' : totalConversao >= 25 ? '#d97706' : '#dc2626'};">
                ${totalConversao.toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
};

// Generate full email HTML
const generateEmailHtml = (data: any, frequencia: string): string => {
  const date = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const frequenciaLabel = frequencia === "diaria" ? "Diário" : frequencia === "semanal" ? "Semanal" : "Mensal";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">📊 Relatório de Gestão (Overview)</h1>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">${frequenciaLabel} • ${date}</p>
      </div>
      
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
        ${generateSection("Leads", "🎯", data.leads)}
        ${generateSection("Propostas", "📋", data.propostas)}
        ${generateSection("Obras", "🏗️", data.obras)}
        ${data.financeiroHtml}
        ${generateSection("Tarefas & Metas", "✅", data.tarefas)}
        ${generateGeographicTable(data.geografico)}
      </div>
      
      <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; text-align: center; color: #6b7280; font-size: 12px;">
        <p>Este relatório foi enviado automaticamente pelo Só Garagens Hub.</p>
        <p>
          <a href="https://sogaragens.lovable.app/conta/preferencias?tab=notificacoes" style="color: #1e40af; text-decoration: none;">
            Gerenciar preferências de relatório
          </a>
        </p>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    let body: ReportRequest = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine for scheduled calls
    }

    const { userId, immediate, scheduled } = body;

    console.log("📊 [send-management-report] start", { userId, immediate, scheduled });

    // Get preferences
    let query = supabaseClient
      .from("notificacao_preferencias")
      .select("*")
      .eq("relatorio_gestao_ativo", true);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: preferences, error: prefError } = await query;

    if (prefError) {
      console.error("Error fetching preferences:", prefError);
      throw prefError;
    }

    console.log(`Found ${preferences?.length || 0} users with management report enabled`);

    const results: { userId: string; success: boolean; error?: string; skipped?: boolean }[] = [];

    for (const pref of preferences || []) {
      try {
        if (!pref.relatorio_gestao_email) {
          console.log(`Skipping user ${pref.user_id} - email not enabled`);
          results.push({ userId: pref.user_id, success: false, skipped: true, error: "Email not enabled" });
          continue;
        }

        // For scheduled calls, check if it's the right time
        if (scheduled && !immediate && !userId) {
          const shouldSend = shouldSendNow(
            pref.relatorio_gestao_frequencia || "diaria",
            pref.relatorio_gestao_hora || "08:00:00",
            pref.relatorio_gestao_dia_semana || 1,
            pref.relatorio_gestao_dia_mes || 1,
            pref.relatorio_diario_timezone || "America/Sao_Paulo"
          );

          if (!shouldSend) {
            console.log(`Skipping user ${pref.user_id} - not scheduled time`);
            results.push({ userId: pref.user_id, success: false, skipped: true, error: "Not scheduled time" });
            continue;
          }

          // Check if already sent recently
          if (pref.relatorio_gestao_ultimo_envio) {
            const lastSent = new Date(pref.relatorio_gestao_ultimo_envio);
            const now = new Date();
            const diffMinutes = (now.getTime() - lastSent.getTime()) / (1000 * 60);

            // Prevent duplicate sends within 55 minutes
            if (diffMinutes < 55) {
              console.log(`Skipping user ${pref.user_id} - already sent ${diffMinutes.toFixed(0)} minutes ago`);
              results.push({ userId: pref.user_id, success: false, skipped: true, error: "Already sent recently" });
              continue;
            }
          }
        }

        // Get user profile
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("email, nome")
          .eq("id", pref.user_id)
          .single();

        const userEmail = pref.email_customizado || profile?.email;
        const userName = profile?.nome || "Usuário";

        if (!userEmail) {
          console.log(`Skipping user ${pref.user_id} - no email found`);
          results.push({ userId: pref.user_id, success: false, error: "No email found" });
          continue;
        }

        console.log(`Processing management report for ${userName} (${userEmail})`);

        // Calculate time ranges
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        
        let periodStart: Date;
        if (pref.relatorio_gestao_frequencia === "semanal") {
          periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (pref.relatorio_gestao_frequencia === "mensal") {
          periodStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        } else {
          periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        const periodLabel = pref.relatorio_gestao_frequencia === "semanal" ? "7 dias" : 
                           pref.relatorio_gestao_frequencia === "mensal" ? "30 dias" : "24h";

        // ========== LEADS DATA ==========
        const { data: leads } = await supabaseClient
          .from("leads")
          .select("id, estagio, ultima_interacao, created_at, cliente:clientes(nome)")
          .eq("user_id", pref.user_id);

        const now24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const now72h = new Date(now.getTime() - 72 * 60 * 60 * 1000);

        const leadsSemMov24h = (leads || []).filter(l => {
          const lastInteraction = l.ultima_interacao ? new Date(l.ultima_interacao) : new Date(l.created_at);
          return lastInteraction < now24h && l.estagio !== "perdido" && l.estagio !== "finalizado";
        }).length;

        const leadsSemMov72h = (leads || []).filter(l => {
          const lastInteraction = l.ultima_interacao ? new Date(l.ultima_interacao) : new Date(l.created_at);
          return lastInteraction < now72h && l.estagio !== "perdido" && l.estagio !== "finalizado";
        }).length;

        const novosLeads = (leads || []).filter(l => new Date(l.created_at) >= periodStart).length;

        // ========== PROPOSTAS DATA ==========
        const { data: propostas } = await supabaseClient
          .from("propostas")
          .select("id, status, valor_total, liquido, created_at, updated_at, cliente:clientes(nome, bairro, cidade)")
          .eq("user_id", pref.user_id);

        const propostasAbertas = (propostas || []).filter(p => p.status === "aberta");
        const propostasFechadasMes = (propostas || []).filter(p => p.status === "fechada" && new Date(p.updated_at) >= startOfMonth);
        const propostasFechadasAno = (propostas || []).filter(p => p.status === "fechada" && new Date(p.updated_at) >= startOfYear);
        const propostasPerdidasMes = (propostas || []).filter(p => p.status === "perdida" && new Date(p.updated_at) >= startOfMonth);
        const propostasRepouso = (propostas || []).filter(p => p.status === "repouso");

        const valorPropostasAbertas = propostasAbertas.reduce((sum, p) => sum + (p.valor_total || 0), 0);
        const margemLiquidaAbertas = propostasAbertas.reduce((sum, p) => sum + (p.liquido || 0), 0);

        // ========== OBRAS DATA ==========
        const { data: obras } = await supabaseClient
          .from("obras")
          .select("id, status, updated_at, fotos, progresso_pct")
          .eq("user_id", pref.user_id);

        const obrasAtivas = (obras || []).filter(o => o.status !== "concluida" && o.status !== "pausada");
        const obrasParadas = (obras || []).filter(o => {
          const lastUpdate = new Date(o.updated_at);
          return (now.getTime() - lastUpdate.getTime()) > 7 * 24 * 60 * 60 * 1000 && 
                 o.status !== "concluida" && o.status !== "pausada";
        });
        const obrasSemFotos = (obras || []).filter(o => {
          const fotos = o.fotos as any[] || [];
          return fotos.length === 0 && o.status !== "concluida";
        });

        // ========== FINANCEIRO DATA ==========
        const { data: parcelas } = await supabaseClient
          .from("financeiro_parcelas")
          .select("id, status, vencimento, valor_liquido_parcela, contrato_id")
          .eq("user_id", pref.user_id);

        const { data: contratos } = await supabaseClient
          .from("contratos")
          .select("id, status, valor_negociado, margem_pct, cliente:clientes(nome)")
          .eq("user_id", pref.user_id);

        // Build contrato map for getting bruto values
        const contratoMap: { [key: string]: { valorNegociado: number; margemPct: number; clienteNome: string } } = {};
        for (const c of contratos || []) {
          const cliente = c.cliente as any;
          contratoMap[c.id] = {
            valorNegociado: c.valor_negociado || 0,
            margemPct: c.margem_pct || 0,
            clienteNome: cliente?.nome || 'N/A'
          };
        }

        const parcelasVencidas = (parcelas || []).filter(p => p.status === "atrasado" || (p.status === "pendente" && new Date(p.vencimento) < now));
        const parcelasAVencer = (parcelas || []).filter(p => {
          const venc = new Date(p.vencimento);
          return p.status === "pendente" && venc >= now;
        }).sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
        
        const contratosAtivos = (contratos || []).filter(c => c.status === "ativo");

        // Calculate bruto vs liquido for vencidas
        const valorLiquidoVencidas = parcelasVencidas.reduce((sum, p) => sum + (p.valor_liquido_parcela || 0), 0);
        
        // For bruto we need to calculate from contrato valor_negociado / numero_parcelas
        // But simpler: bruto = liquido / (1 - margem_pct/100) approximately
        // Or we can estimate bruto from the contrato
        let valorBrutoVencidas = 0;
        for (const p of parcelasVencidas) {
          const contrato = contratoMap[p.contrato_id];
          if (contrato && contrato.margemPct > 0) {
            // Bruto = Liquido / (margem_pct / 100) approximately
            // Actually bruto = liquido + (liquido * margem / (100 - margem))
            // Simpler: just show liquido for now and note it
            valorBrutoVencidas += (p.valor_liquido_parcela || 0) / ((100 - contrato.margemPct) / 100);
          } else {
            valorBrutoVencidas += p.valor_liquido_parcela || 0;
          }
        }

        // Enrich parcelas a vencer with client names
        const parcelasAVencerEnriquecidas = parcelasAVencer.map(p => ({
          ...p,
          clienteNome: contratoMap[p.contrato_id]?.clienteNome || 'N/A'
        }));

        const valorParcelasAVencer = parcelasAVencer.reduce((sum, p) => sum + (p.valor_liquido_parcela || 0), 0);

        // Build financeiro HTML with table for parcelas
        const financeiroHtml = `
          <div style="margin-bottom: 24px;">
            <h3 style="color: #374151; font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              💰 Financeiro
            </h3>
            <ul style="margin: 0; padding-left: 20px; color: #4b5563; margin-bottom: 16px;">
              <li style="margin-bottom: 6px;">Parcelas vencidas: <strong>${parcelasVencidas.length}</strong></li>
              <li style="margin-bottom: 6px; padding-left: 20px; color: #6b7280;">
                Valor bruto: <strong>${formatCurrency(valorBrutoVencidas)}</strong> | Valor líquido (margem): <strong>${formatCurrency(valorLiquidoVencidas)}</strong>
              </li>
              <li style="margin-bottom: 6px;">Contratos ativos: <strong>${contratosAtivos.length}</strong></li>
            </ul>
            
            <h4 style="color: #4b5563; font-size: 14px; margin-bottom: 8px;">📅 Parcelas a Vencer (${parcelasAVencer.length}) - Total: ${formatCurrency(valorParcelasAVencer)}</h4>
            ${generateParcelasTable(parcelasAVencerEnriquecidas)}
          </div>
        `;

        // ========== TAREFAS/METAS DATA ==========
        const { data: anotacoes } = await supabaseClient
          .from("anotacoes")
          .select("id, status, reminder_datetime, title")
          .eq("user_id", pref.user_id);

        const { data: metas } = await supabaseClient
          .from("metas")
          .select("id, status, progresso, periodo_fim, valor_alvo, tipo")
          .eq("user_id", pref.user_id);

        const tarefasVencidas = (anotacoes || []).filter(a => {
          return a.reminder_datetime && new Date(a.reminder_datetime) < now && 
                 a.status !== "concluida" && a.status !== "arquivada";
        });

        const metasAtrasadas = (metas || []).filter(m => {
          return new Date(m.periodo_fim) < now && m.status !== "concluida" && (m.progresso || 0) < (m.valor_alvo || 100);
        });

        const metasAtingidas = (metas || []).filter(m => {
          return m.status === "concluida" || (m.progresso || 0) >= (m.valor_alvo || 100);
        }).filter(m => new Date(m.periodo_fim) >= periodStart);

        // ========== GEOGRAPHIC DATA ==========
        const regionMap: { [key: string]: { abertas: number; fechadas: number; repouso: number; perdidas: number } } = {};

        for (const p of propostas || []) {
          const cliente = p.cliente as any;
          const regiao = cliente?.bairro || cliente?.cidade || "Não informado";
          
          if (!regionMap[regiao]) {
            regionMap[regiao] = { abertas: 0, fechadas: 0, repouso: 0, perdidas: 0 };
          }

          if (p.status === "aberta") regionMap[regiao].abertas++;
          else if (p.status === "fechada") regionMap[regiao].fechadas++;
          else if (p.status === "repouso") regionMap[regiao].repouso++;
          else if (p.status === "perdida") regionMap[regiao].perdidas++;
        }

        const geografico = Object.entries(regionMap)
          .map(([regiao, counts]) => {
            const total = counts.abertas + counts.fechadas + counts.repouso + counts.perdidas;
            const conversao = total > 0 ? (counts.fechadas / total) * 100 : 0;
            return { regiao, ...counts, total, conversao };
          })
          .sort((a, b) => b.total - a.total);

        // ========== BUILD REPORT DATA ==========
        const reportData = {
          leads: [
            `Leads sem movimentação há 24h: <strong>${leadsSemMov24h}</strong>`,
            `Leads sem movimentação há 72h: <strong>${leadsSemMov72h}</strong>`,
            `Novos leads (${periodLabel}): <strong>${novosLeads}</strong>`,
          ],
          propostas: [
            `Propostas em aberto: <strong>${propostasAbertas.length}</strong>`,
            `Valor total em aberto: <strong>${formatCurrency(valorPropostasAbertas)}</strong>`,
            `Margem líquida em aberto: <strong>${formatCurrency(margemLiquidaAbertas)}</strong>`,
            `Propostas fechadas (mês): <strong>${propostasFechadasMes.length}</strong>`,
            `Propostas fechadas (ano): <strong>${propostasFechadasAno.length}</strong>`,
            `Propostas perdidas (mês): <strong>${propostasPerdidasMes.length}</strong>`,
            `Propostas em repouso: <strong>${propostasRepouso.length}</strong>`,
          ],
          obras: [
            `Obras ativas: <strong>${obrasAtivas.length}</strong>`,
            `Obras paradas (sem atualização 7+ dias): <strong>${obrasParadas.length}</strong>`,
            `Obras sem fotos: <strong>${obrasSemFotos.length}</strong>`,
          ],
          financeiroHtml,
          tarefas: [
            `Tarefas vencidas: <strong>${tarefasVencidas.length}</strong>`,
            `Metas atrasadas: <strong>${metasAtrasadas.length}</strong>`,
            `Metas atingidas (${periodLabel}): <strong>${metasAtingidas.length}</strong>`,
          ],
          geografico,
        };

        const emailHtml = generateEmailHtml(reportData, pref.relatorio_gestao_frequencia || "diaria");

        // Send email via Resend
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Só Garagens <no-reply@sogaragens.com.br>",
            to: [userEmail],
            subject: `📊 Relatório de Gestão - Só Garagens Hub`,
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
          .update({ relatorio_gestao_ultimo_envio: new Date().toISOString() })
          .eq("user_id", pref.user_id);

        console.log(`✅ Management report sent to ${userEmail}`);
        results.push({ userId: pref.user_id, success: true });
      } catch (userError: any) {
        console.error(`Error processing user ${pref.user_id}:`, userError);
        results.push({ userId: pref.user_id, success: false, error: userError.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const skippedCount = results.filter((r) => r.skipped).length;
    console.log(`📊 Management report complete: ${successCount} sent, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${successCount} relatório(s) de gestão enviado(s) com sucesso`,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-management-report function:", error);
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
