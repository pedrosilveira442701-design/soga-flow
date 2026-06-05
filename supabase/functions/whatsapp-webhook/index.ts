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

  try {
    const body = await req.json();
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
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, // 200 evita reentrega agressiva do Evolution
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
