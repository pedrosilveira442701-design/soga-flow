import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Msg { from_me: boolean; texto: string | null; ts: string | null; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  telefone: string | null;
  nome?: string | null;
}

export function WhatsAppConversaDialog({ open, onOpenChange, telefone, nome }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !telefone) return;
    setLoading(true); setErro(null); setMsgs([]);
    supabase.functions
      .invoke("whatsapp-conversa", { body: { telefone } })
      .then(({ data, error }) => {
        if (error) throw error;
        if (data?.error) setErro(data.error);
        else setMsgs(data?.mensagens ?? []);
      })
      .catch((e) => setErro((e as Error).message))
      .finally(() => setLoading(false));
  }, [open, telefone]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            {nome || telefone || "Conversa"}
          </DialogTitle>
          <DialogDescription>Histórico de mensagens trocadas no WhatsApp</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 py-3 bg-muted/20">
          {loading ? (
            <div className="space-y-3 p-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className={`h-12 ${i % 2 ? "w-2/3 ml-auto" : "w-3/4"}`} />
              ))}
            </div>
          ) : erro ? (
            <div className="flex flex-col items-center gap-2 text-caption text-sm py-12">
              <AlertCircle className="h-8 w-8 text-amber-500" />
              <p className="font-medium">Não foi possível carregar a conversa</p>
              <p className="text-xs text-center max-w-xs">{erro}</p>
            </div>
          ) : msgs.length === 0 ? (
            <p className="text-center text-caption text-sm py-12">Nenhuma mensagem encontrada para este número.</p>
          ) : (
            <div className="space-y-2 p-2">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.from_me ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                      m.from_me
                        ? "bg-green-600 text-white rounded-br-sm"
                        : "bg-white border rounded-bl-sm"
                    }`}
                  >
                    {m.texto}
                    {m.ts && (
                      <span className={`block text-[10px] mt-1 ${m.from_me ? "text-green-100" : "text-muted-foreground"}`}>
                        {format(new Date(m.ts), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
