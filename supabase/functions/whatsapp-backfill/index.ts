// ============================================================================
// whatsapp-backfill — varredura histórica ÚNICA na 1ª conexão
//   • Busca chats/mensagens que o WhatsApp sincronizou para o device
//   • Filtra conversas com mensagem recebida >= 2025-09-01
//   • Deduplica contra quem JÁ é cliente cadastrado
//   • Ingere como contato + dispara triagem
//   Entrada: { user_id, instancia }
//
//   Limitação de plataforma: o WhatsApp não garante sincronizar 100% do
//   histórico para um device companheiro novo. Pega-se o que estiver disponível.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  BACKFILL_CUTOFF_ISO,
  corsHeaders,
  dispararTriagem,
  evolutionBase,
  evolutionPost,
  garantirContato,
  gravarMensagem,
  type InboundMessage,
  isGroupJid,
  jaEhCliente,
  jidToPhone,
  supabaseAdmin,
} from "../_shared/whatsapp.ts";

const CUTOFF_MS = Date.parse(BACKFILL_CUTOFF_ISO);

// Lê mensagens de um chat via Evolution e normaliza as recebidas após o cutoff.
async function mensagensDoChat(instance: string, jid: string): Promise<InboundMessage[]> {
  let raw: any;
  try {
    raw = await evolutionPost(`/chat/findMessages/${instance}`, {
      where: { key: { remoteJid: jid } },
    });
  } catch (e) {
    console.error(`findMessages ${jid} falhou:`, e);
    return [];
  }
  // Evolution v2 pode devolver {messages:{records:[...]}} ou um array direto.
  const records: any[] = raw?.messages?.records ?? raw?.records ?? (Array.isArray(raw) ? raw : []);
  const out: InboundMessage[] = [];
  for (const data of records) {
    const key = data?.key ?? {};
    const tsRaw = data?.messageTimestamp;
    const tsSec = typeof tsRaw === "number" ? tsRaw : parseInt(tsRaw ?? "0", 10);
    const tsMs = tsSec * 1000;
    if (!tsMs || tsMs < CUTOFF_MS) continue;
    const texto = data?.message?.conversation ??
      data?.message?.extendedTextMessage?.text ?? null;
    out.push({
      jid,
      phone: jidToPhone(jid),
      pushName: data?.pushName ?? null,
      fromMe: Boolean(key.fromMe),
      texto,
      messageId: key.id ?? `${jid}-${tsSec}`,
      ts: new Date(tsMs).toISOString(),
    });
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const db = supabaseAdmin();
  try {
    const body = await req.json();
    const userId: string = body?.user_id;
    const instancia: string = body?.instance ?? body?.instancia ?? evolutionBase().instance;
    if (!userId) throw new Error("user_id ausente");

    // Guard de unicidade: não roda duas vezes.
    const { data: conexao } = await db
      .from("whatsapp_conexao")
      .select("id, backfill_done")
      .eq("user_id", userId)
      .eq("instancia", instancia)
      .maybeSingle();
    if (conexao?.backfill_done) {
      return new Response(JSON.stringify({ ok: true, skipped: "backfill já feito" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Lista de chats sincronizados.
    let chatsRaw: any;
    try {
      chatsRaw = await evolutionPost(`/chat/findChats/${instancia}`, {});
    } catch (e) {
      throw new Error(`findChats falhou: ${e}`);
    }
    const chats: any[] = Array.isArray(chatsRaw) ? chatsRaw : (chatsRaw?.chats ?? []);

    let importados = 0;
    let puladosCliente = 0;
    let puladosVazio = 0;

    for (const chat of chats) {
      const jid: string = chat?.id ?? chat?.remoteJid ?? chat?.jid ?? "";
      if (!jid || isGroupJid(jid)) continue;
      const phone = jidToPhone(jid);
      if (!phone) continue;

      // Dedup: já é cliente cadastrado -> elimina.
      if (await jaEhCliente(db, userId, phone)) {
        puladosCliente++;
        continue;
      }

      const msgs = await mensagensDoChat(instancia, jid);
      // Só interessa se houve mensagem RECEBIDA após o cutoff.
      const temInbound = msgs.some((m) => !m.fromMe);
      if (!temInbound) {
        puladosVazio++;
        continue;
      }

      // Usa a mensagem recebida mais antiga como "primeira interação".
      const primeira = msgs.filter((m) => !m.fromMe)
        .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))[0];

      const { contatoId } = await garantirContato(db, userId, primeira);
      if (!contatoId) continue;

      // Grava todas as mensagens da conversa (idempotente).
      for (const m of msgs) {
        await gravarMensagem(db, userId, m, contatoId);
      }
      dispararTriagem(contatoId);
      importados++;
    }

    // Marca varredura como concluída.
    await db
      .from("whatsapp_conexao")
      .update({ backfill_done: true })
      .eq("user_id", userId)
      .eq("instancia", instancia);

    const resumo = { ok: true, importados, pulados_cliente: puladosCliente, pulados_vazio: puladosVazio };
    console.log("backfill concluído:", JSON.stringify(resumo));
    return new Response(JSON.stringify(resumo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-backfill erro:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
