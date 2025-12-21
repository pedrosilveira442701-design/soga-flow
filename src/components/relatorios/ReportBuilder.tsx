import { useState, useEffect } from "react";
import { Calendar, Filter, ChevronDown, ChevronUp, Download, Eye, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DatasetType, ReportConfig, ReportFilters, DATASET_COLUMNS, DATASET_LABELS } from "@/hooks/useRelatorios";

interface ReportBuilderProps {
  onPreview: (config: ReportConfig) => void;
  onExport: (config: ReportConfig, format: "excel" | "pdf") => void;
  isLoading: boolean;
  isExporting: boolean;
  filterOptions: {
    canais: string[];
    servicos: string[];
    cidades: string[];
    bairros: string[];
    statuses: string[];
  };
  onDatasetChange: (dataset: DatasetType) => void;
}

export function ReportBuilder({
  onPreview,
  onExport,
  isLoading,
  isExporting,
  filterOptions,
  onDatasetChange,
}: ReportBuilderProps) {
  const [dataset, setDataset] = useState<DatasetType>("propostas");
  const [scope, setScope] = useState<"global" | "periodo">("global");
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [filters, setFilters] = useState<ReportFilters>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [useAllColumns, setUseAllColumns] = useState(true);
  const [orderBy, setOrderBy] = useState<{ field: string; direction: "asc" | "desc" }>({ field: "created_at", direction: "desc" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);

  const columns = DATASET_COLUMNS[dataset] || [];

  useEffect(() => {
    onDatasetChange(dataset);
    setSelectedColumns([]);
    setUseAllColumns(true);
    setFilters({});
  }, [dataset, onDatasetChange]);

  const buildConfig = (): ReportConfig => ({
    dataset,
    scope,
    dateRange: scope === "periodo" && dateRange.start && dateRange.end
      ? {
          start: format(dateRange.start, "yyyy-MM-dd"),
          end: format(dateRange.end, "yyyy-MM-dd"),
        }
      : undefined,
    filters,
    columns: useAllColumns ? columns.map(c => c.key) : selectedColumns,
    orderBy,
  });

  const handlePreview = () => onPreview(buildConfig());
  const handleExportExcel = () => onExport(buildConfig(), "excel");
  const handleExportPDF = () => onExport(buildConfig(), "pdf");

  const handleColumnToggle = (key: string) => {
    setSelectedColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
    setUseAllColumns(false);
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(columns.map(c => c.key));
    setUseAllColumns(true);
  };

  const handleMultiSelect = (
    key: keyof ReportFilters,
    value: string,
    currentValues: string[] = []
  ) => {
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    setFilters(prev => ({ ...prev, [key]: newValues.length ? newValues : undefined }));
  };

  const activeFiltersCount = Object.values(filters).filter(v => v && (Array.isArray(v) ? v.length : v)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Construtor de Relatório
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dataset Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Dataset</Label>
            <Select value={dataset} onValueChange={(v) => setDataset(v as DatasetType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATASET_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Escopo</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as "global" | "periodo")} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="global" id="global" />
                <Label htmlFor="global" className="font-normal cursor-pointer">Global (Tudo)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="periodo" id="periodo" />
                <Label htmlFor="periodo" className="font-normal cursor-pointer">Por Período</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Date Range */}
        {scope === "periodo" && (
          <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Label className="text-sm text-muted-foreground">Período:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {dateRange.start ? format(dateRange.start, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateRange.start}
                  onSelect={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {dateRange.end ? format(dateRange.end, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateRange.end}
                  onSelect={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros Avançados
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary">{activeFiltersCount}</Badge>
                )}
              </span>
              {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg">
              {/* Status */}
              {filterOptions.statuses.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.statuses.slice(0, 6).map(status => (
                      <Badge
                        key={status}
                        variant={filters.status?.includes(status) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleMultiSelect("status", status, filters.status)}
                      >
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Canal */}
              {filterOptions.canais.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Canal</Label>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.canais.slice(0, 6).map(canal => (
                      <Badge
                        key={canal}
                        variant={filters.canal?.includes(canal) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleMultiSelect("canal", canal, filters.canal)}
                      >
                        {canal}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Serviço */}
              {filterOptions.servicos.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Serviço</Label>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.servicos.slice(0, 6).map(servico => (
                      <Badge
                        key={servico}
                        variant={filters.servico?.includes(servico) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleMultiSelect("servico", servico, filters.servico)}
                      >
                        {servico}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Cidade */}
              {filterOptions.cidades.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Cidade</Label>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {filterOptions.cidades.slice(0, 10).map(cidade => (
                      <Badge
                        key={cidade}
                        variant={filters.cidade?.includes(cidade) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleMultiSelect("cidade", cidade, filters.cidade)}
                      >
                        {cidade}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Cliente Search */}
              <div className="space-y-2">
                <Label className="text-sm">Cliente</Label>
                <Input
                  placeholder="Buscar cliente..."
                  value={filters.cliente || ""}
                  onChange={(e) => setFilters(prev => ({ ...prev, cliente: e.target.value || undefined }))}
                />
              </div>

              {/* Responsável Search */}
              <div className="space-y-2">
                <Label className="text-sm">Responsável</Label>
                <Input
                  placeholder="Buscar responsável..."
                  value={filters.responsavel || ""}
                  onChange={(e) => setFilters(prev => ({ ...prev, responsavel: e.target.value || undefined }))}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Columns Selection */}
        <Collapsible open={columnsOpen} onOpenChange={setColumnsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                Colunas
                <Badge variant="secondary">
                  {useAllColumns ? "Todas" : `${selectedColumns.length}/${columns.length}`}
                </Badge>
              </span>
              {columnsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center gap-4">
                <Checkbox
                  id="all-columns"
                  checked={useAllColumns}
                  onCheckedChange={(checked) => {
                    setUseAllColumns(!!checked);
                    if (checked) setSelectedColumns(columns.map(c => c.key));
                  }}
                />
                <Label htmlFor="all-columns" className="cursor-pointer">Selecionar todas as colunas</Label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {columns.map(col => (
                  <div key={col.key} className="flex items-center gap-2">
                    <Checkbox
                      id={col.key}
                      checked={useAllColumns || selectedColumns.includes(col.key)}
                      onCheckedChange={() => handleColumnToggle(col.key)}
                      disabled={useAllColumns}
                    />
                    <Label htmlFor={col.key} className="text-sm cursor-pointer">{col.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Ordering */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ordenar por</Label>
            <Select value={orderBy.field} onValueChange={(v) => setOrderBy(prev => ({ ...prev, field: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Direção</Label>
            <Select value={orderBy.direction} onValueChange={(v) => setOrderBy(prev => ({ ...prev, direction: v as "asc" | "desc" }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Crescente</SelectItem>
                <SelectItem value="desc">Decrescente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button onClick={handlePreview} disabled={isLoading} className="gap-2">
            <Eye className="h-4 w-4" />
            {isLoading ? "Carregando..." : "Visualizar Prévia"}
          </Button>
          <Button onClick={handleExportExcel} disabled={isExporting} variant="secondary" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar Excel"}
          </Button>
          <Button onClick={handleExportPDF} disabled={isExporting} variant="secondary" className="gap-2">
            <FileText className="h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
