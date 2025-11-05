import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DragDropUpload } from "@/components/upload/DragDropUpload";
import { Progress } from "@/components/ui/progress";
import { useArquivos } from "@/hooks/useArquivos";
import { useClientes } from "@/hooks/useClientes";
import { useContratos } from "@/hooks/useContratos";
import { usePropostas } from "@/hooks/usePropostas";
import { useLeads } from "@/hooks/useLeads";
import { useVisitas } from "@/hooks/useVisitas";
import { TIPOS_ARQUIVO, ENTIDADES, MAX_FILES_PER_UPLOAD, getFileSizeWarning } from "@/lib/fileUtils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Check, Upload, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type LeadWithClient = any; // Tipo simplificado para evitar erros de tipo
type VisitaWithClient = any;

interface ArquivoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEntidade?: string;
  defaultEntidadeId?: string;
}

interface FileWithMetadata {
  file: File;
  nome: string;
  entidade: string;
  entidade_id: string;
  tipo: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export function ArquivoUploadDialog({
  open,
  onOpenChange,
  defaultEntidade,
  defaultEntidadeId,
}: ArquivoUploadDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([]);
  const { uploadArquivo } = useArquivos();

  const { clientes } = useClientes();
  const { contratos } = useContratos();
  const { propostas } = usePropostas();
  const { leads } = useLeads();
  const { visitas } = useVisitas();

  const handleFilesSelected = (files: File[]) => {
    if (files.length > MAX_FILES_PER_UPLOAD) {
      return;
    }

    const filesWithMetadata: FileWithMetadata[] = files.map((file) => ({
      file,
      nome: file.name,
      entidade: defaultEntidade || "",
      entidade_id: defaultEntidadeId || "",
      tipo: "",
      status: "pending",
      progress: 0,
    }));

    setSelectedFiles(filesWithMetadata);
    setStep(2);
  };

  const updateFileMetadata = (
    index: number,
    updates: Partial<FileWithMetadata>
  ) => {
    setSelectedFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  const canProceedToUpload = selectedFiles.every(
    (f) => f.entidade && f.entidade_id && f.tipo
  );

  const handleStartUpload = async () => {
    setStep(3);

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      updateFileMetadata(i, { status: "uploading", progress: 0 });

      try {
        await uploadArquivo.mutateAsync({
          file: file.file,
          entidade: file.entidade,
          entidade_id: file.entidade_id,
          tipo: file.tipo,
          nome: file.nome,
        });

        updateFileMetadata(i, { status: "success", progress: 100 });
      } catch (error: any) {
        updateFileMetadata(i, {
          status: "error",
          error: error.message,
          progress: 0,
        });
      }
    }

    setStep(4);
  };

  const handleClose = () => {
    setStep(1);
    setSelectedFiles([]);
    onOpenChange(false);
  };

  const getEntidadeOptions = (entidade: string) => {
    switch (entidade) {
      case "cliente":
        return clientes?.map((c) => ({ value: c.id, label: c.nome })) || [];
      case "contrato":
        return (
          contratos?.map((c) => ({
            value: c.id,
            label: `Contrato ${c.cpf_cnpj}`,
          })) || []
        );
      case "proposta":
        return (
          propostas?.map((p) => ({
            value: p.id,
            label: `Proposta ${(p as any).clientes?.nome || p.id.slice(0, 8)}`,
          })) || []
        );
      case "lead":
        return (
          leads?.map((l) => ({
            value: l.id,
            label: (l as any).clientes?.nome || `Lead ${l.id.slice(0, 8)}`,
          })) || []
        );
      case "visita":
        return (
          visitas?.map((v) => ({
            value: v.id,
            label: `${v.assunto} - ${(v as any).clientes?.nome || ''}`,
          })) || []
        );
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload de Arquivos</DialogTitle>
          <DialogDescription>
            {step === 1 && "Selecione os arquivos para enviar"}
            {step === 2 && "Configure os metadados de cada arquivo"}
            {step === 3 && "Enviando arquivos..."}
            {step === 4 && "Upload concluído!"}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Seleção de Arquivos */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DragDropUpload
                onUpload={handleFilesSelected}
                maxFiles={MAX_FILES_PER_UPLOAD}
              />
            </motion.div>
          )}

          {/* Step 2: Metadados */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {selectedFiles.map((file, index) => {
                const sizeWarning = getFileSizeWarning(file.file.size);
                return (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{file.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setSelectedFiles((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {sizeWarning && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Arquivo Grande</AlertTitle>
                      <AlertDescription>{sizeWarning}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Entidade</Label>
                      <Select
                        value={file.entidade}
                        onValueChange={(value) =>
                          updateFileMetadata(index, {
                            entidade: value,
                            entidade_id: "",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTIDADES.map((e) => (
                            <SelectItem key={e.value} value={e.value}>
                              {e.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Vincular a</Label>
                      <Select
                        value={file.entidade_id}
                        onValueChange={(value) =>
                          updateFileMetadata(index, { entidade_id: value })
                        }
                        disabled={!file.entidade}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getEntidadeOptions(file.entidade).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={file.tipo}
                        onValueChange={(value) =>
                          updateFileMetadata(index, { tipo: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_ARQUIVO.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nome do arquivo</Label>
                      <Input
                        value={file.nome}
                        onChange={(e) =>
                          updateFileMetadata(index, { nome: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                );
              })}

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button
                  onClick={handleStartUpload}
                  disabled={!canProceedToUpload}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar {selectedFiles.length} arquivo(s)
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Upload Progress */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {selectedFiles.map((file, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{file.nome}</p>
                    {file.status === "success" && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {file.status === "error" && (
                      <X className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <Progress value={file.progress} />
                  {file.error && (
                    <p className="text-sm text-destructive">{file.error}</p>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* Step 4: Confirmação */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center space-y-4"
            >
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Upload Concluído!</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedFiles.filter((f) => f.status === "success").length}{" "}
                  arquivo(s) enviado(s) com sucesso
                </p>
              </div>
              <Button onClick={handleClose}>Fechar</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
