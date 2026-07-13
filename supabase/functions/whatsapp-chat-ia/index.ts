// ============================================================================
// whatsapp-chat-ia — chat com IA (Claude Sonnet via Bedrock) sobre os dados do
// WhatsApp. A IA analisa contatos/conversas E PODE ENVIAR mensagens (tool use),
// quando o usuário pedir explicitamente. Requer login.
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
    return `#${i + 1} | ${c.nome || "sem nome"} | tel ${c.telefone} | ${data} | triagem: ${c.triagem_status || "pendente"} | segmento: ${c.segmento || "?"} | canal: ${c.canal_detectado || "?"} | motivo IA: ${c.triagem_motivo || "-"}\n   conversa: ${conv}`;
  }).join("\n");
  return `ESTATÍSTICAS:\n- Total: ${total} | Por triagem: ${JSON.stringify(porStatus)} | Por canal: ${JSON.stringify(porCanal)}\n\nCONVERSAS (até 120 mais recentes):\n${linhas}`;
}

function normalizaNumero(input: string): string {
  let d = (input ?? "").split("@")[0].replace(/\D/g, "");
  if (!d.startsWith("55") && d.length >= 10 && d.length <= 11) d = "55" + d;
  return d;
}

async function enviarWhatsApp(telefone: string, mensagem: string): Promise<string> {
  const numero = normalizaNumero(telefone);
  if (!numero || numero.length < 12) return "ERRO: número inválido (" + telefone + ")";
  if (!mensagem || !mensagem.trim()) return "ERRO: mensagem vazia";
  const url = env("EVOLUTION_API_URL").replace(/\/+$/, "");
  const instance = Deno.env.get("EVOLUTION_INSTANCE") || "sogaragens";
  try {
    const r = await fetch(`${url}/message/sendText/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env("EVOLUTION_API_KEY") },
      body: JSON.stringify({ number: numero, text: mensagem }),
    });
    if (!r.ok) return `ERRO ao enviar (${r.status}): ${(await r.text()).slice(0, 200)}`;
    return `SUCESSO: mensagem enviada para ${numero}`;
  } catch (e) {
    return `ERRO de rede ao enviar: ${e}`;
  }
}

const TOOLS = [{
  name: "enviar_mensagem_whatsapp",
  description: "Envia uma mensagem de TEXTO pelo WhatsApp da empresa para UM contato. Use somente quando o usuário pedir explicitamente para enviar/responder. Confirme destinatário e texto antes. Nunca envie em massa.",
  input_schema: {
    type: "object",
    properties: {
      telefone: { type: "string", description: "Número do destinatário com DDD (ex: 553184756879). Use o telefone exato do contato nos dados." },
      mensagem: { type: "string", description: "Texto exato a enviar." },
    },
    required: ["telefone", "mensagem"],
  },
}];

async function bedrock(aws: AwsClient, region: string, model: string, system: string, messages: any[]) {
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/invoke`;
  const res = await aws.fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1500, temperature: 0.3, system, tools: TOOLS, messages,
    }),
  });
  if (!res.ok) throw new Error(`Bedrock ${res.status}: ${await res.text()}`);
  return await res.json();
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
    const incoming: { role: string; content: string }[] = Array.isArray(body?.messages) ? body.messages : [];
    if (!incoming.length) throw new Error("messages vazio");

    const { data: contatos } = await supa
      .from("contatos")
      .select("nome, telefone, data_hora, triagem_status, segmento, canal_detectado, triagem_motivo, texto_conversa, observacoes")
      .eq("origem", "whatsapp").is("deleted_at", null)
      .order("data_hora", { ascending: false }).limit(400);

    const system = `Você é o assistente comercial da "Só Garagens" (pisos para garagens/obras: epóxi, concreto polido). Ajuda o dono a analisar os contatos/conversas do WhatsApp E pode ENVIAR mensagens.

ENVIO (ferramenta enviar_mensagem_whatsapp):
- Você PODE enviar mensagens pelo WhatsApp usando a ferramenta, mas SOMENTE quando o usuário pedir claramente para enviar/responder.
- Use o telefone EXATO do contato que está nos dados. Envie para UM contato por vez. Nunca dispare em massa nem mensagens idênticas para vários.
- Se houver qualquer ambiguidade (qual contato? qual texto?), PERGUNTE antes de enviar.
- Depois de enviar, confirme ao usuário com o resultado real da ferramenta. Se a ferramenta retornar ERRO, diga que NÃO foi enviado.

ROTEIRO DE DIAGNÓSTICO (siga ao redigir respostas/rascunhos para clientes — o diagnóstico NÃO é orçamento, é qualificação):
- No WhatsApp, no MÁXIMO 5-7 perguntas, uma por mensagem, em ordem: (1) segmento se desconhecido ("é condomínio, empresa/indústria, comércio, obra ou residência?"), (2) metragem + cidade, (3) substrato atual (concreto/cerâmica/pintura antiga), (4) a dor principal ("o que mais incomoda no piso hoje?"), (5) o gatilho ("o que fez procurar uma solução agora?"), (6) UMA pergunta discriminante do segmento, (7) fechar para visita técnica.
- Pergunta discriminante por segmento — condominio: "a decisão é do síndico ou vai a assembleia? quando é a próxima?"; industria: "tem tráfego de empilhadeira ou contato com químicos?"; alimenticio: "a área tem forno ou câmara fria?"; comercio_auto: "a obra pode ser por etapas ou de madrugada, sem fechar a operação?"; obra_nova: "quantos dias de cura tem o contrapiso?" (mínimo 28 — menos que isso, agendar para depois); residencial: "o que mais incomoda: poeira ou aparência?".
- NUNCA perguntar fora do segmento (empilhadeira/ANVISA para síndico, assembleia para indústria, quantificação de prejuízo para residencial).
- Fechamento consultivo, nunca "vou fazer um orçamento": "Pelo que você descreveu, conseguimos resolver de forma definitiva. O próximo passo é um levantamento técnico no local para definir o sistema adequado — epóxi, uretano ou acrílico — e montar uma proposta considerando durabilidade, operação e custo-benefício."
- Alimentício: NUNCA prometer piso "aprovado pela ANVISA" (a ANVISA não certifica pisos; atendemos requisitos de superfície — dizer isso posiciona como especialista).

Use SOMENTE os dados abaixo para análise. Português do Brasil. Seja direto.

DADOS:
${montarContexto(contatos ?? [])}`;

    const region = Deno.env.get("BEDROCK_REGION") || "sa-east-1";
    const model = Deno.env.get("BEDROCK_CHAT_MODEL_ID") || "global.anthropic.claude-sonnet-4-5-20250929-v1:0";
    const aws = new AwsClient({
      accessKeyId: env("BEDROCK_AWS_ACCESS_KEY_ID"),
      secretAccessKey: env("BEDROCK_AWS_SECRET_ACCESS_KEY"),
      region, service: "bedrock",
    });

    // Histórico: só texto (rodadas anteriores). A IA recompõe o contexto a cada turno.
    const messages: any[] = incoming.slice(-12).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    let enviou = false;
    // Loop de tool use (máx 4 iterações).
    for (let i = 0; i < 4; i++) {
      const resp = await bedrock(aws, region, model, system, messages);
      const content = resp?.content ?? [];
      if (resp?.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content });
        const results = [];
        for (const block of content) {
          if (block.type === "tool_use" && block.name === "enviar_mensagem_whatsapp") {
            const r = await enviarWhatsApp(block.input?.telefone, block.input?.mensagem);
            if (r.startsWith("SUCESSO")) enviou = true;
            results.push({ type: "tool_result", tool_use_id: block.id, content: r });
          }
        }
        messages.push({ role: "user", content: results });
        continue;
      }
      const texto = content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n") || "(sem resposta)";
      return new Response(JSON.stringify({ ok: true, resposta: texto, enviou }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, resposta: "(limite de processamento atingido)", enviou }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-chat-ia erro:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
