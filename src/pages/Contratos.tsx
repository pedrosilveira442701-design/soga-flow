import { useState, useMemo } from "react";
import { useContratos } from "@/hooks/useContratos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Trash2,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertCircle,
  X,
  Pencil,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Contrato } from "@/hooks/useContratos";
import { ContratoForm } from "@/components/forms/ContratoForm";
import { ContratoDetailsDialog } from "@/components/contratos/ContratoDetailsDialog";
import { Progress } from "@/components/ui/progress";
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

export default function Contratos() {
  const { contratos, isLoading, createContrato, updateContrato, deleteContrato } = useContratos();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateFromPropostaDialog, setShowCreateFromPropostaDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formaPagamentoFilter, setFormaPagamentoFilter] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleCreate = async (data: any) => {
    await createContrato(data);
    setShowCreateDialog(false);
    setShowCreateFromPropostaDialog(false);
  };

  const handleDelete = async (id: string) => {
    await deleteContrato(id);
  };

  const handleView = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setShowDetailsDialog(true);
  };

  const handleEdit = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setShowEditDialog(true);
  };

  const handleUpdate = async (data: any) => {
    if (!selectedContrato) return;
    await updateContrato({ id: selectedContrato.id, data });
    setShowEditDialog(false);
    setSelectedContrato(null);
  };

  const filteredContratos = useMemo(() => {
    return contratos.filter((contrato) => {
      const matchesSearch =
        !searchTerm ||
        contrato.cliente?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contrato.cpf_cnpj.includes(searchTerm);

      const matchesStatus = statusFilter === "all" || contrato.status === statusFilter;
      const matchesFormaPagamento =
        formaPagamentoFilter === "all" || contrato.forma_pagamento === formaPagamentoFilter;

      return matchesSearch && matchesStatus && matchesFormaPagamento;
    });
  }, [contratos, searchTerm, statusFilter, formaPagamentoFilter]);

  const sortedContratos = useMemo(() => {
    if (!sortColumn) return filteredContratos;

    return [...filteredContratos].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "cliente":
          aValue = a.cliente?.nome || "";
          bValue = b.cliente?.nome || "";
          break;
        case "total":
          aValue = Number(a.valor_negociado);
          bValue = Number(b.valor_negociado);
          break;
        case "margem":
          aValue = a.margem_pct ? Number(a.valor_negociado) * (a.margem_pct / 100) : Number(a.valor_negociado);
          bValue = b.margem_pct ? Number(b.valor_negociado) * (b.margem_pct / 100) : Number(b.valor_negociado);
          break;
        case "pago":
          aValue = a.parcelas?.valor_pago || 0;
          bValue = b.parcelas?.va
