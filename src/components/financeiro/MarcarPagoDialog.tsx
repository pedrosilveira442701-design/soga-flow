import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle } from "lucide-react";

interface MarcarPagoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelasSelecionadas: number;
  onConfirm: (dataPagamento: string, forma: string) => void;
}

export function MarcarPagoDialog({
  open,
  onOpenChange,
  parcelasSelecionadas,
  onConfirm,
}: MarcarPagoDialogProps) {
  const hoje = new Date().toISOString().split("T")[0];
  const [dataPagamento, setDataPagamento] = useState(hoje);
  const [forma, setForma] = useState("");

  const handleConfirm = () => {
    if (!forma) return;
    onConfirm(dataPagamento, forma);
    onOpenChange(false);
    setForma("");
    setDataPagamento(hoje);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Marcar como Pago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Você está marcando <strong>{parcelasSelecionadas}</strong> parcela
            {parcelasSelecionadas > 1 ? "s" : ""} como paga{parcelasSelecionadas > 1 ? "s" : ""}.
          </p>

          <div className="space-y-2">
            <Label htmlFor="data-pagamento">Data do Pagamento</Label>
            <Input
              id="data-pagamento"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              max={hoje}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="forma-pagamento">Forma de Pagamento *</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a forma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!forma}>
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
