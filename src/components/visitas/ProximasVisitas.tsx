import { Calendar, MapPin, User, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVisitas } from "@/hooks/useVisitas";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export function ProximasVisitas() {
  const { visitas, isLoading } = useVisitas({ realizada: "pendentes" });

  const proximasVisitas = visitas
    .filter((v) => v.data)
    .sort((a, b) => {
      if (!a.data || !b.data) return 0;
      return new Date(a.data).getTime() - new Date(b.data).getTime();
    })
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Próximas Visitas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (proximasVisitas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Próximas Visitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma visita agendada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Próximas Visitas
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <a href="/visitas">
            Ver todas
            <ExternalLink className="h-5 w-5 ml-2" />
          </a>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {proximasVisitas.map((visita) => {
          const dataVisita = visita.data ? parseISO(visita.data) : null;
          const ehHoje = dataVisita && isToday(dataVisita);
          const ehAmanha = dataVisita && isTomorrow(dataVisita);

          return (
            <a
              key={visita.id}
              href="/visitas"
              className="block p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-1">{visita.assunto}</h4>
                  {visita.clientes && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{visita.clientes.nome}</p>
                  )}
                </div>
                {ehHoje && <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-xs">HOJE</Badge>}
                {ehAmanha && (
                  <Badge className="bg-green-500/10 text-green-700 border-green-500/20 text-xs">AMANHÃ</Badge>
                )}
              </div>

              <div className="space-y-1">
                {dataVisita && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(dataVisita, "dd 'de' MMMM", { locale: ptBR })}
                      {visita.hora && ` às ${visita.hora.slice(0, 5)}`}
                    </span>
                  </div>
                )}

                {visita.endereco && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="line-clamp-1">{visita.endereco}</span>
                  </div>
                )}

                {visita.responsavel && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{visita.responsavel}</span>
                  </div>
                )}
              </div>
            </a>
          );
        })}
      </CardContent>
    </Card>
  );
}
