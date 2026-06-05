// ============================================================================
// whatsapp-chat-ia — chat com IA (Claude Sonnet via Bedrock) sobre os dados do
// WhatsApp. A IA recebe um resumo dos contatos/conversas e responde perguntas
// de análise (estratificação, padrões, leads por canal, etc.). Requer login.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
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

function montarContexto(contatos: any[]): string {
  const total = contatos.length;
  const porStatus: Record<string, number> = {};
  const porCanal: Record<string, number> = {};
  for (const c of contatos) {
    porStatus[c.triagem_status || "pendente"] = (porStatus[c.triagem_status || "pendente"] || 0) + 1;
    const canal = c.canal_detectado || "não informado";
    porCanal[canal] = (porCanal[canal] || 0) + 1;
  }
  const linhas = contatos.slice(0, 120).map((c, i) => {
    const data = (c.data_hora || "").slice(0, 16).replace("T", " ");
    const conv = (c.texto_conversa || c.observacoes || "").replace(/\s+/g, " ").slice(0, 700);
    return `#${i + 1} | ${c.nome || "sem nome"} | tel ${c.telefone} | ${data} | triagem: ${c.triagem_status || "pendente"} | canal: ${c.canal_detectado || "?"} | motivo IA: ${c.triagem_motivo || "-"}\n   conversa: ${conv}`;
  }).join("\n");
  return `ESTATÍSTICAS:
- Total de contatos/conversas: ${total}
- Por triagem: ${JSON.stringify(porStatus)}
- Por canal detectado: ${JSON.stringify(porCanal)}

CONVERSAS (até 120 mais recentes):
${linhas}`;
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

    const body = await req.json();
    const messages: { role: string; content: string }[] = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length) throw new Error("messages vazio");

    // Dados do WhatsApp do usuário (RLS garante que são dele).
    const { data: contatos } = await supa
      .from("contatos")
      .select("nome, telefone, data_hora, triagem_status, canal_detectado, triagem_motivo, texto_conversa, observacoes")
      .eq("origem", "whatsapp")
      .is("deleted_at", null)
      .order("data_hora", { ascending: false })
      .limit(400);

    const contexto = montarContexto(contatos ?? []);
    const system = `Você é um analista comercial da empresa "Só Garagens" (vende e instala pisos para garagens/obras: epóxi, concreto polido, etc.). Você ajuda o dono a analisar os contatos e conversas capturados do WhatsApp.

Use SOMENTE os dados fornecidos abaixo. Seja direto, objetivo e prático. Quando fizer contagens ou listas, baseie-se nos dados. Responda em português do Brasil. Se a pergunta não puder ser respondida com os dados, diga o que falta.

DADOS DISPONÍVEIS:
${contexto}`;

    const region = Deno.env.get("BEDROCK_REGION") || "sa-east-1";
    const model = Deno.env.get("BEDROCK_CHAT_MODEL_ID") || "global.anthropic.claude-sonnet-4-5-20250929-v1:0";
    const aws = new AwsClient({
      accessKeyId: env("BEDROCK_AWS_ACCESS_KEY_ID"),
      secretAccessKey: env("BEDROCK_AWS_SECRET_ACCESS_KEY"),
      region, service: "bedrock",
    });
    const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/invoke`;
    const res = await aws.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1500,
        temperature: 0.3,
        system,
        messages: messages.slice(-12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      }),
    });
    if (!res.ok) throw new Error(`Bedrock ${res.status}: ${await res.text()}`);
    const j = await res.json();
    const resposta = j?.content?.[0]?.text ?? "(sem resposta)";
    return new Response(JSON.stringify({ ok: true, resposta }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-chat-ia erro:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
