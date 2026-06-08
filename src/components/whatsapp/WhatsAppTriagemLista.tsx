import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWhatsAppTriagem, type WhatsAppContato, type TriagemStatus } from "@/hooks/useWhatsAppTriagem";
import { useContatos } from "@/hooks/useContatos";
import { WhatsAppConversaDialog } from "@/components/leads/WhatsAppConversaDialog";
import { Search, MessageSquare, ExternalLink, ArrowRightCircle, Trash2, Phone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABEL: Record<TriagemStatus, string> = { potencial: "Potencial", pendente: "A revisar", ruido: "Ruído" };
const STATUS_CLS: Record<TriagemStatus, string> = {
  potencial: "text-green-600", pendente: "text-slate-600", ruido: "text-red-600",
};
const PRIO: Record<string, { label: string; cls: string }> = {
  alta: { label: "Alta", cls: "bg-red-500/15 text-red-600 border-red-500/30" },
  media: { label: "Média", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  baixa: { label: "Baixa", cls: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
};

export function WhatsAppTriagemLista() {
  const { lista, mover, isLoading } = useWhatsAppTriagem();
  const { deleteContato } = useContatos();
  const navigate = useNavigate();
  const [conversa, setConversa] = useState<WhatsAppContato | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | TriagemStatus>("todos");

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (lista as WhatsAppContato[]).filter((c) => {
      if (filtro !== "todos" && c.triagem_status !== filtro) return false;
      if (!q) return true;
      return (c.nome || "").toLowerCase().includes(q) || (c.telefone || "").includes(q)
        || (c.triagem_motivo || "").toLowerCase().includes(q);
    });
  }, [lista, busca, filtro]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, telefone ou texto…" className="pl-8 h-9" />
        </div>
        <div className="flex rounded-lg border p-0.5">
          {(["todos", "potencial", "pendente", "ruido"] as const).map((f) => (
            <Button key={f} size="sm" variant={filtro === f ? "default" : "ghost"} className="h-7 text-xs"
              onClick={() => setFiltro(f)}>
              {f === "todos" ? "Todos" : STATUS_LABEL[f]}
            </Button>
          ))}
        </div>
      </div>

      <Card className="divide-y">
        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtrada.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Nenhuma conversa encontrada.</p>
        ) : (
          filtrada.map((c) => {
            const prio = c.prioridade ? PRIO[c.prioridade] : null;
            return (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{c.nome || "Sem nome"}</span>
                    {prio && <Badge variant="outline" className={`text-[10px] ${prio.cls}`}>{prio.label}</Badge>}
                    {c.canal_detectado && <Badge variant="secondary" className="text-[10px]">{c.canal_detectado}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefone}</span>
                    <span>{c.data_hora ? format(new Date(c.data_hora), "dd/MM HH:mm", { locale: ptBR }) : ""}</span>
                  </div>
                  {(c.triagem_motivo || c.texto_conversa) && (
                    <p className="text-xs text-foreground/70 mt-1 line-clamp-1">
                      {c.triagem_motivo || (c.texto_conversa || "").replace(/\s+/g, " ")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Classificação editável */}
                  <Select value={c.triagem_status} onValueChange={(v) => mover(c.id, v as TriagemStatus)}>
                    <SelectTrigger className={`h-8 w-[120px] text-xs font-medium ${STATUS_CLS[c.triagem_status]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="potencial">Potencial</SelectItem>
                      <SelectItem value="pendente">A revisar</SelectItem>
                      <SelectItem value="ruido">Ruído</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Ver conversa" onClick={() => setConversa(c)}>
                    <MessageSquare className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Abrir no WhatsApp"
                    onClick={() => window.open(`https://wa.me/${(c.telefone || "").replace(/\D/g, "")}`, "_blank")}>
                    <ExternalLink className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Enviar para o funil"
                    onClick={() => navigate(`/leads?contato=${c.id}`)}>
                    <ArrowRightCircle className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Excluir"
                    onClick={() => deleteContato.mutate(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </Card>

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
