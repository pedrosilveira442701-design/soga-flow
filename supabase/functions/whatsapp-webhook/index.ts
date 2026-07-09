// ============================================================================
// whatsapp-webhook — recebe eventos do Evolution API (Fase 1: só leitura)
//   • MESSAGES_UPSERT  -> grava msg, garante contato, dispara triagem
//   • CONNECTION_UPDATE -> atualiza estado; na 1ª conexão dispara backfill
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  dispararTriagem,
  env,
  garantirContato,
  gravarMensagem,
  jaEhCliente,
  ownerUserId,
  parseEvolutionMessage,
  supabaseAdmin,
} from "../_shared/whatsapp.ts";

function normalizeEvent(e: string): string {
  return (e ?? "").toUpperCase().replace(/\./g, "_");
}

async function handleConnectionUpdate(
  db: ReturnType<typeof supabaseAdmin>,
  userId: string,
  instancia: string,
  data: Record<string, any>,
) {
  const stateRaw = (data?.state ?? data?.connection ?? "").toString();
  const status = stateRaw === "open"
    ? "conectado"
    : stateRaw === "connecting"
    ? "conectando"
    : "desconectado";

  // Upsert do estado da conexão.
  const { data: conexao } = await db
    .from("whatsapp_conexao")
    .upsert(
      {
        user_id: userId,
        instancia,
        status,
        numero: data?.wuid ? data.wuid.split("@")[0] : null,
        last_event_at: new Date().toISOString(),
      },
      { onConflict: "user_id,instancia" },
    )
    .select("backfill_done")
    .single();

  // Primeira conexão estável -> dispara varredura histórica única.
  if (status === "conectado" && conexao && conexao.backfill_done === false) {
    const url = `${env("SUPABASE_URL")}/functions/v1/whatsapp-backfill`;
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ user_id: userId, instancia }),
    }).catch((e) => console.error("dispararBackfill falhou:", e));
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Endpoint é público (Evolution não manda JWT) — exigir segredo compartilhado.
  // Configure WEBHOOK_SECRET nos secrets da função e o header x-webhook-secret
  // no webhook do Evolution. Sem o env setado, mantém o comportamento antigo.
  const expected = Deno.env.get("WEBHOOK_SECRET") ?? "";
  if (expected && req.headers.get("x-webhook-secret") !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let parseFailed = false;
  try {
    const body = await req.json().catch(() => {
      parseFailed = true;
      throw new Error("payload inválido");
    });
    const event = normalizeEvent(body?.event ?? "");
    const instancia = body?.instance ?? Deno.env.get("EVOLUTION_INSTANCE") ?? "sogaragens";
    const userId = ownerUserId();
    const db = supabaseAdmin();

    if (event === "CONNECTION_UPDATE") {
      await handleConnectionUpdate(db, userId, instancia, body?.data ?? {});
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event === "MESSAGES_UPSERT") {
      // Evolution pode mandar 1 ou vários itens.
      const items: Record<string, any>[] = Array.isArray(body?.data)
        ? body.data
        : [body?.data];

      for (const item of items) {
        const msg = parseEvolutionMessage(item ?? {});
        if (!msg) continue; // grupo, vazio, etc.

        // Já é cliente cadastrado? Ignora (não polui a fila).
        if (await jaEhCliente(db, userId, msg.phone)) {
          await gravarMensagem(db, userId, msg, null);
          continue;
        }

        // Garante contato (captura-primeiro) — só para mensagens recebidas.
        let contatoId: string | null = null;
        let novo = false;
        if (!msg.fromMe) {
          const r = await garantirContato(db, userId, msg);
          contatoId = r.contatoId;
          novo = r.novo;
        } else {
          // Mensagem do próprio dono: associa ao contato existente se houver.
          const { data: c } = await db
            .from("contatos")
            .select("id, triagem_status")
            .eq("user_id", userId)
            .eq("telefone", msg.phone)
            .maybeSingle();
          contatoId = c?.id ?? null;
        }

        await gravarMensagem(db, userId, msg, contatoId);

        // Dispara/re-dispara triagem enquanto o contato estiver pendente
        // (assim a IA pega a resposta do canal que chega depois).
        if (contatoId) {
          const { data: c } = await db
            .from("contatos")
            .select("triagem_status")
            .eq("id", contatoId)
            .maybeSingle();
          if (novo || c?.triagem_status === "pendente") {
            dispararTriagem(contatoId);
          }
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Outros eventos: ignora silenciosamente.
    return new Response(JSON.stringify({ ok: true, ignored: event }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-webhook erro:", e);
    // Payload inválido → 200 (reentregar não ajuda). Falha de persistência →
    // 5xx para o Evolution reentregar; sem isso a mensagem se perdia para sempre.
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: parseFailed ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
