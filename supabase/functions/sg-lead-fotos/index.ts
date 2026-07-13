// ============================================================================
// sg-lead-fotos — upload das fotos do formulário público /orcamento
//   Entrada (POST multipart/form-data, público): campo "fotos" (1-5 imagens,
//   até 10MB cada) + campo opcional "ticket" (prefixo da pasta).
//   Sobe no bucket público `lead-fotos` e devolve { ok, urls: [...] }.
//   As URLs vão para o Telegram (sendMediaGroup) e para os e-mails do lead.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FOTOS = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/heic": "heic", "image/heif": "heif",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const srole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const form = await req.formData();
    const ticket = String(form.get("ticket") ?? "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 20) || "sem-ticket";
    const fotos = form.getAll("fotos").filter((f): f is File => f instanceof File);

    if (!fotos.length) return json({ ok: false, error: "nenhuma foto" }, 400);

    const pasta = `${new Date().toISOString().slice(0, 10)}/${ticket}-${crypto.randomUUID().slice(0, 8)}`;
    const urls: string[] = [];

    for (const [i, foto] of fotos.slice(0, MAX_FOTOS).entries()) {
      if (!TIPOS.includes(foto.type) || foto.size === 0 || foto.size > MAX_BYTES) continue;
      const path = `${pasta}/foto-${i + 1}.${EXT[foto.type]}`;
      const up = await fetch(`${supaUrl}/storage/v1/object/lead-fotos/${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${srole}`, apikey: srole, "Content-Type": foto.type },
        body: await foto.arrayBuffer(),
      });
      if (!up.ok) {
        console.error(`sg-lead-fotos upload falhou (${path}):`, up.status, await up.text());
        continue;
      }
      urls.push(`${supaUrl}/storage/v1/object/public/lead-fotos/${path}`);
    }

    return json({ ok: urls.length > 0, urls });
  } catch (e) {
    console.error("sg-lead-fotos erro:", e);
    return json({ ok: false, urls: [] });
  }
});
