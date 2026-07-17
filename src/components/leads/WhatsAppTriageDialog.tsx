import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Trash2, RotateCcw, Phone, Clock, Radio, MessageCircle } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useWhatsAppTriagem, type WhatsAppContato } from "@/hooks/useWhatsAppTriagem";
import { useWhatsAppConexao } from "@/hooks/useWhatsAppConexao";
import { WhatsAppConversaDialog } from "@/components/leads/WhatsAppConversaDialog";
import type { Contato } from "@/hooks/useContatos";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPromover: (contato: Contato) => void;
}

function ConexaoBadge() {
  const { status } = useWhatsAppConexao();
  const map = {
    conectado: { label: "WhatsApp conectado", cls: "bg-green-500/15 text-green-600 border-green-500/30" },
    conectando: { label: "Conectando…", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    desconectado: { label: "WhatsApp desconectado", cls: "bg-red-500/15 text-red-600 border-red-500/30" },
  } as const;
  const m = map[status];
  return (
    <Badge variant="outline" className={`gap-1.5 ${m.cls}`}>
      <Radio className="h-3 w-3" /> {m.label}
    </Badge>
  );
}

function ContatoCard({
  contato,
  onPromover,
  onDescartar,
  onRestaurar,
  onVerConversa,
}: {
  contato: WhatsAppContato;
  onPromover?: (c: WhatsAppContato) => void;
  onDescartar?: (id: string) => void;
  onRestaurar?: (id: string) => void;
  onVerConversa?: (c: WhatsAppContato) => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">{contato.nome || "Sem nome"}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-sm mt-0.5">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contato.telefone}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {contato.data_hora ? format(new Date(contato.data_hora), "dd/MM HH:mm", { locale: ptBR }) : "—"}
            </span>
          </div>
        </div>
        {contato.canal_detectado && (
          <Badge variant="secondary" className="shrink-0">{contato.canal_detectado}</Badge>
        )}
      </div>

      {contato.triagem_motivo && (
        <p className="text-sm text-caption italic">"{contato.triagem_motivo}"</p>
      )}

      {contato.texto_conversa && (
        <div className="flex gap-1.5 text-sm text-caption bg-muted/40 rounded p-2 max-h-20 overflow-hidden">
          <MessageCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="line-clamp-3 whitespace-pre-line">{contato.texto_conversa}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {onPromover && (
          <Button size="sm" className="gap-1" onClick={() => onPromover(contato)}>
            Promover a Lead <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
        {onVerConversa && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => onVerConversa(contato)}>
            <MessageCircle className="h-3.5 w-3.5" /> Ver conversa
          </Button>
        )}
        {onRestaurar && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => onRestaurar(contato.id)}>
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar
          </Button>
        )}
        {onDescartar && (
          <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" onClick={() => onDescartar(contato.id)}>
            <Trash2 className="h-3.5 w-3.5" /> Descartar
          </Button>
        )}
      </div>
    </div>
  );
}

function Lista({ contatos, empty, children }: { contatos: WhatsAppContato[]; empty: string; children: (c: WhatsAppContato) => React.ReactNode }) {
  if (contatos.length === 0) {
    return <p className="text-center text-caption text-sm py-10">{empty}</p>;
  }
  return <div className="space-y-3">{contatos.map((c) => <div key={c.id}>{children(c)}</div>)}</div>;
}

export function WhatsAppTriageDialog({ open, onOpenChange, onPromover }: Props) {
  const { potenciais, pendentes, ruido, descartar, restaurar, isLoading } = useWhatsAppTriagem();
  const [conversaContato, setConversaContato] = useState<WhatsAppContato | null>(null);

  const handlePromover = (c: WhatsAppContato) => {
    onPromover(c);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85dvh] max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-6 pb-3 shrink-0">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <DialogTitle>Triagem WhatsApp</DialogTitle>
            <ConexaoBadge />
          </div>
          <DialogDescription>
            Leads capturados automaticamente do WhatsApp. Revise os potenciais e promova ao funil.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="potenciais" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 sm:mx-6 max-w-[calc(100%-2rem)] justify-start overflow-x-auto sm:max-w-none">
            <TabsTrigger value="potenciais" className="gap-1.5">
              Potenciais {potenciais.length > 0 && <Badge variant="secondary">{potenciais.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="pendentes" className="gap-1.5">
              Pendentes {pendentes.length > 0 && <Badge variant="secondary">{pendentes.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="ruido" className="gap-1.5">
              Ruído {ruido.length > 0 && <Badge variant="secondary">{ruido.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
            {isLoading ? (
              <p className="text-center text-caption text-sm py-10">Carregando…</p>
            ) : (
              <>
                <TabsContent value="potenciais" className="mt-0">
                  <Lista contatos={potenciais} empty="Nenhum lead potencial na fila.">
                    {(c) => <ContatoCard contato={c} onPromover={handlePromover} onDescartar={descartar} onVerConversa={setConversaContato} />}
                  </Lista>
                </TabsContent>
                <TabsContent value="pendentes" className="mt-0">
                  <Lista contatos={pendentes} empty="Nada pendente de triagem.">
                    {(c) => <ContatoCard contato={c} onPromover={handlePromover} onDescartar={descartar} onVerConversa={setConversaContato} />}
                  </Lista>
                </TabsContent>
                <TabsContent value="ruido" className="mt-0">
                  <Lista contatos={ruido} empty="Nenhum contato descartado.">
                    {(c) => <ContatoCard contato={c} onRestaurar={restaurar} onVerConversa={setConversaContato} />}
                  </Lista>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>

      <WhatsAppConversaDialog
        open={!!conversaContato}
        onOpenChange={(o) => !o && setConversaContato(null)}
        telefone={conversaContato?.telefone || null}
        jid={conversaContato?.whatsapp_jid}
        nome={conversaContato?.nome}
      />
    </Dialog>
  );
}
