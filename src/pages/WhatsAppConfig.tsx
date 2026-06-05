import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, RefreshCw, Smartphone, Loader2, Power, CheckCircle2, QrCode } from "lucide-react";

interface StatusResp {
  status: "conectado" | "conectando" | "desconectado";
  qr?: string | null;
  pairingCode?: string | null;
  numero?: string | null;
  error?: string;
}

const STATUS_UI = {
  conectado: { label: "Conectado", cls: "bg-green-500/15 text-green-600 border-green-500/30" },
  conectando: { label: "Aguardando leitura do QR", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  desconectado: { label: "Desconectado", cls: "bg-red-500/15 text-red-600 border-red-500/30" },
} as const;

export default function WhatsAppConfig() {
  const [data, setData] = useState<StatusResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async (action: "status" | "qr" = "status") => {
    try {
      const { data: resp, error } = await supabase.functions.invoke("whatsapp-status", {
        body: { action },
      });
      if (error) throw error;
      setData(resp as StatusResp);
    } catch (e) {
      setData({ status: "desconectado", error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling: a cada 15s enquanto não estiver conectado, para o QR atualizar e detectar a conexão.
  useEffect(() => {
    fetchStatus("status");
    timer.current = setInterval(() => fetchStatus("status"), 15000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [fetchStatus]);

  const handleNovoQr = async () => {
    setActing(true);
    await fetchStatus("qr");
    setActing(false);
    toast.success("QR atualizado");
  };

  const handleDesconectar = async () => {
    setActing(true);
    try {
      const { error } = await supabase.functions.invoke("whatsapp-status", { body: { action: "logout" } });
      if (error) throw error;
      toast.success("WhatsApp desconectado");
      await fetchStatus("qr");
    } catch (e) {
      toast.error("Erro ao desconectar", { description: (e as Error).message });
    } finally {
      setActing(false);
    }
  };

  const status = data?.status ?? "desconectado";
  const ui = STATUS_UI[status];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-h1 flex items-center gap-3">
          <MessageSquare className="page-icon" /> WhatsApp
        </h1>
        <p className="text-body text-caption mt-1.5">
          Conecte o WhatsApp do negócio para capturar leads automaticamente no funil.
        </p>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status da conexão</span>
          {loading ? (
            <Skeleton className="h-6 w-32" />
          ) : (
            <Badge variant="outline" className={`gap-1.5 ${ui.cls}`}>
              <span className="h-2 w-2 rounded-full bg-current" /> {ui.label}
            </Badge>
          )}
        </div>

        {/* Conectado */}
        {status === "conectado" && (
          <div className="rounded-lg border bg-green-500/5 p-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
            <div>
              <p className="font-medium">WhatsApp conectado</p>
              {data?.numero && (
                <p className="text-sm text-caption flex items-center justify-center gap-1.5 mt-1">
                  <Smartphone className="h-3.5 w-3.5" /> {data.numero}
                </p>
              )}
              <p className="text-sm text-caption mt-2">
                Toda nova conversa entra na fila de <strong>Triagem WhatsApp</strong> em Leads.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDesconectar} disabled={acting} className="gap-1.5">
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              Desconectar
            </Button>
          </div>
        )}

        {/* Não conectado: QR */}
        {status !== "conectado" && (
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex flex-col items-center gap-3">
              {loading ? (
                <Skeleton className="h-56 w-56" />
              ) : data?.qr ? (
                <img
                  src={data.qr}
                  alt="QR Code do WhatsApp"
                  className="h-56 w-56 rounded-lg border bg-white p-2"
                />
              ) : (
                <div className="h-56 w-56 rounded-lg border flex flex-col items-center justify-center gap-2 text-caption">
                  <QrCode className="h-10 w-10" />
                  <span className="text-sm">Gerando QR…</span>
                </div>
              )}
            </div>

            <div className="text-sm text-caption space-y-1.5">
              <p className="font-medium text-foreground">Como conectar:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Abra o <strong>WhatsApp do negócio</strong> no celular</li>
                <li>Toque em <strong>Configurações → Aparelhos conectados</strong></li>
                <li>Toque em <strong>Conectar um aparelho</strong> e aponte para o QR acima</li>
              </ol>
              <p className="text-xs pt-1">O QR expira rápido — se não funcionar, gere um novo.</p>
            </div>

            <Button onClick={handleNovoQr} disabled={acting} className="w-full gap-1.5">
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Gerar novo QR
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
