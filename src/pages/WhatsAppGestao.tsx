import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWhatsAppGestao } from "@/hooks/useWhatsAppGestao";
import { useWhatsAppConexao } from "@/hooks/useWhatsAppConexao";
import { WhatsAppChatIA } from "@/components/whatsapp/WhatsAppChatIA";
import { WhatsAppVolumeCard } from "@/components/whatsapp/WhatsAppVolumeCard";
import { WhatsAppTriagemKanban } from "@/components/whatsapp/WhatsAppTriagemKanban";
import { WhatsAppTriagemLista } from "@/components/whatsapp/WhatsAppTriagemLista";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { MessageSquare, Users, Sparkles, TrendingUp, Radio } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

const STATUS_CORES: Record<string, string> = { potencial: "#16a34a", pendente: "#64748b", ruido: "#dc2626" };

function Kpi({ icon: Icon, label, valor, cor }: { icon: any; label: string; valor: number | string; cor: string }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${cor}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-semibold tabular-nums leading-none">{valor}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </Card>
  );
}

export default function WhatsAppGestao() {
  const g = useWhatsAppGestao();
  const { status } = useWhatsAppConexao();
  const [vista, setVista] = useState<"kanban" | "lista">("lista");
  const conexao = {
    conectado: { label: "Conectado", cls: "bg-green-500/15 text-green-600 border-green-500/30" },
    conectando: { label: "Conectando…", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    desconectado: { label: "Desconectado", cls: "bg-red-500/15 text-red-600 border-red-500/30" },
  }[status];

  const canalData = g.porCanal.slice(0, 8);

  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <MessageSquare className="page-icon" /> Gestão WhatsApp
          </h1>
          <p className="text-body text-caption mt-1.5">
            Estratifique e analise as conversas capturadas do WhatsApp
          </p>
        </div>
        <Badge variant="outline" className={`gap-1.5 ${conexao.cls}`}>
          <Radio className="h-3 w-3" /> {conexao.label}
        </Badge>
      </div>

      {/* Volume real no WhatsApp */}
      <WhatsAppVolumeCard />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {g.isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-[72px]" />)
        ) : (
          <>
            <Kpi icon={MessageSquare} label="Conversas capturadas" valor={g.total} cor="bg-blue-500/15 text-blue-600" />
            <Kpi icon={TrendingUp} label="Potenciais" valor={g.potenciais} cor="bg-green-500/15 text-green-600" />
            <Kpi icon={Users} label="A revisar" valor={g.pendentes} cor="bg-slate-500/15 text-slate-600" />
            <Kpi icon={Sparkles} label="Ruído (descartados)" valor={g.ruido} cor="bg-red-500/15 text-red-600" />
          </>
        )}
      </div>

      {/* Triagem (peneira): Potencial / A revisar / Ruído */}
      <div>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <h2 className="text-h3 mb-1">Triagem das conversas</h2>
            <p className="text-sm text-muted-foreground">
              Peneira antes do funil. A IA classifica, prioriza e sugere o próximo passo — você corrige a classificação aqui.
            </p>
          </div>
          <div className="flex rounded-lg border p-0.5">
            <Button size="sm" variant={vista === "lista" ? "default" : "ghost"} className="h-7 gap-1 text-xs" onClick={() => setVista("lista")}>
              <List className="h-3.5 w-3.5" /> Lista
            </Button>
            <Button size="sm" variant={vista === "kanban" ? "default" : "ghost"} className="h-7 gap-1 text-xs" onClick={() => setVista("kanban")}>
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </Button>
          </div>
        </div>
        {vista === "lista" ? <WhatsAppTriagemLista /> : <WhatsAppTriagemKanban />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Coluna esquerda: gráficos */}
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Volume de contatos (últimos 30 dias)</h3>
            {g.isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={g.volumeDia}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                  <Tooltip />
                  <Bar dataKey="qtd" fill="#2563eb" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Contatos por canal</h3>
            {g.isLoading ? <Skeleton className="h-48 w-full" /> : canalData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados de canal ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, canalData.length * 34)}>
                <BarChart data={canalData} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} hide />
                  <YAxis type="category" dataKey="canal" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip />
                  <Bar dataKey="qtd" fill="#16a34a" radius={[0, 4, 4, 0]}>
                    {canalData.map((_, i) => <Cell key={i} fill={["#16a34a", "#2563eb", "#9333ea", "#d97706", "#0891b2", "#db2777", "#65a30d", "#475569"][i % 8]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Distribuição da triagem</h3>
            <div className="flex gap-3">
              {(["potencial", "pendente", "ruido"] as const).map((s) => (
                <div key={s} className="flex-1 rounded-lg border p-3 text-center">
                  <div className="text-xl font-semibold" style={{ color: STATUS_CORES[s] }}>{g.porStatus[s] || 0}</div>
                  <div className="text-xs text-muted-foreground capitalize mt-0.5">
                    {s === "pendente" ? "A revisar" : s}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Coluna direita: chat IA */}
        <WhatsAppChatIA />
      </div>
    </div>
  );
}
