import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";

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

export default function NotificationSettings() {
  const { preferences, isLoading, updatePreferences, resetToDefaults } =
    useNotificationPreferences();
  const [customEmail, setCustomEmail] = useState(preferences?.email_customizado || "");

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Preferências de Notificações</h1>
        <p className="text-muted-foreground mt-2">
          Configure como e quando você deseja receber notificações
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Tipos de Notificações</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Escolha os canais para cada tipo de notificação
              </p>
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
                        <p className="text-sm italic text-muted-foreground">
                          Exemplo: "{type.example}"
                        </p>
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
                      <Label
                        htmlFor={`${type.id}-inapp`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Bell className="h-4 w-4" />
                        <span className="text-sm">In-app (Sino)</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${type.id}-email`}
                        checked={preferences?.[emailKey] as boolean}
                        onCheckedChange={() => handleToggle(type.id, "email")}
                      />
                      <Label
                        htmlFor={`${type.id}-email`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Mail className="h-4 w-4" />
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
                <p className="text-sm text-muted-foreground">
                  Receba um resumo todas as manhãs com as visitas do dia
                </p>
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

      <Card className="p-6 bg-muted/30">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm">Sobre as Notificações</h3>
            <p className="text-sm text-muted-foreground mt-1">
              As notificações são criadas automaticamente pelo sistema com base em eventos
              importantes. Você pode gerenciar suas preferências a qualquer momento. Notificações
              in-app aparecem no sino no canto superior direito, enquanto notificações por e-mail
              são enviadas para o endereço configurado.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
