import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWhatsAppTriagem, type WhatsAppContato, type TriagemStatus } from "@/hooks/useWhatsAppTriagem";
import { useContatos } from "@/hooks/useContatos";
import { WhatsAppConversaDialog } from "@/components/leads/WhatsAppConversaDialog";
import {
  MessageSquare, MoreVertical, ArrowRightCircle, ExternalLink, Phone, Clock, ArrowRight, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLUNAS: { status: TriagemStatus; titulo: string; cor: string; borda: string }[] = [
  { status: "potencial", titulo: "Potencial", cor: "text-green-700", borda: "border-green-500/40 bg-green-500/5" },
  { status: "pendente", titulo: "A revisar", cor: "text-slate-600", borda: "border-slate-400/40 bg-slate-500/5" },
  { status: "ruido", titulo: "Ruído", cor: "text-red-700", borda: "border-red-500/40 bg-red-500/5" },
];
const PRIO: Record<string, { label: string; cls: string }> = {
  alta: { label: "Alta", cls: "bg-red-500/15 text-red-600 border-red-500/30" },
  media: { label: "Média", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  baixa: { label: "Baixa", cls: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
};
const SEGMENTO: Record<string, { label: string; cls: string }> = {
  condominio: { label: "Condomínio", cls: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
  industria: { label: "Indústria", cls: "bg-orange-500/15 text-orange-700 border-orange-500/30" },
  alimenticio: { label: "Alimentício", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  comercio_auto: { label: "Comércio/Auto", cls: "bg-purple-500/15 text-purple-700 border-purple-500/30" },
  obra_nova: { label: "Obra nova", cls: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  residencial: { label: "Residencial", cls: "bg-slate-500/15 text-slate-700 border-slate-500/30" },
};

function Card({ c, onVerConversa, onMover, onFunil, onDescartar }: {
  c: WhatsAppContato;
  onVerConversa: (c: WhatsAppContato) => void;
  onMover: (id: string, s: TriagemStatus) => void;
  onFunil: (c: WhatsAppContato) => void;
  onDescartar: (id: string) => void;
}) {
  const prio = c.prioridade ? PRIO[c.prioridade] : null;
  const seg = c.segmento ? SEGMENTO[c.segmento] : null;
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{c.nome || "Sem nome"}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefone}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
              {c.data_hora ? format(new Date(c.data_hora), "dd/MM HH:mm", { locale: ptBR }) : "—"}</span>
          </div>
        </div>
        {prio && <Badge variant="outline" className={`shrink-0 text-[10px] ${prio.cls}`}>{prio.label}</Badge>}
      </div>

      {c.triagem_motivo && <p className="text-xs text-foreground/80 italic leading-snug">"{c.triagem_motivo}"</p>}
      {c.proximo_passo && (
        <p className="text-xs flex items-start gap-1 text-primary">
          <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {c.proximo_passo}
        </p>
      )}
      {(seg || c.canal_detectado) && (
        <div className="flex flex-wrap gap-1">
          {seg && <Badge variant="outline" className={`text-[10px] ${seg.cls}`}>{seg.label}</Badge>}
          {c.canal_detectado && <Badge variant="secondary" className="text-[10px]">{c.canal_detectado}</Badge>}
        </div>
      )}

      <div className="flex items-center gap-1.5 pt-1">
        <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs flex-1" onClick={() => onVerConversa(c)}>
          <MessageSquare className="h-[18px] w-[18px] text-green-600" /> Conversa
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Mais ações"><MoreVertical className="h-[18px] w-[18px]" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-[13px]">
            <DropdownMenuItem onClick={() => onFunil(c)}>
              <ArrowRightCircle className="mr-2 h-4 w-4 text-blue-600" /> Enviar para o funil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`https://wa.me/${(c.telefone || "").replace(/\D/g, "")}`, "_blank")}>
              <ExternalLink className="mr-2 h-4 w-4 text-green-600" /> Abrir no WhatsApp
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {COLUNAS.filter((col) => col.status !== c.triagem_status).map((col) => (
              <DropdownMenuItem key={col.status} onClick={() => onMover(c.id, col.status)}>
                Mover para {col.titulo}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDescartar(c.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function WhatsAppTriagemKanban() {
  const { potenciais, pendentes, ruido, mover, isLoading } = useWhatsAppTriagem();
  const { deleteContato } = useContatos();
  const navigate = useNavigate();
  const [conversa, setConversa] = useState<WhatsAppContato | null>(null);

  const grupos: Record<TriagemStatus, WhatsAppContato[]> = {
    potencial: potenciais, pendente: pendentes, ruido: ruido,
  };
  const onFunil = (c: WhatsAppContato) => navigate(`/leads?contato=${c.id}`);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUNAS.map((col) => (
          <div key={col.status} className={`rounded-xl border-2 ${col.borda} p-3 flex flex-col min-h-[200px]`}>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className={`text-sm font-semibold ${col.cor}`}>{col.titulo}</span>
              <Badge variant="secondary">{grupos[col.status].length}</Badge>
            </div>
            <div className="space-y-2 flex-1">
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : grupos[col.status].length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Vazio</p>
              ) : (
                grupos[col.status].map((c) => (
                  <Card key={c.id} c={c} onVerConversa={setConversa} onMover={mover}
                    onFunil={onFunil} onDescartar={(id) => deleteContato.mutate(id)} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <WhatsAppConversaDialog
        open={!!conversa}
        onOpenChange={(o) => !o && setConversa(null)}
        telefone={conversa?.telefone ?? null}
        jid={conversa?.whatsapp_jid}
        nome={conversa?.nome}
      />
    </>
  );
}
