// ============================================================================
// sg-lead-email — e-mails do formulário público /orcamento do sogaragens.com.br
//   Substitui o endpoint /api/sg-lead do berith-os (túnel trycloudflare morto).
//   Entrada (POST, público): { nome, telefone, email, bairro, servico, tipo,
//     qualificacao, _rotuloQualif, area, prazo, ticket, origem }
//   Envia via Resend (secret RESEND_API_KEY, domínio sogaragens.com.br):
//     1. Confirmação ao lead (se informou e-mail) — template da marca
//     2. Notificação interna para contato@sogaragens.com.br
//   Falha de e-mail nunca é exposta ao visitante: responde 200 sempre.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NAVY = "#0A2257";
const GOLD = "#ddc13f";
const WHATS_HUMANO = "(31) 99176-7548";
const WHATS_LINK = "https://wa.me/5531991767548";

// Dados vêm do visitante — escapar sempre antes de interpolar no HTML.
function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").slice(0, 200);
}

function linha(rotulo: string, valor: string): string {
  if (!valor || valor === "-") return "";
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #ECEEF3;color:#8A93A6;font-size:13px;">${rotulo}</td>
    <td style="padding:10px 0;border-bottom:1px solid #ECEEF3;color:${NAVY};font-size:14px;font-weight:bold;text-align:right;">${valor}</td>
  </tr>`;
}

interface Lead {
  nome: string; telefone: string; email: string; bairro: string;
  servico: string; tipo: string; qualificacao: string; rotuloQualif: string;
  area: string; prazo: string; ticket: string; origem: string;
  fotos: string[];
}

// Só aceita URLs do próprio bucket público de fotos do projeto.
function fotosValidas(v: unknown): string[] {
  const prefixo = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/lead-fotos/`;
  if (!Array.isArray(v)) return [];
  return v.filter((u): u is string => typeof u === "string" && u.startsWith(prefixo)).slice(0, 5);
}

function blocoFotos(l: Lead): string {
  if (!l.fotos.length) return "";
  const imgs = l.fotos.map((u, i) =>
    `<a href="${u}" style="display:inline-block;margin:0 8px 8px 0;"><img src="${u}" alt="Foto ${i + 1}" width="160" style="width:160px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #ECEEF3;"></a>`
  ).join("");
  return `<h3 style="color:${NAVY};font-size:14px;margin:20px 0 10px;">Fotos do piso (${l.fotos.length})</h3>${imgs}`;
}

function tabelaDados(l: Lead): string {
  return `<table style="width:100%;border-collapse:collapse;margin:0;">
    ${linha("Serviço", l.servico)}
    ${linha("Local do piso", l.tipo)}
    ${linha(l.rotuloQualif || "Qualificação", l.qualificacao)}
    ${linha("Área estimada", l.area)}
    ${linha("Prazo", l.prazo)}
    ${linha("Bairro / Cidade", l.bairro)}
    ${linha("Fotos do piso", l.fotos.length ? `${l.fotos.length} recebida(s)` : "")}
  </table>`;
}

// Confirmação ao lead — visual da marca (navy + dourado, mesmo padrão do site).
function htmlConfirmacao(l: Lead): string {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#F2F4F8;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;">

  <div style="background:${NAVY};border-radius:14px 14px 0 0;padding:32px 24px;text-align:center;">
    <div style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:6px;">S&Oacute; GARAGENS</div>
    <div style="width:40px;height:3px;background:${GOLD};border-radius:3px;margin:14px auto 10px;"></div>
    <div style="color:${GOLD};font-size:11px;letter-spacing:3px;text-transform:uppercase;">Or&ccedil;amento R&aacute;pido</div>
  </div>

  <div style="background:#ffffff;border-radius:0 0 14px 14px;padding:32px 28px;">
    <div style="text-align:center;margin-bottom:6px;">
      <span style="display:inline-block;background:#F6F7FA;border:1px solid #ECEEF3;border-radius:20px;padding:6px 16px;color:#8A93A6;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Ticket ${esc(l.ticket)}</span>
    </div>
    <h1 style="color:${NAVY};font-size:21px;text-align:center;margin:14px 0 8px;">Recebemos sua solicita&ccedil;&atilde;o!</h1>
    <p style="color:#475467;font-size:14px;line-height:1.7;text-align:center;margin:0 0 24px;">
      Ol&aacute;, <strong>${esc(l.nome) || "cliente"}</strong>! Sua solicita&ccedil;&atilde;o de or&ccedil;amento foi registrada.
      Nossa equipe entrar&aacute; em contato em at&eacute; <strong>24 horas &uacute;teis</strong> para agendar sua
      <strong>vistoria t&eacute;cnica gratuita</strong>.
    </p>

    <div style="background:#F9FAFB;border:1px solid #ECEEF3;border-radius:12px;padding:8px 20px;margin-bottom:28px;">
      ${tabelaDados(l)}
    </div>

    <div style="text-align:center;margin-bottom:8px;">
      <a href="${WHATS_LINK}" style="display:inline-block;background:${NAVY};color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:14px 32px;border-radius:10px;">Falar no WhatsApp</a>
    </div>
    <p style="color:#98A2B3;font-size:12px;text-align:center;margin:12px 0 0;">Se preferir, chame direto: ${WHATS_HUMANO}</p>
  </div>

  <p style="color:#98A2B3;font-size:11px;text-align:center;line-height:1.7;margin:20px 0 0;">
    S&oacute; Garagens &mdash; Pisos de alta performance em Belo Horizonte<br>
    Ep&oacute;xi &middot; Uretano/PU &middot; Autonivelante &middot; Demarca&ccedil;&atilde;o de vagas<br>
    <a href="https://sogaragens.com.br" style="color:#8A93A6;">sogaragens.com.br</a>
  </p>
</div>
</body></html>`;
}

// Notificação interna para a equipe.
function htmlInterno(l: Lead): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;">
    <h2 style="color:${NAVY};margin:0 0 4px;">Novo lead do formul&aacute;rio de or&ccedil;amento</h2>
    <p style="color:#8A93A6;font-size:13px;margin:0 0 16px;">Ticket ${esc(l.ticket)} &middot; origem: ${esc(l.origem) || "site"}</p>
    <table style="width:100%;border-collapse:collapse;">
      ${linha("Nome", esc(l.nome))}
      ${linha("Telefone", `<a href="https://wa.me/55${esc(l.telefone).replace(/\D/g, "")}">${esc(l.telefone)}</a>`)}
      ${linha("E-mail", esc(l.email))}
      ${tabelaDados(l).replace(/<\/?table[^>]*>/g, "")}
    </table>
    ${blocoFotos(l)}
  </div>`;
}

async function resend(payload: Record<string, unknown>): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!key) throw new Error("RESEND_API_KEY ausente");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const b = await req.json();
    const l: Lead = {
      nome: esc(b.nome), telefone: esc(b.telefone), email: String(b.email ?? "").trim().slice(0, 200),
      bairro: esc(b.bairro), servico: esc(b.servico), tipo: esc(b.tipo),
      qualificacao: esc(b.qualificacao), rotuloQualif: esc(b._rotuloQualif ?? b.rotuloQualif),
      area: esc(b.area), prazo: esc(b.prazo), ticket: esc(b.ticket), origem: esc(b.origem),
      fotos: fotosValidas(b.fotos),
    };

    const envios: Promise<void>[] = [];

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email)) {
      envios.push(resend({
        from: "Só Garagens <contato@sogaragens.com.br>",
        to: l.email,
        subject: `Orçamento recebido — Ticket ${l.ticket || "Só Garagens"}`,
        html: htmlConfirmacao(l),
      }));
    }

    envios.push(resend({
      from: "Leads Só Garagens <contato@sogaragens.com.br>",
      to: "contato@sogaragens.com.br",
      subject: `Novo Lead: ${l.nome || "Sem nome"} — ${l.servico || "sem serviço"} (${l.ticket || "-"})`,
      html: htmlInterno(l),
    }));

    const resultados = await Promise.allSettled(envios);
    resultados
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .forEach((r) => console.error("sg-lead-email envio falhou:", r.reason));

    return json({ ok: true, ticket: l.ticket });
  } catch (e) {
    console.error("sg-lead-email erro:", e);
    return json({ ok: false });
  }
});
