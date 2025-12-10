import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bell,
  Mail,
  DollarSign,
  Calendar,
  AlertTriangle,
  TrendingUp,
  FileText,
  Building,
  Clock,
  Send,
  Loader2,
  FileBarChart,
  BarChart3,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const notificationTypes = [
  {
    id: "financeiro",
    label: "Financeiro",
    description: "Vencimentos de parcelas (T-3 dias e T-24h)",
    icon: DollarSign,
    example: "Parcela de João Silva vence em 3 dias - R$ 5.000,00",
  },
  {
    id: "visita",
    label: "Visitas",
    description: "Lembretes de visitas agendadas (T-24h e resumo diário)",
    icon: Calendar,
    example: "Visita agendada com Maria Santos - Medição às 14:00",
  },
  {
    id: "visita_atrasada",
    label: "Visitas Atrasadas",
    description: "Notificação quando visita passa da data/hora sem conclusão",
    icon: AlertTriangle,
    example: "Visita com Pedro Costa - Orçamento está atrasada",
  },
  {
    id: "lead",
    label: "Leads",
    description: "Movimentações importantes no funil de vendas",
    icon: TrendingUp,
    example: "Lead movido para: Gerou Proposta",
  },
  {
    id: "proposta",
    label: "Propostas",
    description: "Status de propostas e vencimentos",
    icon: FileText,
    example: "Proposta #1234 expira em 2 dias",
  },
  {
    id: "contrato",
    label: "Contratos",
    description: "Início de contratos e marcos importantes",
    icon: FileText,
    example: "Contrato com Ana Lima inicia hoje",
  },
  {
    id: "obra",
    label: "Obras",
    description: "Conclusão e atualizações de obras",
    icon: Building,
    example: "Obra no Endereço XYZ foi concluída",
  },
];

const timezones = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
  { value: "America/Manaus", label: "Manaus (GMT-4)" },
  { value: "America/Belem", label: "Belém (GMT-3)" },
  { value: "America/Fortaleza", label: "Fortaleza (GMT-3)" },
  { value: "America/Recife", label: "Recife (GMT-3)" },
  { value: "America/Cuiaba", label: "Cuiabá (GMT-4)" },
  { value: "America/Porto_Velho", label: "Porto Velho (GMT-4)" },
  { value: "America/Rio_Branco", label: "Rio Branco (GMT-5)" },
];

const REPORT_INTERVAL_MINUTES = 15;

const reportTimes = Array.from({ length: (24 * 60) / REPORT_INTERVAL_MINUTES }, (_, i) => {
  const totalMinutes = i * REPORT_INTERVAL_MINUTES;
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const mm = String(totalMinutes % 60).padStart(2, "0");
  return { value: `${hh}:${mm}:00`, label: `${hh}:${mm}` };
});

const diasSemana = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

const diasMes = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: `Dia ${i + 1}`,
}));

export default function NotificationSettings() {
  const { preferences, isLoading, updatePreferences, resetToDefaults } = useNotificationPreferences();
  const [customEmail, setCustomEmail] = useState(preferences?.email_customizado || "");
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [isSendingManagementReport, setIsSendingManagementReport] = useState(false);

  useEffect(() => {
    if (preferences?.email_customizado) {
      setCustomEmail(preferences.email_customizado);
    }
  }, [preferences?.email_customizado]);

  const handleToggle = (type: string, channel: "inapp" | "email") => {
    const key = `${type}_${channel}` as keyof typeof preferences;
    updatePreferences({ [key]: !preferences?.[key] });
  };

  const handleSaveEmail = () => {
    updatePreferences({ email_customizado: customEmail || null });
  };

  const handleResumoToggle = () => {
    updatePreferences({ resumo_diario_visitas: !preferences?.resumo_diario_visitas });
  };

  const handleRelatorioDiarioToggle = () => {
    updatePreferences({ relatorio_diario_ativo: !preferences?.relatorio_diario_ativo });
  };

  const handleRelatorioHoraChange = (value: string) => {
    updatePreferences({ relatorio_diario_hora: value });
  };

  const handleRelatorioTimezoneChange = (value: string) => {
    updatePreferences({ relatorio_diario_timezone: value });
  };

  const handleRelatorioEmailToggle = () => {
    updatePreferences({ relatorio_diario_email: !preferences?.relatorio_diario_email });
  };

  const handleRelatorioInappToggle = () => {
    updatePreferences({ relatorio_diario_inapp: !preferences?.relatorio_diario_inapp });
  };

  const handleRelatorioPropostasAbertasToggle = () => {
    updatePreferences({ relatorio_propostas_abertas: !preferences?.relatorio_propostas_abertas });
  };

  const handleRelatorioPropostasRepousoToggle = () => {
    updatePreferences({ relatorio_propostas_repouso: !preferences?.relatorio_propostas_repouso });
  };

  const handleSendNow = async () => {
    try {
      setIsSendingReport(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const response = await supabase.functions.invoke("send-daily-report", {
        body: { userId: user.id, immediate: true },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (result.success) {
        toast.success(result.message || "Relatório enviado com sucesso!");
      } else {
        throw new Error(result.error || "Erro ao enviar relatório");
      }
    } catch (error: any) {
      console.error("Error sending report:", error);
      toast.error(error.message || "Erro ao enviar relatório");
    } finally {
      setIsSendingReport(false);
    }
  };

  // ========== Management Report Handlers ==========
  const handleGestaoToggle = () => {
    updatePreferences({ relatorio_gestao_ativo: !preferences?.relatorio_gestao_ativo });
  };

  const handleGestaoFrequenciaChange = (value: string) => {
    updatePreferences({ relatorio_gestao_frequencia: value });
  };

  const handleGestaoHoraChange = (value: string) => {
    updatePreferences({ relatorio_gestao_hora: value });
  };

  const handleGestaoDiaSemanaChange = (value: string) => {
    updatePreferences({ relatorio_gestao_dia_semana: parseInt(value) });
  };

  const handleGestaoDiaMesChange = (value: string) => {
    updatePreferences({ relatorio_gestao_dia_mes: parseInt(value) });
  };

  const handleGestaoEmailToggle = () => {
    updatePreferences({ relatorio_gestao_email: !preferences?.relatorio_gestao_email });
  };

  const handleGestaoInappToggle = () => {
    updatePreferences({ relatorio_gestao_inapp: !preferences?.relatorio_gestao_inapp });
  };

  const handleSendManagementReportNow = async () => {
    try {
      setIsSendingManagementReport(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const response = await supabase.functions.invoke("send-management-report", {
        body: { userId: user.id, immediate: true },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (result.success) {
        toast.success(result.message || "Relatório de gestão enviado com sucesso!");
      } else {
        throw new Error(result.error || "Erro ao enviar relatório de gestão");
      }
    } catch (error: any) {
      console.error("Error sending management report:", error);
      toast.error(error.message || "Erro ao enviar relatório de gestão");
    } finally {
      setIsSendingManagementReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Tipos de Notificações</h3>
              <p className="text-sm text-muted-foreground mt-1">Escolha os canais para cada tipo de notificação</p>
            </div>
            <Button variant="outline" onClick={() => resetToDefaults()}>
              Restaurar Padrão
            </Button>
          </div>

          <Separator />

          {/* Notification Types */}
          <div className="space-y-6">
            {notificationTypes.map((type) => {
              const IconComponent = type.icon;
              const inappKey = `${type.id}_inapp` as keyof typeof preferences;
              const emailKey = `${type.id}_email` as keyof typeof preferences;

              return (
                <div key={type.id} className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{type.label}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                      <div className="mt-2 p-3 bg-muted/50 rounded-md border border-border/50">
                        <p className="text-sm italic text-muted-foreground">Exemplo: "{type.example}"</p>
                      </div>
                    </div>
                  </div>

                  <div className="pl-13 flex items-center gap-8">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${type.id}-inapp`}
                        checked={preferences?.[inappKey] as boolean}
                        onCheckedChange={() => handleToggle(type.id, "inapp")}
                      />
                      <Label htmlFor={`${type.id}-inapp`} className="flex items-center gap-2 cursor-pointer">
                        <Bell className="h-5 w-5" />
                        <span className="text-sm">In-app (Sino)</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${type.id}-email`}
                        checked={preferences?.[emailKey] as boolean}
                        onCheckedChange={() => handleToggle(type.id, "email")}
                      />
                      <Label htmlFor={`${type.id}-email`} className="flex items-center gap-2 cursor-pointer">
                        <Mail className="h-5 w-5" />
                        <span className="text-sm">E-mail</span>
                      </Label>
                    </div>
                  </div>

                  <Separator />
                </div>
              );
            })}
          </div>

          {/* Daily Summary Settings */}
          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Resumo Diário de Visitas</h3>
                <p className="text-sm text-muted-foreground">Receba um resumo todas as manhãs com as visitas do dia</p>
              </div>
            </div>

            <div className="pl-13 flex items-center space-x-2">
              <Switch
                id="resumo-diario"
                checked={preferences?.resumo_diario_visitas}
                onCheckedChange={handleResumoToggle}
              />
              <Label htmlFor="resumo-diario" className="cursor-pointer">
                Ativar resumo diário às {preferences?.resumo_diario_hora || "08:00"}
              </Label>
            </div>
          </div>

          <Separator />

          {/* Custom Email */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">E-mail Customizado</h3>
              <p className="text-sm text-muted-foreground">
                Por padrão, notificações por e-mail são enviadas para o e-mail da sua conta
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="max-w-md"
              />
              <Button onClick={handleSaveEmail}>Salvar E-mail</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Daily Report Section */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
              <FileBarChart className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Relatório Diário</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Receba um resumo diário das suas propostas por e-mail
              </p>
            </div>
          </div>

          <Separator />

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="relatorio-ativo" className="text-base font-medium">
                Ativar Relatório Diário
              </Label>
              <p className="text-sm text-muted-foreground">Envio automático no horário configurado</p>
            </div>
            <Switch
              id="relatorio-ativo"
              checked={preferences?.relatorio_diario_ativo}
              onCheckedChange={handleRelatorioDiarioToggle}
            />
          </div>

          <Separator />

          {/* Time and Timezone Selection */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário de Envio</Label>
                <Select
                  value={preferences?.relatorio_diario_hora || "08:00:00"}
                  onValueChange={handleRelatorioHoraChange}
                  disabled={!preferences?.relatorio_diario_ativo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTimes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fuso Horário</Label>
                <Select
                  value={preferences?.relatorio_diario_timezone || "America/Sao_Paulo"}
                  onValueChange={handleRelatorioTimezoneChange}
                  disabled={!preferences?.relatorio_diario_ativo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fuso horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Channels */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Canais de Entrega</Label>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="relatorio-email"
                  checked={preferences?.relatorio_diario_email}
                  onCheckedChange={handleRelatorioEmailToggle}
                  disabled={!preferences?.relatorio_diario_ativo}
                />
                <Label htmlFor="relatorio-email" className="flex items-center gap-2 cursor-pointer">
                  <Mail className="h-5 w-5" />
                  <span>E-mail</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="relatorio-inapp"
                  checked={preferences?.relatorio_diario_inapp}
                  onCheckedChange={handleRelatorioInappToggle}
                  disabled={!preferences?.relatorio_diario_ativo}
                />
                <Label
                  htmlFor="relatorio-inapp"
                  className="flex items-center gap-2 cursor-pointer text-muted-foreground"
                >
                  <Bell className="h-5 w-5" />
                  <span>In-app (em breve)</span>
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Report Contents */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Conteúdo do Relatório</Label>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                <Checkbox
                  id="propostas-abertas"
                  checked={preferences?.relatorio_propostas_abertas}
                  onCheckedChange={handleRelatorioPropostasAbertasToggle}
                  disabled={!preferences?.relatorio_diario_ativo}
                  className="mt-0.5 h-6 w-6"
                />
                <div className="space-y-1">
                  <Label htmlFor="propostas-abertas" className="cursor-pointer font-medium">
                    Propostas em Aberto
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Lista com cliente, m², valor total e margem líquida de cada proposta aberta
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                <Checkbox
                  id="propostas-repouso"
                  checked={preferences?.relatorio_propostas_repouso}
                  onCheckedChange={handleRelatorioPropostasRepousoToggle}
                  disabled={!preferences?.relatorio_diario_ativo}
                  className="mt-0.5 h-6 w-6"
                />
                <div className="space-y-1">
                  <Label htmlFor="propostas-repouso" className="cursor-pointer font-medium">
                    Propostas em Repouso
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Lista com cliente, m², valor total e margem líquida de propostas em repouso
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSendNow}
              disabled={isSendingReport || !preferences?.relatorio_diario_email}
              className="gap-2"
            >
              {isSendingReport ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Enviar Agora
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground self-center">
              Dispara o relatório imediatamente com as configurações atuais
            </p>
          </div>

          {preferences?.relatorio_ultimo_envio && (
            <p className="text-xs text-muted-foreground">
              Último envio: {new Date(preferences.relatorio_ultimo_envio).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      </Card>

      {/* Management Report Section */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mt-1">
              <BarChart3 className="h-5 w-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Relatório de Gestão (Overview)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Resumo automático de leads, propostas, obras, financeiro e regiões
              </p>
            </div>
          </div>

          <Separator />

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="gestao-ativo" className="text-base font-medium">
                Ativar Relatório de Gestão
              </Label>
              <p className="text-sm text-muted-foreground">Envio automático conforme frequência configurada</p>
            </div>
            <Switch
              id="gestao-ativo"
              checked={preferences?.relatorio_gestao_ativo}
              onCheckedChange={handleGestaoToggle}
            />
          </div>

          <Separator />

          {/* Frequency Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Frequência de Envio</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select
                  value={preferences?.relatorio_gestao_frequencia || "diaria"}
                  onValueChange={handleGestaoFrequenciaChange}
                  disabled={!preferences?.relatorio_gestao_ativo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diaria">Diária</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Horário de Envio</Label>
                <Select
                  value={preferences?.relatorio_gestao_hora || "08:00:00"}
                  onValueChange={handleGestaoHoraChange}
                  disabled={!preferences?.relatorio_gestao_ativo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTimes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {preferences?.relatorio_gestao_frequencia === "semanal" && (
                <div className="space-y-2">
                  <Label>Dia da Semana</Label>
                  <Select
                    value={String(preferences?.relatorio_gestao_dia_semana ?? 1)}
                    onValueChange={handleGestaoDiaSemanaChange}
                    disabled={!preferences?.relatorio_gestao_ativo}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {diasSemana.map((dia) => (
                        <SelectItem key={dia.value} value={String(dia.value)}>
                          {dia.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {preferences?.relatorio_gestao_frequencia === "mensal" && (
                <div className="space-y-2">
                  <Label>Dia do Mês</Label>
                  <Select
                    value={String(preferences?.relatorio_gestao_dia_mes ?? 1)}
                    onValueChange={handleGestaoDiaMesChange}
                    disabled={!preferences?.relatorio_gestao_ativo}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {diasMes.map((dia) => (
                        <SelectItem key={dia.value} value={String(dia.value)}>
                          {dia.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Channels */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Canais de Entrega</Label>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="gestao-email"
                  checked={preferences?.relatorio_gestao_email}
                  onCheckedChange={handleGestaoEmailToggle}
                  disabled={!preferences?.relatorio_gestao_ativo}
                />
                <Label htmlFor="gestao-email" className="flex items-center gap-2 cursor-pointer">
                  <Mail className="h-5 w-5" />
                  <span>E-mail</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="gestao-inapp"
                  checked={preferences?.relatorio_gestao_inapp}
                  onCheckedChange={handleGestaoInappToggle}
                  disabled={!preferences?.relatorio_gestao_ativo}
                />
                <Label
                  htmlFor="gestao-inapp"
                  className="flex items-center gap-2 cursor-pointer text-muted-foreground"
                >
                  <Bell className="h-5 w-5" />
                  <span>In-app (em breve)</span>
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Report Content Description */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Conteúdo do Relatório</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm">Leads</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sem movimentação 24h/72h, novos no período
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-sm">Propostas</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Abertas, fechadas, perdidas, em repouso
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-sm">Obras</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ativas, paradas, sem fotos/registros
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium text-sm">Financeiro</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Parcelas vencidas/a vencer, contratos ativos
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-sm">Tarefas & Metas</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Vencidas, atrasadas, atingidas no período
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  <span className="font-medium text-sm">Geográfico</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Propostas por região, taxa de conversão
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSendManagementReportNow}
              disabled={isSendingManagementReport || !preferences?.relatorio_gestao_email}
              className="gap-2"
              variant="default"
            >
              {isSendingManagementReport ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Enviar Agora
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground self-center">
              Dispara o relatório de gestão imediatamente
            </p>
          </div>

          {preferences?.relatorio_gestao_ultimo_envio && (
            <p className="text-xs text-muted-foreground">
              Último envio: {new Date(preferences.relatorio_gestao_ultimo_envio).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      </Card>

      <Card className="p-6 bg-muted/30">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm">Sobre as Notificações</h3>
            <p className="text-sm text-muted-foreground mt-1">
              As notificações são criadas automaticamente pelo sistema com base em eventos importantes. Você pode
              gerenciar suas preferências a qualquer momento. Notificações in-app aparecem no sino no canto superior
              direito, enquanto notificações por e-mail são enviadas para o endereço configurado.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
