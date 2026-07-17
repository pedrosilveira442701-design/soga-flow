import { Meta } from "@/hooks/useMetas";
import { ContribuicaoGrupo, useMetaContribuicoes } from "@/hooks/useMetaContribuicoes";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListTree } from "lucide-react";
import { format } from "date-fns";

interface MetaContribuicoesProps {
  meta: Meta;
}

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function GrupoTabela({ grupo, mostrarLabel }: { grupo: ContribuicaoGrupo; mostrarLabel: boolean }) {
  const temValor = grupo.itens.some((i) => i.valor !== null);
  const total = grupo.itens.reduce((sum, i) => sum + (i.valor ?? 0), 0);

  return (
    <div className="space-y-2">
      {mostrarLabel && (
        <div className="text-sm font-medium text-muted-foreground">{grupo.label}</div>
      )}

      {grupo.itens.length === 0 ? (
        <div className="text-sm text-muted-foreground border rounded-lg p-4 text-center">
          Nenhum registro no período desta meta.
        </div>
      ) : (
        <div className="border rounded-lg max-h-72 overflow-y-auto">
          <Table className="min-w-[420px]">
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Cliente</TableHead>
                {temValor && <TableHead className="text-right">Valor</TableHead>}
                <TableHead className="text-right w-28">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupo.itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.cliente}</TableCell>
                  {temValor && (
                    <TableCell className="text-right tabular-nums">
                      {formatarMoeda(item.valor ?? 0)}
                    </TableCell>
                  )}
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {format(new Date(item.data), "dd/MM/yy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="sticky bottom-0">
              <TableRow>
                <TableCell className="font-medium">
                  {grupo.itens.length} {grupo.itens.length === 1 ? "registro" : "registros"}
                </TableCell>
                {temValor && (
                  <TableCell className="text-right font-bold tabular-nums">
                    {formatarMoeda(total)}
                  </TableCell>
                )}
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  );
}

export function MetaContribuicoes({ meta }: MetaContribuicoesProps) {
  const { data, isLoading, error } = useMetaContribuicoes(meta);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ListTree className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Registros que compõem o progresso</h3>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 dark:text-red-500 border border-red-500/20 bg-red-500/10 rounded-lg p-4">
          Não foi possível carregar os registros de origem.
        </div>
      )}

      {data && !data.suportado && (
        <div className="text-sm text-muted-foreground border rounded-lg p-4">
          O progresso desta meta é lançado manualmente — não há registros de origem para listar.
        </div>
      )}

      {data?.suportado &&
        data.grupos.map((grupo) => (
          <GrupoTabela key={grupo.label} grupo={grupo} mostrarLabel={data.grupos.length > 1} />
        ))}
    </div>
  );
}
