import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, AlertCircle, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Msg { from_me: boolean; texto: string | null; ts: string | null; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  telefone: string | null;   // número real (envio)
  jid?: string | null;       // jid da conversa p/ buscar histórico (pode ser @lid)
  nome?: string | null;
}

export function WhatsAppConversaDialog({ open, onOpenChange, telefone, jid, nome }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Busca pelo telefone real (nosso banco indexa por número, não pelo @lid).
  const fonte = telefone || jid;

  useEffect(() => {
    if (!open || !fonte) return;
    setLoading(true); setErro(null); setMsgs([]); setResposta("");
    supabase.functions
      .invoke("whatsapp-conversa", { body: { telefone: fonte } })
      .then(({ data, error }) => {
        if (error) throw error;
        if (data?.error) setErro(data.error);
        else setMsgs(data?.mensagens ?? []);
      })
      .catch((e) => setErro((e as Error).message))
      .finally(() => setLoading(false));
  }, [open, fonte]);

  useEffect(() => {
    if (!loading && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [loading, msgs]);

  const enviar = async () => {
    const t = resposta.trim();
    if (!t || enviando || !telefone) return;
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: { telefone, texto: t },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMsgs((m) => [...m, { from_me: true, texto: t, ts: new Date().toISOString() }]);
      setResposta("");
      toast.success("Mensagem enviada");
    } catch (e) {
      toast.error("Erro ao enviar", { description: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[80vh] max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            {nome || telefone || "Conversa"}
          </DialogTitle>
          <DialogDescription>
            Histórico do WhatsApp{msgs.length ? ` · ${msgs.length} mensagens` : ""}
          </DialogDescription>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 bg-muted/20">
          {loading ? (
            <div className="space-y-3 p-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className={`h-12 ${i % 2 ? "w-2/3 ml-auto" : "w-3/4"}`} />)}
            </div>
          ) : erro ? (
            <div className="flex flex-col items-center gap-2 text-caption text-sm py-12">
              <AlertCircle className="h-8 w-8 text-amber-500" />
              <p className="font-medium">Não foi possível carregar a conversa</p>
              <p className="text-xs text-center max-w-xs">{erro}</p>
            </div>
          ) : msgs.length === 0 ? (
            <p className="text-center text-caption text-sm py-12">Nenhuma mensagem encontrada. Você pode iniciar abaixo.</p>
          ) : (
            <div className="space-y-2 p-2">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.from_me ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words shadow-sm ${
                    m.from_me ? "bg-green-600 text-white rounded-br-sm" : "bg-white border rounded-bl-sm"
                  }`}>
                    {m.texto}
                    {m.ts && (
                      <span className={`block text-[10px] mt-1 ${m.from_me ? "text-green-100" : "text-muted-foreground"}`}>
                        {format(new Date(m.ts), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Responder */}
        <div className="border-t p-3 shrink-0 flex gap-2 items-end">
          <Textarea
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder="Escreva uma resposta… (Enter envia)"
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
            disabled={enviando}
          />
          <Button onClick={enviar} disabled={enviando || !resposta.trim()} size="icon" className="h-11 w-11 shrink-0 bg-green-600 hover:bg-green-700">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
