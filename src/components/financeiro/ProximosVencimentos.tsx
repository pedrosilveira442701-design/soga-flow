import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle } from "lucide-react";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ProximosVencimentos() {
  const { parcelas, isLoading } = useFinanceiro();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Próximas 5 parcelas a vencer (pendentes ou atrasadas)
  const proximas = parcelas
    .filter((p) => p.status === "pendente" || p.status === "atrasado")
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5" />
            Próximos Vencimentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (proximas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5" />
            Próximos Vencimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma parcela pendente
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-5 w-5" />
          Próximos Vencimentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {proximas.map((parcela) => {
          const isAtrasado = parcela.status === "atrasado";
          const vencimento = new Date(parcela.vencimento + "T00:00:00");

          return (
            <div
              key={parcela.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isAtrasado
                  ? "bg-destructive/10 border-destructive/30"
                  : "bg-muted/50"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">
                    {parcela.contrato?.cliente?.nome || "Cliente"}
                  </p>
                  {isAtrasado && (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Parcela {parcela.numero_parcela} •{" "}
                  {format(vencimento, "dd/MMM", { locale: ptBR })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">
                  {formatCurrency(Number(parcela.valor_liquido_parcela))}
                </p>
                <Badge
                  variant={isAtrasado ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {isAtrasado ? "Atrasado" : "Pendente"}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
