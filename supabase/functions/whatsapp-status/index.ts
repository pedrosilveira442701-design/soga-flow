// ============================================================================
// whatsapp-status — proxy seguro entre o ERP e o Evolution (Fase 1)
//   Usado pela tela Configurações → WhatsApp. Requer usuário autenticado.
//   Ações: status (default) | qr | logout | restart
//   Nunca expõe a apikey do Evolution ao navegador.
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

function evo() {
  return {
    url: env("EVOLUTION_API_URL").replace(/\/+$/, ""),
    key: env("EVOLUTION_API_KEY"),
    instance: Deno.env.get("EVOLUTION_INSTANCE") || "sogaragens",
  };
}

async function evoFetch(path: string, method = "GET") {
  const { url, key } = evo();
  const r = await fetch(`${url}${path}`, { method, headers: { apikey: key } });
  if (!r.ok) throw new Error(`Evolution ${path} -> ${r.status}`);
  return await r.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Exige usuário autenticado (o ERP envia o JWT da sessão).
    const authHeader = req.headers.get("Authorization") ?? "";
    const supa = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { instance } = evo();
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body?.action ?? "status";

    if (action === "logout") {
      await evoFetch(`/instance/logout/${instance}`, "DELETE").catch(() => {});
      return new Response(JSON.stringify({ ok: true, status: "desconectado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // estado atual
    const st = await evoFetch(`/instance/connectionState/${instance}`).catch(() => null);
    const state = st?.instance?.state ?? "close";
    const statusMap: Record<string, string> = {
      open: "conectado",
      connecting: "conectando",
      close: "desconectado",
    };

    if (state === "open") {
      // conectado: pega o número
      let numero: string | null = null;
      try {
        const inst = await evoFetch(`/instance/fetchInstances?instanceName=${instance}`);
        const i = Array.isArray(inst) ? inst[0] : inst;
        numero = (i?.ownerJid || i?.number || "")?.toString().split("@")[0] || null;
      } catch (_) { /* ignore */ }
      return new Response(JSON.stringify({ status: "conectado", numero, qr: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // não conectado: busca QR (connect também reinicia a tentativa)
    let qr: string | null = null;
    let pairingCode: string | null = null;
    try {
      const conn = await evoFetch(`/instance/connect/${instance}`);
      qr = conn?.base64 ?? null;
      pairingCode = conn?.pairingCode ?? null;
    } catch (_) { /* ignore */ }

    return new Response(
      JSON.stringify({ status: statusMap[state] ?? "desconectado", qr, pairingCode, numero: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("whatsapp-status erro:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
