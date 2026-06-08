import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessagesSquare, MessageSquare, CheckCircle2, EyeOff } from "lucide-react";

interface Volume { conversas: number; identificaveis: number; semIdentificacao: number; }

export function WhatsAppVolumeCard() {
  const { data: vol } = useQuery({
    queryKey: ["whatsapp-volume"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("whatsapp-volume", { body: {} });
      return data as Volume | null;
    },
    refetchInterval: 120000,
  });

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <MessagesSquare className="h-4 w-4 text-primary" /> Volume no WhatsApp
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-2xl font-semibold tabular-nums">{vol?.conversas ?? "—"}</div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
            <MessageSquare className="h-3 w-3" /> Conversas totais
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold tabular-nums text-green-600">{vol?.identificaveis ?? "—"}</div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Identificadas
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold tabular-nums text-amber-600">{vol?.semIdentificacao ?? "—"}</div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
            <EyeOff className="h-3 w-3" /> Sem identificação
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
        "Sem identificação" = conversas com privacidade do WhatsApp (@lid) cujo número não foi sincronizado.
        São capturadas automaticamente assim que a pessoa mandar uma nova mensagem.
      </p>
    </Card>
  );
}
