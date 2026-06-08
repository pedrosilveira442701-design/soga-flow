// ============================================================================
// whatsapp-conversa — histórico de mensagens trocadas com um número.
//   Lê do NOSSO banco (whatsapp_mensagens, populado pelo webhook em tempo real),
//   com fallback no texto_conversa do contato (backfill). Requer usuário logado.
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
const onlyDigits = (s: string) => (s ?? "").split("@")[0].replace(/\D/g, "");

// Parseia "EMPRESA: ...\nCLIENTE: ..." (texto_conversa do backfill) em mensagens.
function parseConversa(texto: string): { from_me: boolean; texto: string; ts: string | null }[] {
  const out: { from_me: boolean; texto: string; ts: string | null }[] = [];
  for (const linha of (texto || "").split("\n")) {
    const m = linha.match(/^(EMPRESA|CLIENTE):\s?(.*)$/);
    if (m) out.push({ from_me: m[1] === "EMPRESA", texto: m[2], ts: null });
    else if (out.length && linha.trim()) out[out.length - 1].texto += "\n" + linha;
  }
  return out;
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
    const fone = onlyDigits(telefone);
    if (!fone) throw new Error("telefone ausente");

    // 1. Log de mensagens (tempo real). RLS garante que são do usuário.
    const { data: msgs } = await supa
      .from("whatsapp_mensagens")
      .select("from_me, texto, message_ts")
      .eq("jid", fone)
      .order("message_ts", { ascending: true })
      .limit(300);

    let mensagens = (msgs ?? [])
      .filter((m: { texto?: string | null }) => m.texto)
      .map((m: { from_me: boolean; texto: string | null; message_ts: string }) => ({
        from_me: m.from_me, texto: m.texto, ts: m.message_ts,
      }));

    // 2. Fallback: texto_conversa salvo no contato (ex.: backfill sem log).
    if (!mensagens.length) {
      const { data: cs } = await supa
        .from("contatos")
        .select("texto_conversa, observacoes")
        .eq("origem", "whatsapp")
        .eq("telefone", fone)
        .limit(1);
      const tc = cs?.[0]?.texto_conversa || cs?.[0]?.observacoes || "";
      if (tc) mensagens = parseConversa(tc);
    }

    return new Response(JSON.stringify({ ok: true, mensagens }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-conversa erro:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e), mensagens: [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
