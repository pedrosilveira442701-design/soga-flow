import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReportBuilder } from "@/components/relatorios/ReportBuilder";
import { ReportPreview } from "@/components/relatorios/ReportPreview";
import { QuickReports } from "@/components/relatorios/QuickReports";
import { useRelatorios, DatasetType, ReportConfig } from "@/hooks/useRelatorios";
import { FileBarChart } from "lucide-react";

export default function Relatorios() {
  const {
    previewData,
    previewLoading,
    previewTotals,
    isExporting,
    fetchPreview,
    exportReport,
    fetchFilterOptions,
  } = useRelatorios();

  const [filterOptions, setFilterOptions] = useState({
    canais: [] as string[],
    servicos: [] as string[],
    cidades: [] as string[],
    bairros: [] as string[],
    statuses: [] as string[],
  });

  const handleDatasetChange = useCallback(async (dataset: DatasetType) => {
    const options = await fetchFilterOptions(dataset);
    setFilterOptions(options);
  }, [fetchFilterOptions]);

  useEffect(() => {
    handleDatasetChange("propostas");
  }, [handleDatasetChange]);

  const handlePreview = useCallback((config: ReportConfig) => {
    fetchPreview(config);
  }, [fetchPreview]);

  const handleExport = useCallback((config: ReportConfig, format: "excel" | "pdf") => {
    exportReport(config, format);
  }, [exportReport]);

  const handleQuickReport = useCallback((config: ReportConfig) => {
    fetchPreview(config);
  }, [fetchPreview]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileBarChart className="h-6 w-6" />
            Centro de Relatórios
          </h1>
          <p className="text-muted-foreground">
            Exporte dados do sistema em Excel ou PDF com filtros personalizados
          </p>
        </div>

        {/* Quick Reports */}
        <QuickReports onRunReport={handleQuickReport} />

        {/* Report Builder */}
        <ReportBuilder
          onPreview={handlePreview}
          onExport={handleExport}
          isLoading={previewLoading}
          isExporting={isExporting}
          filterOptions={filterOptions}
          onDatasetChange={handleDatasetChange}
        />

        {/* Preview */}
        <ReportPreview
          data={previewData}
          totals={previewTotals}
          isLoading={previewLoading}
        />
      </div>
    </DashboardLayout>
  );
}
