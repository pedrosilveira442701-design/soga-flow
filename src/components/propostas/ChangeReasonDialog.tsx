import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROPOSAL_CHANGE_REASONS,
  PROPOSAL_CHANGE_REASON_OPTIONS,
  ProposalChangeReason,
} from "@/lib/proposalVersioning";
import { GitBranch } from "lucide-react";

interface ChangeReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: ProposalChangeReason, detail?: string) => void;
  versionNumber: number;
  isLoading?: boolean;
}

export default function ChangeReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  versionNumber,
  isLoading,
}: ChangeReasonDialogProps) {
  const [reason, setReason] = useState<ProposalChangeReason | "">("");
  const [detail, setDetail] = useState("");

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm(reason, detail || undefined);
    // Reset form
    setReason("");
    setDetail("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
      setDetail("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Criar Nova Versão (V{versionNumber})
          </DialogTitle>
          <DialogDescription>
            Informe o motivo da alteração para manter o histórico da proposta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Mudança *</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as ProposalChangeReason)}
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {PROPOSAL_CHANGE_REASON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="detail">Detalhes (opcional)</Label>
            <Textarea
              id="detail"
              placeholder="Descreva os detalhes da mudança..."
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason || isLoading}
          >
            {isLoading ? "Criando..." : `Criar V${versionNumber}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
