// ============================================================================
// whatsapp-triagem — classifica um contato do WhatsApp por IA
//   Entrada: { contato_id }
//   Saída no banco: triagem_status, triagem_motivo, canal_detectado, nome, tag
//   Falha de IA NUNCA quebra a captura: contato permanece 'pendente'.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { corsHeaders, env, supabaseAdmin } from "../_shared/whatsapp.ts";

interface TriagemResult {
  triagem: "potencial" | "revisar" | "ruido";
  prioridade: "alta" | "media" | "baixa";
  proximo_passo: string;
  resumo: string;
  canal: string | null;
  nome: string | null;
}

// Mapeia o canal livre para a tag canônica do sistema (anuncio/descoberta/orcamento).
function canalParaTag(canal: string | null): "anuncio" | "descoberta" | "orcamento" | null {
  if (!canal) return null;
  const c = canal.toLowerCase();
  if (/(google|anúncio|anuncio|ads|instagram|facebook|patrocinad|tráfego|trafego)/.test(c)) {
    return "anuncio";
  }
  if (/(orçamento|orcamento|preço|preco|cotação|cotacao)/.test(c)) return "orcamento";
  if (/(indica|amigo|conhecido|placa|obra|passando|vizinho|google maps|maps|site)/.test(c)) {
    return "descoberta";
  }
  return "descoberta";
}

function buildPrompt(conversa: string): string {
  return `Você é a peneira de triagem do WhatsApp da "Só Garagens" (vende e instala pisos: epóxi, PU, uretano, concreto polido, demarcação e revitalização de garagens/obras). Você NÃO cria etapas de funil — só faz a triagem inicial das conversas.

Analise a conversa e responda APENAS com JSON válido, sem markdown:
{"triagem": "potencial"|"revisar"|"ruido", "prioridade": "alta"|"media"|"baixa", "proximo_passo": string, "resumo": string, "canal": string|null, "nome": string|null}

1) "triagem":
- "potencial": sinal claro de interesse em serviço (pede orçamento/visita/preço/prazo; dúvida sobre piso epóxi/PU/uretano/demarcação/revitalização; envia metragem, fotos ou endereço).
- "revisar": pouco contexto, sem segurança para decidir (ex: "Bom dia, tudo bem?", "Pode me chamar?", "Segue a descrição", mensagens curtas sem histórico).
- "ruido": não é oportunidade comercial (fornecedor oferecendo, conversa interna, mensagem automática da própria empresa, spam, cobrança, candidato a vaga, assunto sem relação com pisos/garagens).

2) "prioridade":
- "alta": pediu orçamento/visita, informou metragem, enviou fotos/endereço, ou demonstra urgência.
- "media": parece interessado mas falta informação importante.
- "baixa": conversa vaga, sem intenção clara ou baixo potencial.

3) "proximo_passo": uma ação prática curta. Ex: "Solicitar metragem", "Solicitar fotos do piso", "Solicitar endereço", "Perguntar se deseja visita técnica", "Preparar orçamento", "Retomar contato", "Marcar como ruído", "Enviar para o funil comercial".

4) "resumo": UMA frase curta resumindo a conversa. Ex: "Cliente solicitou orçamento de epóxi para garagem, mas ainda não informou metragem nem fotos."

5) "canal": onde encontrou a empresa (Google, Instagram, indicação, placa na obra...), null se não souber.
6) "nome": nome próprio do cliente, null se não.

CONVERSA:
${conversa}`;
}

function parseJson(text: string): TriagemResult {
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  const parsed = JSON.parse(start >= 0 ? clean.slice(start, end + 1) : clean);
  const tri = ["potencial", "revisar", "ruido"].includes(parsed.triagem) ? parsed.triagem : "revisar";
  const pri = ["alta", "media", "baixa"].includes(parsed.prioridade) ? parsed.prioridade : "media";
  return {
    triagem: tri,
    prioridade: pri,
    proximo_passo: String(parsed.proximo_passo ?? "").slice(0, 120),
    resumo: String(parsed.resumo ?? "").slice(0, 300),
    canal: parsed.canal ?? null,
    nome: parsed.nome ?? null,
  };
}

// Bedrock (Claude) via SigV4. Preferido quando há credencial AWS configurada.
async function classificarBedrock(prompt: string): Promise<TriagemResult> {
  const region = Deno.env.get("BEDROCK_REGION") || "sa-east-1";
  const model = Deno.env.get("BEDROCK_MODEL_ID") || "global.anthropic.claude-haiku-4-5-20251001-v1:0";
  const aws = new AwsClient({
    accessKeyId: env("BEDROCK_AWS_ACCESS_KEY_ID"),
    secretAccessKey: env("BEDROCK_AWS_SECRET_ACCESS_KEY"),
    region,
    service: "bedrock",
  });
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/invoke`;
  const res = await aws.fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 300,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Bedrock ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return parseJson(j?.content?.[0]?.text ?? "{}");
}

// OpenAI / Groq (formato OpenAI-compatível), fallback.
async function classificarOpenAICompat(prompt: string): Promise<TriagemResult> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  const groqKey = Deno.env.get("GROQ_API_KEY") ?? "";
  const useOpenAI = Boolean(openaiKey);
  const apiKey = useOpenAI ? openaiKey : groqKey;
  if (!apiKey) throw new Error("Nenhuma IA configurada (Bedrock, OpenAI ou Groq)");
  const endpoint = useOpenAI
    ? "https://api.openai.com/v1/chat/completions"
    : "https://api.groq.com/openai/v1/chat/completions";
  const model = useOpenAI ? "gpt-4o-mini" : "llama-3.3-70b-versatile";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`IA ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return parseJson(json?.choices?.[0]?.message?.content ?? "{}");
}

async function classificar(conversa: string): Promise<TriagemResult> {
  const prompt = buildPrompt(conversa);
  // Prioridade: Bedrock (AWS) > OpenAI > Groq.
  if (Deno.env.get("BEDROCK_AWS_ACCESS_KEY_ID")) return await classificarBedrock(prompt);
  return await classificarOpenAICompat(prompt);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const db = supabaseAdmin();
  let contatoId: string | null = null;
  try {
    const body = await req.json();
    contatoId = body?.contato_id ?? null;
    if (!contatoId) throw new Error("contato_id ausente");

    const { data: contato, error } = await db
      .from("contatos")
      .select("id, user_id, telefone, nome, texto_conversa, observacoes")
      .eq("id", contatoId)
      .single();
    if (error || !contato) throw new Error("contato não encontrado");

    // Últimas mensagens da conversa (contexto para a IA).
    const { data: msgs } = await db
      .from("whatsapp_mensagens")
      .select("from_me, texto, message_ts")
      .eq("user_id", contato.user_id)
      .eq("jid", contato.telefone)
      .order("message_ts", { ascending: true })
      .limit(20);

    let conversa = (msgs ?? [])
      .filter((m: { texto?: string | null }) => m.texto)
      .map((m: { from_me: boolean; texto: string | null }) =>
        `${m.from_me ? "EMPRESA" : "CLIENTE"}: ${m.texto}`
      )
      .join("\n");

    // Fallback: se o log de mensagens estiver vazio (ex.: backfill), usa o texto salvo no contato.
    if (!conversa.trim()) {
      conversa = (contato.texto_conversa || contato.observacoes || "").toString();
    }

    if (!conversa.trim()) {
      // Sem texto ainda — mantém pendente para re-triagem quando chegar conteúdo.
      return new Response(JSON.stringify({ ok: true, status: "pendente" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await classificar(conversa);
    // "revisar" => triagem_status 'pendente' (coluna A revisar).
    const status = r.triagem === "potencial" ? "potencial" : r.triagem === "ruido" ? "ruido" : "pendente";

    await db
      .from("contatos")
      .update({
        triagem_status: status,
        triagem_motivo: r.resumo,
        prioridade: r.prioridade,
        proximo_passo: r.proximo_passo,
        canal_detectado: r.canal,
        tag: canalParaTag(r.canal),
        nome: r.nome ?? contato.nome,
        texto_conversa: conversa.slice(0, 2000),
      })
      .eq("id", contatoId);

    return new Response(
      JSON.stringify({ ok: true, status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("whatsapp-triagem erro:", e);
    // Deixa pendente para revisão manual / nova tentativa. Nunca perde o contato.
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
