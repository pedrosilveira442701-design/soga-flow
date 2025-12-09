import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Contato } from "@/hooks/useContatos";

interface ContatosNaoConvertidosProps {
  contatos: Contato[];
  onConvertToLead: (contato: Contato) => void;
}

export function ContatosNaoConvertidos({ contatos, onConvertToLead }: ContatosNaoConvertidosProps) {
  if (contatos.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contatos Não Convertidos</CardTitle>
        <CardDescription>
          {contatos.length} {contatos.length === 1 ? "contato aguardando" : "contatos aguardando"} qualificação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {contatos.slice(0, 5).map((contato) => (
            <div
              key={contato.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{contato.telefone}</span>
                  <Badge variant="secondary" className="text-xs">
                    {contato.origem}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(contato.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onConvertToLead(contato)}
                className="gap-2"
              >
                Criar Lead
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {contatos.length > 5 && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              + {contatos.length - 5} contatos não exibidos
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
