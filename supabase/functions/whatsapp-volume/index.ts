// ============================================================================
// whatsapp-volume — volume bruto de conversas no WhatsApp (via Evolution findChats).
//   Retorna: total de conversas, identificáveis (número recuperável) e sem
//   identificação (@lid privacidade). Requer usuário logado.
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
function isRealNumberJid(jid: string): boolean {
  if (!jid) return false;
  if (jid.includes("@") && !jid.endsWith("@s.whatsapp.net")) return false;
  const ph = (jid.split("@")[0] || "").replace(/\D/g, "");
  return ph.startsWith("55") && (ph.length === 12 || ph.length === 13);
}
function isGrupoOuBroadcast(jid: string): boolean {
  return ["@g.us", "@broadcast", "@newsletter"].some((x) => jid.includes(x));
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

    const url = env("EVOLUTION_API_URL").replace(/\/+$/, "");
    const instance = Deno.env.get("EVOLUTION_INSTANCE") || "sogaragens";
    const r = await fetch(`${url}/chat/findChats/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env("EVOLUTION_API_KEY") },
      body: JSON.stringify({}),
    });
    if (!r.ok) throw new Error(`Evolution ${r.status}`);
    const raw = await r.json();
    const chats: any[] = Array.isArray(raw) ? raw : (raw?.chats ?? []);

    let conversas = 0, identificaveis = 0, semIdentificacao = 0;
    for (const ch of chats) {
      const jid: string = ch?.remoteJid || ch?.id || "";
      if (!jid || isGrupoOuBroadcast(jid)) continue;
      conversas++;
      const alt = ch?.lastMessage?.key?.remoteJidAlt || "";
      if (isRealNumberJid(jid) || isRealNumberJid(alt)) identificaveis++;
      else semIdentificacao++;
    }

    return new Response(JSON.stringify({ ok: true, conversas, identificaveis, semIdentificacao }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-volume erro:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e), conversas: 0, identificaveis: 0, semIdentificacao: 0 }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
