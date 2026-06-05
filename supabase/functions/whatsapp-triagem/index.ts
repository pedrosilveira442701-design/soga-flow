// ============================================================================
// whatsapp-triagem — classifica um contato do WhatsApp por IA
//   Entrada: { contato_id }
//   Saída no banco: triagem_status, triagem_motivo, canal_detectado, nome, tag
//   Falha de IA NUNCA quebra a captura: contato permanece 'pendente'.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, env, supabaseAdmin } from "../_shared/whatsapp.ts";

interface TriagemResult {
  e_lead_real: boolean;
  canal: string | null;
  nome: string | null;
  motivo: string;
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

async function classificar(conversa: string): Promise<TriagemResult> {
  const apiKey = env("GROQ_API_KEY");
  const prompt = `Você analisa conversas de WhatsApp de uma empresa que vende e instala pisos (epóxi, concreto polido, etc.) para garagens e obras.
A empresa atende por WhatsApp e SEMPRE pergunta ao cliente como ele encontrou a empresa.

Analise a conversa abaixo e responda APENAS com um JSON válido, sem markdown, no formato:
{"e_lead_real": boolean, "canal": string|null, "nome": string|null, "motivo": string}

Regras:
- "e_lead_real": true se for um potencial cliente (pede orçamento, preço, informação sobre piso/serviço). false se for ruído (entregador, fornecedor, número errado, spam, cobrança, mensagem automática).
- "canal": onde o cliente disse que encontrou a empresa (ex: "Google", "Instagram", "indicação de amigo", "placa na obra"). null se não souber.
- "nome": nome próprio do cliente se ele se identificou. null se não.
- "motivo": frase curta (max 12 palavras) explicando a classificação.

CONVERSA:
${conversa}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  return {
    e_lead_real: Boolean(parsed.e_lead_real),
    canal: parsed.canal ?? null,
    nome: parsed.nome ?? null,
    motivo: String(parsed.motivo ?? "").slice(0, 200),
  };
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
      .select("id, user_id, telefone, nome")
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

    const conversa = (msgs ?? [])
      .filter((m: { texto?: string | null }) => m.texto)
      .map((m: { from_me: boolean; texto: string | null }) =>
        `${m.from_me ? "EMPRESA" : "CLIENTE"}: ${m.texto}`
      )
      .join("\n");

    if (!conversa.trim()) {
      // Sem texto ainda — mantém pendente para re-triagem quando chegar conteúdo.
      return new Response(JSON.stringify({ ok: true, status: "pendente" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await classificar(conversa);

    await db
      .from("contatos")
      .update({
        triagem_status: r.e_lead_real ? "potencial" : "ruido",
        triagem_motivo: r.motivo,
        canal_detectado: r.canal,
        tag: canalParaTag(r.canal),
        nome: r.nome ?? contato.nome,
        texto_conversa: conversa.slice(0, 2000),
      })
      .eq("id", contatoId);

    return new Response(
      JSON.stringify({ ok: true, status: r.e_lead_real ? "potencial" : "ruido" }),
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
