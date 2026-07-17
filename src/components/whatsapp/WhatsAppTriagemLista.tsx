import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWhatsAppTriagem, type WhatsAppContato, type TriagemStatus } from "@/hooks/useWhatsAppTriagem";
import { useContatos } from "@/hooks/useContatos";
import { WhatsAppConversaDialog } from "@/components/leads/WhatsAppConversaDialog";
import { Search, MessageSquare, ExternalLink, ArrowRightCircle, Trash2, Phone, MoreVertical, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABEL: Record<TriagemStatus, string> = { potencial: "Potencial", pendente: "A revisar", ruido: "Ruído" };
const STATUS_DOT: Record<TriagemStatus, string> = { potencial: "bg-green-500", pendente: "bg-slate-400", ruido: "bg-red-500" };
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
        <div className="relative w-full min-w-0 sm:w-auto sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, telefone ou texto…" className="pl-9 h-10" />
        </div>
        <div className="flex w-full rounded-lg border p-0.5 sm:w-auto">
          {(["todos", "potencial", "pendente", "ruido"] as const).map((f) => (
            <Button key={f} size="sm" variant={filtro === f ? "default" : "ghost"} className="h-9 flex-1 text-xs px-2 sm:h-8 sm:flex-none sm:px-3"
              onClick={() => setFiltro(f)}>
              {f === "todos" ? "Todos" : STATUS_LABEL[f]}
            </Button>
          ))}
        </div>
      </div>

      <Card className="divide-y overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : filtrada.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhuma conversa encontrada.</p>
        ) : (
          filtrada.map((c) => {
            const prio = c.prioridade ? PRIO[c.prioridade] : null;
            const iniciais = (c.nome || "?").trim().slice(0, 2).toUpperCase();
            return (
              <div key={c.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    {c.nome ? iniciais : <User className="h-5 w-5" />}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate min-w-0">{c.nome || "Sem nome"}</span>
                      {prio && <Badge variant="outline" className={`text-[10px] h-5 ${prio.cls}`}>{prio.label}</Badge>}
                      {c.canal_detectado && <Badge variant="secondary" className="text-[10px] h-5">{c.canal_detectado}</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1 tabular-nums"><Phone className="h-3.5 w-3.5 shrink-0" />{c.telefone}</span>
                      <span className="tabular-nums">{c.data_hora ? format(new Date(c.data_hora), "dd/MM HH:mm", { locale: ptBR }) : ""}</span>
                    </div>
                    {(c.triagem_motivo || c.texto_conversa) && (
                      <p className="text-xs text-foreground/70 mt-1.5 line-clamp-2">
                        {c.triagem_motivo || (c.texto_conversa || "").replace(/\s+/g, " ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 mt-3 sm:pl-[52px] flex-wrap">
                  <Select value={c.triagem_status} onValueChange={(v) => mover(c.id, v as TriagemStatus)}>
                    <SelectTrigger className="h-10 w-[140px] max-w-full shrink-0 text-xs font-medium sm:h-9" aria-label="Classificação">
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[c.triagem_status]}`} />
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="potencial">Potencial</SelectItem>
                      <SelectItem value="pendente">A revisar</SelectItem>
                      <SelectItem value="ruido">Ruído</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="sm" className="h-10 gap-1.5 sm:h-9" onClick={() => setConversa(c)}>
                    <MessageSquare className="h-[18px] w-[18px] text-green-600" /> Conversa
                  </Button>

                  <Button variant="outline" size="sm" className="h-10 gap-1.5 sm:h-9" onClick={() => navigate(`/leads?contato=${c.id}`)}>
                    <ArrowRightCircle className="h-[18px] w-[18px] text-blue-600" />
                    <span className="hidden sm:inline">Funil</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9" aria-label="Mais ações">
                        <MoreVertical className="h-[18px] w-[18px]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-[13px]">
                      <DropdownMenuItem onClick={() => window.open(`https://wa.me/${(c.telefone || "").replace(/\D/g, "")}`, "_blank")}>
                        <ExternalLink className="mr-2 h-4 w-4 text-green-600" /> Abrir no WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/leads?contato=${c.id}`)}>
                        <ArrowRightCircle className="mr-2 h-4 w-4 text-blue-600" /> Enviar para o funil
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteContato.mutate(c.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
