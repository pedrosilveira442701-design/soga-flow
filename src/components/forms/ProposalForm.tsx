import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const proposalSchema = z.object({
  area: z.string().min(1, "Área é obrigatória"),
  pricePerM2: z.string().min(1, "Preço por m² é obrigatório"),
  costPerM2: z.string().min(1, "Custo por m² é obrigatório"),
  tipoPiso: z.string().optional(),
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

interface ProposalFormProps {
  onSubmit: (data: ProposalFormValues) => void;
  initialData?: Partial<ProposalFormValues>;
}

export function ProposalForm({ onSubmit, initialData }: ProposalFormProps) {
  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: initialData || {
      area: "",
      pricePerM2: "",
      costPerM2: "",
      tipoPiso: "",
    },
  });

  const watchedValues = form.watch();
  const area = parseFloat(watchedValues.area) || 0;
  const pricePerM2 = parseFloat(watchedValues.pricePerM2) || 0;
  const costPerM2 = parseFloat(watchedValues.costPerM2) || 0;

  const totalBruto = area * pricePerM2;
  const totalCusto = area * costPerM2;
  const valorLiquido = totalBruto - totalCusto;
  const margem = totalBruto > 0 ? ((valorLiquido / totalBruto) * 100) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Form - 70% */}
      <div className="lg:col-span-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Seção Medições */}
            <Card className="p-6">
              <h3 className="text-h3 mb-6">Medições</h3>
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área (m²)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Card>

            {/* Seção Preço */}
            <Card className="p-6">
              <h3 className="text-h3 mb-6">Preço</h3>
              <FormField
                control={form.control}
                name="pricePerM2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço por m² (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Card>

            {/* Seção Custo */}
            <Card className="p-6">
              <h3 className="text-h3 mb-6">Custo</h3>
              <FormField
                control={form.control}
                name="costPerM2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo por m² (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Card>

            <Button type="submit" size="lg" className="w-full">
              Salvar Proposta
            </Button>
          </form>
        </Form>
      </div>

      {/* Preview - 30% */}
      <div className="lg:col-span-4">
        <div className="sticky top-24">
          <Card className="p-6 shadow-elev2">
            <h3 className="text-h3 mb-6">Resumo Financeiro</h3>
            <div className="space-y-4">
              <motion.div
                key={`bruto-${totalBruto}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="pb-3 border-b border-border"
              >
                <p className="text-caption text-muted-foreground mb-1">
                  Total Bruto
                </p>
                <p className="text-body font-semibold" style={{ color: "#2E90FA" }}>
                  {formatCurrency(totalBruto)}
                </p>
              </motion.div>

              <motion.div
                key={`custo-${totalCusto}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="pb-3 border-b border-border"
              >
                <p className="text-caption text-muted-foreground mb-1">
                  Total Custo
                </p>
                <p className="text-body font-semibold" style={{ color: "#9CA3AF" }}>
                  {formatCurrency(totalCusto)}
                </p>
              </motion.div>

              <motion.div
                key={`liquido-${valorLiquido}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="pb-3 border-b border-border"
              >
                <p className="text-caption text-muted-foreground mb-1">
                  Valor Líquido
                </p>
                <p className="text-2xl text-kpi" style={{ color: "#12B76A" }}>
                  {formatCurrency(valorLiquido)}
                </p>
              </motion.div>

              <motion.div
                key={`margem-${margem}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                <p className="text-caption text-muted-foreground mb-1">
                  Margem
                </p>
                <p className="text-body font-semibold text-foreground">
                  {margem.toFixed(2)}%
                </p>
              </motion.div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
