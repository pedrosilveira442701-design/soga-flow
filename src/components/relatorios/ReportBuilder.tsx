import { useState, useEffect } from "react";
import { Calendar, Filter, ChevronDown, ChevronUp, Eye, FileSpreadsheet, FileText, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { format, parse } from "date-fns";
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
  initialConfig?: ReportConfig | null;
  onUserInteraction?: () => void;
}

export function ReportBuilder({
  onPreview,
  onExport,
  isLoading,
  isExporting,
  filterOptions,
  onDatasetChange,
  initialConfig,
  onUserInteraction,
}: ReportBuilderProps) {
  const [dataset, setDataset] = useState<DatasetType>("propostas");
  const [scope, setScope] = useState<"global" | "periodo">("global");
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [filters, setFilters] = useState<ReportFilters>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [useAllColumns, setUseAllColumns] = useState(true);
  const [orderBy, setOrderBy] = useState<{ field: string; direction: "asc" | "desc" }>({ field: "periodo_dia", direction: "desc" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);

  const columns = DATASET_COLUMNS[dataset] || [];

  // Sync with initialConfig from Quick Reports
  useEffect(() => {
    if (initialConfig) {
      setDataset(initialConfig.dataset);
      setScope(initialConfig.scope);
      setFilters(initialConfig.filters || {});
      
      if (initialConfig.dateRange) {
        setDateRange({
          start: initialConfig.dateRange.start ? parse(initialConfig.dateRange.start, "yyyy-MM-dd", new Date()) : undefined,
          end: initialConfig.dateRange.end ? parse(initialConfig.dateRange.end, "yyyy-MM-dd", new Date()) : undefined,
        });
      } else {
        setDateRange({});
      }
      
      if (initialConfig.columns && initialConfig.columns.length > 0) {
        setSelectedColumns(initialConfig.columns);
        setUseAllColumns(false);
      } else {
        setUseAllColumns(true);
      }
      
      if (initialConfig.orderBy) {
        setOrderBy(initialConfig.orderBy);
      } else {
        setOrderBy({ field: "periodo_dia", direction: "desc" });
      }
      
      // Show filters if any are active
      if (initialConfig.filters && Object.keys(initialConfig.filters).some(k => {
        const val = initialConfig.filters[k as keyof ReportFilters];
        return val && (Array.isArray(val) ? val.length > 0 : true);
      })) {
        setFiltersOpen(true);
      }
    }
  }, [initialConfig]);

  // When dataset changes manually (not from initialConfig), reset state
  const handleDatasetChange = (newDataset: DatasetType) => {
    onUserInteraction?.();
    setDataset(newDataset);
    onDatasetChange(newDataset);
    setSelectedColumns([]);
    setUseAllColumns(true);
    setFilters({});
    const newColumns = DATASET_COLUMNS[newDataset] || [];
    const defaultDateField = newColumns.find(c => c.key === "periodo_dia") ? "periodo_dia" : "created_at";
    setOrderBy({ field: defaultDateField, direction: "desc" });
  };

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

  const handlePreview = () => {
    onUserInteraction?.();
    onPreview(buildConfig());
  };
  
  const handleExportExcel = () => {
    onUserInteraction?.();
    onExport(buildConfig(), "excel");
  };
  
  const handleExportPDF = () => {
    onUserInteraction?.();
    onExport(buildConfig(), "pdf");
  };

  const handleColumnToggle = (key: string) => {
    onUserInteraction?.();
    setSelectedColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
    setUseAllColumns(false);
  };

  const handleMultiSelect = (
    key: keyof ReportFilters,
    value: string,
    currentValues: string[] = []
  ) => {
    onUserInteraction?.();
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    setFilters(prev => ({ ...prev, [key]: newValues.length ? newValues : undefined }));
  };

  const clearFilters = () => {
    onUserInteraction?.();
    setFilters({});
    setFiltersOpen(false);
  };

  const removeFilter = (key: keyof ReportFilters, value?: string) => {
    onUserInteraction?.();
    if (value && Array.isArray(filters[key])) {
      const newValues = (filters[key] as string[]).filter(v => v !== value);
      setFilters(prev => ({ ...prev, [key]: newValues.length ? newValues : undefined }));
    } else {
      setFilters(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const activeFiltersCount = Object.values(filters).filter(v => v && (Array.isArray(v) ? v.length : v)).length;

  // Get all active filter values as chips
  const getActiveFilterChips = () => {
    const chips: { key: keyof ReportFilters; value: string; label: string }[] = [];
    
    if (filters.status?.length) {
      filters.status.forEach(v => chips.push({ key: "status", value: v, label: `Status: ${v}` }));
    }
    if (filters.canal?.length) {
      filters.canal.forEach(v => chips.push({ key: "canal", value: v, label: `Canal: ${v}` }));
    }
    if (filters.servico?.length) {
      filters.servico.forEach(v => chips.push({ key: "servico", value: v, label: `Serviço: ${v}` }));
    }
    if (filters.cidade?.length) {
      filters.cidade.forEach(v => chips.push({ key: "cidade", value: v, label: `Cidade: ${v}` }));
    }
    if (filters.bairro?.length) {
      filters.bairro.forEach(v => chips.push({ key: "bairro", value: v, label: `Bairro: ${v}` }));
    }
    if (filters.cliente) {
      chips.push({ key: "cliente", value: filters.cliente, label: `Cliente: ${filters.cliente}` });
    }
    if (filters.responsavel) {
      chips.push({ key: "responsavel", value: filters.responsavel, label: `Responsável: ${filters.responsavel}` });
    }
    
    return chips;
  };

  const filterChips = getActiveFilterChips();

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Construtor de Relatório
            </CardTitle>
            <CardDescription className="mt-1">
              Configure os parâmetros e exporte seus dados
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {DATASET_LABELS[dataset]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Section 1: Dataset & Scope */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs">1</span>
            Selecionar Dados
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Dataset</Label>
              <Select value={dataset} onValueChange={(v) => handleDatasetChange(v as DatasetType)}>
                <SelectTrigger className="h-10">
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
              <Label className="text-xs text-muted-foreground">Escopo</Label>
              <RadioGroup 
                value={scope} 
                onValueChange={(v) => {
                  onUserInteraction?.();
                  setScope(v as "global" | "periodo");
                }} 
                className="flex gap-4 h-10 items-center"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="global" id="global" />
                  <Label htmlFor="global" className="font-normal cursor-pointer text-sm">Global (Tudo)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="periodo" id="periodo" />
                  <Label htmlFor="periodo" className="font-normal cursor-pointer text-sm">Por Período</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Date Range */}
          {scope === "periodo" && (
            <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg ml-7 border border-border/50">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-9">
                    {dateRange.start ? format(dateRange.start, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.start}
                    onSelect={(date) => {
                      onUserInteraction?.();
                      setDateRange(prev => ({ ...prev, start: date }));
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground text-sm">até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-9">
                    {dateRange.end ? format(dateRange.end, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.end}
                    onSelect={(date) => {
                      onUserInteraction?.();
                      setDateRange(prev => ({ ...prev, end: date }));
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <Separator />

        {/* Section 2: Filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs">2</span>
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">{activeFiltersCount} ativo(s)</Badge>
            )}
          </div>

          {/* Active filter chips */}
          {filterChips.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-7">
              {filterChips.map((chip, idx) => (
                <Badge 
                  key={`${chip.key}-${chip.value}-${idx}`}
                  variant="secondary" 
                  className="gap-1 pr-1 text-xs"
                >
                  {chip.label}
                  <button 
                    onClick={() => removeFilter(chip.key, Array.isArray(filters[chip.key]) ? chip.value : undefined)}
                    className="ml-1 p-0.5 hover:bg-muted rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Limpar todos
              </Button>
            </div>
          )}

          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="pl-7">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between h-9">
                <span className="flex items-center gap-2 text-sm">
                  <Filter className="h-4 w-4" />
                  {filtersOpen ? "Ocultar filtros avançados" : "Mostrar filtros avançados"}
                </span>
                {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-card">
                {/* Status */}
                {filterOptions.statuses.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {filterOptions.statuses.slice(0, 8).map(status => (
                        <Badge
                          key={status}
                          variant={filters.status?.includes(status) ? "default" : "outline"}
                          className="cursor-pointer text-xs transition-colors"
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
                    <Label className="text-xs text-muted-foreground">Canal</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {filterOptions.canais.slice(0, 8).map(canal => (
                        <Badge
                          key={canal}
                          variant={filters.canal?.includes(canal) ? "default" : "outline"}
                          className="cursor-pointer text-xs transition-colors"
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
                    <Label className="text-xs text-muted-foreground">Serviço</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {filterOptions.servicos.slice(0, 8).map(servico => (
                        <Badge
                          key={servico}
                          variant={filters.servico?.includes(servico) ? "default" : "outline"}
                          className="cursor-pointer text-xs transition-colors"
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
                    <Label className="text-xs text-muted-foreground">Cidade</Label>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {filterOptions.cidades.slice(0, 12).map(cidade => (
                        <Badge
                          key={cidade}
                          variant={filters.cidade?.includes(cidade) ? "default" : "outline"}
                          className="cursor-pointer text-xs transition-colors"
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
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <Input
                    placeholder="Buscar cliente..."
                    value={filters.cliente || ""}
                    onChange={(e) => {
                      onUserInteraction?.();
                      setFilters(prev => ({ ...prev, cliente: e.target.value || undefined }));
                    }}
                    className="h-9"
                  />
                </div>

                {/* Responsável Search */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Responsável</Label>
                  <Input
                    placeholder="Buscar responsável..."
                    value={filters.responsavel || ""}
                    onChange={(e) => {
                      onUserInteraction?.();
                      setFilters(prev => ({ ...prev, responsavel: e.target.value || undefined }));
                    }}
                    className="h-9"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <Separator />

        {/* Section 3: Columns & Order */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs">3</span>
            Colunas e Ordenação
          </div>

          <div className="pl-7 space-y-4">
            {/* Columns Selection */}
            <Collapsible open={columnsOpen} onOpenChange={setColumnsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between h-9">
                  <span className="flex items-center gap-2 text-sm">
                    Colunas
                    <Badge variant="secondary" className="text-xs">
                      {useAllColumns ? "Todas" : `${selectedColumns.length}/${columns.length}`}
                    </Badge>
                  </span>
                  {columnsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="p-4 border rounded-lg space-y-4 bg-card">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      id="all-columns"
                      checked={useAllColumns}
                      onCheckedChange={(checked) => {
                        onUserInteraction?.();
                        setUseAllColumns(!!checked);
                        if (checked) setSelectedColumns(columns.map(c => c.key));
                      }}
                    />
                    <Label htmlFor="all-columns" className="cursor-pointer text-sm">Selecionar todas as colunas</Label>
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
                        <Label htmlFor={col.key} className="text-xs cursor-pointer">{col.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Ordering */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Ordenar por</Label>
                <Select 
                  value={orderBy.field} 
                  onValueChange={(v) => {
                    onUserInteraction?.();
                    setOrderBy(prev => ({ ...prev, field: v }));
                  }}
                >
                  <SelectTrigger className="h-9">
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
                <Label className="text-xs text-muted-foreground">Direção</Label>
                <Select 
                  value={orderBy.direction} 
                  onValueChange={(v) => {
                    onUserInteraction?.();
                    setOrderBy(prev => ({ ...prev, direction: v as "asc" | "desc" }));
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Mais recentes primeiro</SelectItem>
                    <SelectItem value="asc">Mais antigos primeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={handlePreview} disabled={isLoading} size="lg" className="gap-2 flex-1 md:flex-none">
            <Eye className="h-4 w-4" />
            {isLoading ? "Carregando..." : "Visualizar Prévia"}
          </Button>
          <div className="flex gap-2 flex-1 md:flex-none">
            <Button onClick={handleExportExcel} disabled={isExporting} variant="outline" size="lg" className="gap-2 flex-1">
              <FileSpreadsheet className="h-4 w-4" />
              {isExporting ? "..." : "Excel"}
            </Button>
            <Button onClick={handleExportPDF} disabled={isExporting} variant="outline" size="lg" className="gap-2 flex-1">
              <FileText className="h-4 w-4" />
              {isExporting ? "..." : "PDF"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}