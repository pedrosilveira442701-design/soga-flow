import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, UserPlus, FileSignature, TrendingUp, DollarSign, Target, Percent } from "lucide-react";

const kpiData = [
  {
    title: "Propostas Totais",
    value: "42",
    subtitle: "12 abertas · 30 fechadas",
    icon: FileText,
    trend: "+12%",
    color: "text-primary",
  },
  {
    title: "Receita Prevista (30d)",
    value: "R$ 125.400",
    subtitle: "Próximos 30 dias",
    icon: DollarSign,
    trend: "+8%",
    color: "text-success",
  },
  {
    title: "Taxa de Conversão",
    value: "68%",
    subtitle: "Este mês",
    icon: Target,
    trend: "+5%",
    color: "text-accent",
  },
  {
    title: "Ticket Médio",
    value: "R$ 8.450",
    subtitle: "Fechados no mês",
    icon: TrendingUp,
    trend: "+15%",
    color: "text-warning",
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do seu negócio
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
          <Button size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Nova Proposta
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {kpi.subtitle}
                  </p>
                  <span className="text-xs font-medium text-success">
                    {kpi.trend}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline Chart Placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pipeline de Vendas</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Semana</Button>
              <Button variant="outline" size="sm">Mês</Button>
              <Button variant="outline" size="sm">Ano</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-border rounded-lg">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Gráfico de pipeline será implementado
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5 text-primary" />
              Novo Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Cadastre um novo cliente no sistema
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-accent" />
              Nova Proposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Crie uma nova proposta comercial
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSignature className="h-5 w-5 text-success" />
              Novo Contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Registre um novo contrato fechado
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
