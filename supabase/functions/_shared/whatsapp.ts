// ============================================================================
// Helpers compartilhados da integração WhatsApp -> Leads (Fase 1)
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Conversas anteriores a esta data são ignoradas na varredura histórica.
export const BACKFILL_CUTOFF_ISO = "2025-09-01T00:00:00Z";

// --- Env ---------------------------------------------------------------------
export function env(name: string, required = true): string {
  const v = Deno.env.get(name) ?? "";
  if (required && !v) throw new Error(`Env ausente: ${name}`);
  return v;
}

// Dono único da Fase 1 (todo lead capturado é atribuído a ele).
export function ownerUserId(): string {
  return env("OWNER_USER_ID");
}

// --- Supabase (service role: escreve bypassa RLS) ---------------------------
export function supabaseAdmin() {
  return createClient(
    env("SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

// --- Telefone ----------------------------------------------------------------
// "553199998888@s.whatsapp.net" -> "553199998888"; "(31) 99999-8888" -> "3199998888"
export function onlyDigits(s: string): string {
  return (s ?? "").replace(/\D/g, "");
}

export function jidToPhone(jid: string): string {
  return onlyDigits((jid ?? "").split("@")[0]);
}

export function isGroupJid(jid: string): boolean {
  return (jid ?? "").includes("@g.us");
}

// --- Evolution API -----------------------------------------------------------
export function evolutionBase(): { url: string; key: string; instance: string } {
  return {
    url: env("EVOLUTION_API_URL").replace(/\/+$/, ""),
    key: env("EVOLUTION_API_KEY"),
    instance: Deno.env.get("EVOLUTION_INSTANCE") || "sogaragens",
  };
}

export async function evolutionPost(path: string, body: unknown) {
  const { url, key } = evolutionBase();
  const res = await fetch(`${url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    throw new Error(`Evolution ${path} -> ${res.status}: ${await res.text()}`);
  }
  return await res.json();
}

// --- Tipos -------------------------------------------------------------------
export interface InboundMessage {
  jid: string; // jid cru do Evolution
  phone: string; // só dígitos
  pushName: string | null;
  fromMe: boolean;
  texto: string | null;
  messageId: string;
  ts: string; // ISO
}

// Extrai texto de qualquer formato de mensagem do Evolution.
export function extractTexto(message: Record<string, unknown> | null): string | null {
  if (!message) return null;
  const m = message as Record<string, any>;
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.buttonsResponseMessage?.selectedDisplayText ??
    m.listResponseMessage?.title ??
    null
  );
}

// Normaliza um item "messages.upsert" do Evolution em InboundMessage.
export function parseEvolutionMessage(data: Record<string, any>): InboundMessage | null {
  const key = data?.key ?? {};
  const jid: string = key.remoteJid ?? "";
  if (!jid || isGroupJid(jid)) return null;
  const tsRaw = data?.messageTimestamp;
  const tsSec = typeof tsRaw === "number" ? tsRaw : parseInt(tsRaw ?? "0", 10);
  const ts = tsSec > 0 ? new Date(tsSec * 1000).toISOString() : new Date().toISOString();
  return {
    jid,
    phone: jidToPhone(jid),
    pushName: data?.pushName ?? null,
    fromMe: Boolean(key.fromMe),
    texto: extractTexto(data?.message ?? null),
    messageId: key.id ?? `${jid}-${tsSec}`,
    ts,
  };
}

// --- Ingestão ----------------------------------------------------------------
// deno-lint-ignore no-explicit-any
type Admin = ReturnType<typeof supabaseAdmin>;

// Grava a mensagem bruta (idempotente). Retorna o contato_id associado (ou null).
export async function gravarMensagem(
  db: Admin,
  userId: string,
  msg: InboundMessage,
  contatoId: string | null,
): Promise<void> {
  await db.from("whatsapp_mensagens").upsert(
    {
      user_id: userId,
      jid: msg.phone,
      push_name: msg.pushName,
      from_me: msg.fromMe,
      texto: msg.texto,
      message_id: msg.messageId,
      message_ts: msg.ts,
      contato_id: contatoId,
    },
    { onConflict: "user_id,message_id", ignoreDuplicates: true },
  );
}

// True se o telefone já é um cliente cadastrado (dedup da varredura histórica).
export async function jaEhCliente(
  db: Admin,
  userId: string,
  phone: string,
): Promise<boolean> {
  const { data } = await db
    .from("clientes")
    .select("id, telefone")
    .eq("user_id", userId);
  if (!data) return false;
  return data.some((c: { telefone?: string | null }) => onlyDigits(c.telefone ?? "") === phone);
}

// Garante um contato (fila de triagem) para este telefone. Idempotente.
// Retorna { contatoId, novo }. `novo=false` se já existia.
export async function garantirContato(
  db: Admin,
  userId: string,
  msg: InboundMessage,
): Promise<{ contatoId: string | null; novo: boolean }> {
  // Já existe contato?
  const { data: existente } = await db
    .from("contatos")
    .select("id")
    .eq("user_id", userId)
    .eq("telefone", msg.phone)
    .maybeSingle();
  if (existente?.id) return { contatoId: existente.id, novo: false };

  const { data: inserido, error } = await db
    .from("contatos")
    .insert({
      user_id: userId,
      telefone: msg.phone,
      nome: msg.pushName,
      data_hora: msg.ts,
      origem: "whatsapp",
      observacoes: msg.texto,
      texto_conversa: msg.texto,
      whatsapp_jid: msg.phone,
      whatsapp_msg_id: msg.messageId,
      triagem_status: "pendente",
    })
    .select("id")
    .single();

  if (error) {
    // Corrida: outro webhook inseriu primeiro -> busca de novo.
    const { data: again } = await db
      .from("contatos")
      .select("id")
      .eq("user_id", userId)
      .eq("telefone", msg.phone)
      .maybeSingle();
    return { contatoId: again?.id ?? null, novo: false };
  }
  return { contatoId: inserido.id, novo: true };
}

// Dispara a triagem (fire-and-forget) sem bloquear o webhook.
export function dispararTriagem(contatoId: string): void {
  const url = `${env("SUPABASE_URL")}/functions/v1/whatsapp-triagem`;
  // Não await: deixa rodar em background.
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ contato_id: contatoId }),
  }).catch((e) => console.error("dispararTriagem falhou:", e));
}
