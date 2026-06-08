// ============================================================================
// whatsapp-send — envia uma mensagem de texto pelo WhatsApp (Evolution).
//   Entrada: { telefone, texto }. Requer usuário logado.
//   Fase 2: envio manual revisado (não é disparo em massa).
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
// Normaliza para número E.164 sem '+' (ex.: 5531999998888) p/ o Evolution.
function normalizaNumero(input: string): string {
  let d = (input ?? "").split("@")[0].replace(/\D/g, "");
  if (!d.startsWith("55") && d.length >= 10 && d.length <= 11) d = "55" + d;
  return d;
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

    const { telefone, texto } = await req.json();
    const numero = normalizaNumero(telefone || "");
    if (!numero || numero.length < 12) throw new Error("número inválido");
    if (!texto || !texto.trim()) throw new Error("texto vazio");

    const url = env("EVOLUTION_API_URL").replace(/\/+$/, "");
    const instance = Deno.env.get("EVOLUTION_INSTANCE") || "sogaragens";
    const r = await fetch(`${url}/message/sendText/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env("EVOLUTION_API_KEY") },
      body: JSON.stringify({ number: numero, text: texto }),
    });
    const respText = await r.text();
    if (!r.ok) throw new Error(`Evolution ${r.status}: ${respText}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-send erro:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
