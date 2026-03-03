import { useState } from "react";
import { useRecebiveis } from "@/hooks/useRecebiveis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Wand2, CheckCircle, Trash2, Edit, AlertTriangle, DollarSign } from "lucide-react";
import { format, parseISO, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface RecebiveisManagerProps {
  contratoId: string;
  margemTotal: number;
}

export function RecebiveisManager({ contratoId, margemTotal }: RecebiveisManagerProps) {
  const {
    recebiveis,
    isLoading,
    addRecebivel,
    updateRecebivel,
    marcarRecebido,
    deleteRecebivel,
    bulkAddRecebiveis,
  } = useRecebiveis(contratoId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState("");
  const [editVencimento, setEditVencimento] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newValor, setNewValor] = useState("");
  const [newVencimento, setNewVencimento] = useState("");
  const [gerarQtd, setGerarQtd] = useState("2");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const totalRecebiveis = recebiveis.reduce((s, r) => s + r.valor, 0);
  const totalRecebido = recebiveis.filter((r) => r.status === "recebido").reduce((s, r) => s + r.valor, 0);
  const totalPendente = totalRecebiveis - totalRecebido;
  const diff = Math.abs(totalRecebiveis - margemTotal);
  const hasDiff = diff > 0.01 && recebiveis.length > 0;

  const handleAdd = async () => {
    const valor = parseFloat(newValor);
    if (!valor || !newVencimento) return;
    await addRecebivel({ valor, vencimento: newVencimento });
    setNewValor("");
    setNewVencimento("");
    setShowAdd(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const updates: any = {};
    if (editValor) updates.valor = parseFloat(editValor);
    if (editVencimento) updates.vencimento = editVencimento;
    await updateRecebivel({ id: editingId, data: updates });
    setEditingId(null);
  };

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setEditValor(String(r.valor));
    setEditVencimento(r.vencimento);
  };

  const handleGerar = async () => {
    const qtd = parseInt(gerarQtd);
    if (!qtd || qtd < 1 || margemTotal <= 0) return;

    const valorParcela = Math.floor((margemTotal / qtd) * 100) / 100;
    const resto = Math.round((margemTotal - valorParcela * qtd) * 100) / 100;
    const hoje = new Date();

    const items = Array.from({ length: qtd }, (_, i) => ({
      numero: i + 1,
      valor: i === qtd - 1 ? valorParcela + resto : valorParcela,
      vencimento: addMonths(hoje, i + 1).toISOString().split("T")[0],
    }));

    await bulkAddRecebiveis(items);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Recebíveis da Margem
        </h3>
        <div className="flex gap-2">
          {recebiveis.length === 0 && margemTotal > 0 && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="24"
                value={gerarQtd}
                onChange={(e) => setGerarQtd(e.target.value)}
                className="w-16 h-9"
                placeholder="Qtd"
              />
              <Button variant="outline" size="sm" onClick={handleGerar}>
                <Wand2 className="h-4 w-4 mr-1" />
                Gerar automático
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </div>

      {margemTotal <= 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Margem não definida neste contrato. Defina uma margem percentual para usar os recebíveis.
          </AlertDescription>
        </Alert>
      )}

      {showAdd && (
        <div className="flex items-end gap-3 p-3 rounded-lg border bg-muted/30">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Valor (R$)</label>
            <Input
              type="number"
              step="0.01"
              value={newValor}
              onChange={(e) => setNewValor(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Vencimento</label>
            <Input type="date" value={newVencimento} onChange={(e) => setNewVencimento(e.target.value)} />
          </div>
          <Button size="sm" onClick={handleAdd}>
            Salvar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
            Cancelar
          </Button>
        </div>
      )}

      {recebiveis.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Nº</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Recebimento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recebiveis.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.numero}</TableCell>
                  <TableCell>
                    {editingId === r.id ? (
                      <Input
                        type="date"
                        value={editVencimento}
                        onChange={(e) => setEditVencimento(e.target.value)}
                        className="w-40 h-8"
                      />
                    ) : (
                      format(parseISO(r.vencimento), "dd/MM/yyyy", { locale: ptBR })
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === r.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editValor}
                        onChange={(e) => setEditValor(e.target.value)}
                        className="w-32 h-8"
                      />
                    ) : (
                      formatCurrency(r.valor)
                    )}
                  </TableCell>
                  <TableCell>
                    {r.status === "recebido" ? (
                      <Badge className="bg-green-500">Recebido</Badge>
                    ) : (
                      <Badge variant="secondary">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.data_recebimento
                      ? format(parseISO(r.data_recebimento), "dd/MM/yyyy", { locale: ptBR })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {editingId === r.id ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                            Salvar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          {r.status === "pendente" && (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(r)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600"
                                onClick={() => marcarRecebido({ id: r.id })}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir recebível</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deseja excluir o recebível #{r.numero}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteRecebivel(r.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer totalizador */}
      {recebiveis.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Recebíveis</p>
            <p className="text-lg font-bold">{formatCurrency(totalRecebiveis)}</p>
          </div>
          <div className="rounded-lg border p-3 bg-green-50 dark:bg-green-950/20">
            <p className="text-xs text-muted-foreground">Total Recebido</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalRecebido)}</p>
          </div>
          <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-950/20">
            <p className="text-xs text-muted-foreground">Pendente</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totalPendente)}</p>
          </div>
        </div>
      )}

      {hasDiff && (
        <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            A soma dos recebíveis ({formatCurrency(totalRecebiveis)}) difere da margem total (
            {formatCurrency(margemTotal)}). Diferença: {formatCurrency(diff)}.
          </AlertDescription>
        </Alert>
      )}

      {recebiveis.length === 0 && margemTotal > 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum recebível cadastrado. Use "Gerar automático" ou adicione manualmente.
        </p>
      )}
    </div>
  );
}
