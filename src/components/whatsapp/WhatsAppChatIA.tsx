import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Send, Loader2 } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string; }

const SUGESTOES = [
  "Quais leads pediram orçamento?",
  "Qual canal trouxe mais contatos?",
  "Resuma os contatos de hoje",
  "Quais conversas parecem mais quentes para fechar?",
];

export function WhatsAppChatIA() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const enviar = async (texto: string) => {
    const t = texto.trim();
    if (!t || loading) return;
    const novas: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(novas);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-chat-ia", {
        body: { messages: novas },
      });
      if (error) throw error;
      const resposta = data?.error ? `⚠️ ${data.error}` : (data?.resposta ?? "(sem resposta)");
      setMessages((m) => [...m, { role: "assistant", content: resposta }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ Erro: ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[70dvh] min-h-[420px] sm:h-[600px] overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b shrink-0">
        <h3 className="text-h3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" /> Análise com IA
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pergunte sobre seus contatos e conversas do WhatsApp · Claude Sonnet
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 bg-muted/10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="h-10 w-10 text-violet-400" />
            <p className="text-sm text-muted-foreground max-w-sm">
              Pergunte qualquer coisa sobre suas conversas — a IA analisa os dados capturados do WhatsApp.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="text-xs rounded-full border px-3 py-1.5 hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"
              }`}>
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analisando…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t p-3 shrink-0 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(input); }
          }}
          placeholder="Pergunte sobre as conversas… (Enter para enviar)"
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
        />
        <Button onClick={() => enviar(input)} disabled={loading || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
}
