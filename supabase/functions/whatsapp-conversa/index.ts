// ============================================================================
// whatsapp-conversa — devolve o histórico de mensagens trocadas com um número.
//   Entrada: { telefone }  (qualquer formato; normaliza p/ jid 55…@s.whatsapp.net)
//   Fonte: Evolution (findMessages) — fresco e completo. Requer usuário logado.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function env(n: string): string {
  const v = Deno.env.get(n) ?? "";
  if (!v) throw new Error(`Env ausente: ${n}`);
  return v;
}

function toJid(input: string): string {
  // Já é um jid completo (ex.: "2040...@lid" salvo de contatos @lid)? usa direto.
  if ((input ?? "").includes("@")) return input;
  let d = (input ?? "").replace(/\D/g, "");
  if (!d.startsWith("55") && d.length >= 10 && d.length <= 11) d = "55" + d;
  return `${d}@s.whatsapp.net`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supa = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { telefone } = await req.json();
    if (!telefone) throw new Error("telefone ausente");
    const jid = toJid(telefone);

    const url = env("EVOLUTION_API_URL").replace(/\/+$/, "");
    const instance = Deno.env.get("EVOLUTION_INSTANCE") || "sogaragens";
    const r = await fetch(`${url}/chat/findMessages/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env("EVOLUTION_API_KEY") },
      body: JSON.stringify({ where: { key: { remoteJid: jid } } }),
    });
    if (!r.ok) throw new Error(`Evolution ${r.status}`);
    const raw = await r.json();
    const recs = raw?.messages?.records ?? raw?.records ?? (Array.isArray(raw) ? raw : []);

    const msgs = (recs as Record<string, any>[])
      .map((d) => {
        const m = d?.message ?? {};
        const texto = m.conversation ?? m.extendedTextMessage?.text ??
          m.imageMessage?.caption ?? m.videoMessage?.caption ?? null;
        const tsRaw = d?.messageTimestamp;
        const ts = typeof tsRaw === "number" ? tsRaw : parseInt(tsRaw ?? "0", 10);
        const tipo = m.imageMessage ? "imagem" : m.audioMessage ? "áudio"
          : m.videoMessage ? "vídeo" : m.documentMessage ? "documento" : null;
        return {
          from_me: Boolean(d?.key?.fromMe),
          texto: texto ?? (tipo ? `[${tipo}]` : null),
          ts: ts > 0 ? new Date(ts * 1000).toISOString() : null,
        };
      })
      .filter((m) => m.texto)
      .sort((a, b) => (a.ts ?? "").localeCompare(b.ts ?? ""));

    return new Response(JSON.stringify({ ok: true, jid, mensagens: msgs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-conversa erro:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e), mensagens: [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
