import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReportBuilder } from "@/components/relatorios/ReportBuilder";
import { ReportPreview } from "@/components/relatorios/ReportPreview";
import { QuickReports } from "@/components/relatorios/QuickReports";
import { useRelatorios, DatasetType, ReportConfig } from "@/hooks/useRelatorios";
import { FileBarChart } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

  // State to hold config from Quick Reports to sync with Builder
  const [activeQuickReportConfig, setActiveQuickReportConfig] = useState<ReportConfig | null>(null);
  
  // Ref to Builder for imperative access
  const builderRef = useRef<{ applyConfig: (config: ReportConfig) => void } | null>(null);

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
    // Set the config so Builder can sync
    setActiveQuickReportConfig(config);
    // Fetch filter options for the dataset
    handleDatasetChange(config.dataset);
    // Fetch preview immediately
    fetchPreview(config);
  }, [fetchPreview, handleDatasetChange]);

  // Clear quick report config when user interacts with builder
  const handleBuilderInteraction = useCallback(() => {
    setActiveQuickReportConfig(null);
  }, []);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileBarChart className="h-6 w-6 text-primary" />
            </div>
            Centro de Relatórios
          </h1>
          <p className="text-muted-foreground text-sm">
            Exporte dados do sistema em Excel ou PDF com filtros personalizados
          </p>
        </div>

        <Separator />

        {/* Quick Reports */}
        <QuickReports onRunReport={handleQuickReport} />

        {/* Main content: Builder and Preview side by side on large screens */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Report Builder */}
          <ReportBuilder
            onPreview={handlePreview}
            onExport={handleExport}
            isLoading={previewLoading}
            isExporting={isExporting}
            filterOptions={filterOptions}
            onDatasetChange={handleDatasetChange}
            initialConfig={activeQuickReportConfig}
            onUserInteraction={handleBuilderInteraction}
          />

          {/* Preview */}
          <ReportPreview
            data={previewData}
            totals={previewTotals}
            isLoading={previewLoading}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}