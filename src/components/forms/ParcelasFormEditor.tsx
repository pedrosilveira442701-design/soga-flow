import { useState, useMemo, useCallback } from "react";
import { format, addMonths, addDays, lastDayOfMonth, setDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, RefreshCw, Trash2, AlertCircle, Scale, Plus } from "lucide-react";
import { cn, formatDateToLocal } from "@/lib/utils";

export type ParcelaOrigem = "auto" | "manual";

export interface ParcelaPreview {
  numero: number;
  vencimento: string; // formato YYYY-MM-DD
  valor: number;
  origem: ParcelaOrigem;
}

interface ParcelasFormEditorProps {
  valorTotal: number;
  valorEntrada: number;
  dataInicio: string;
  parcelas: ParcelaPreview[];
  onChange: (parcelas: ParcelaPreview[]) => void;
  errors?: string[];
}

type Periodicidade = "mensal" | "quinzenal" | "semanal";

export function ParcelasFormEditor({
  valorTotal,
  valorEntrada,
  dataInicio,
  parcelas,
  onChange,
  errors = [],
}: ParcelasFormEditorProps) {
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState<string>(
    parcelas[0]?.vencimento || dataInicio || formatDateToLocal(new Date())
  );
  const [quantidadeParcelas, setQuantidadeParcelas] = useState<number>(parcelas.length || 1);
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>("mensal");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const saldo = valorTotal - valorEntrada;

  // Calcular próxima data com base na periodicidade
  const calcularProximaData = useCallback((dataBase: Date, indice: number, periodo: Periodicidade): Date => {
    if (periodo === "mensal") {
      const novaData = addMonths(dataBase, indice);
      const diaOriginal = dataBase.getDate();
      const ultimoDiaMes = lastDayOfMonth(novaData).getDate();
      
      // Se o dia original é maior que o último dia do mês, usar último dia
      if (diaOriginal > ultimoDiaMes) {
        return lastDayOfMonth(novaData);
      }
      return setDate(novaData, diaOriginal);
    } else if (periodo === "quinzenal") {
      return addDays(dataBase, indice * 14);
    } else {
      return addDays(dataBase, indice * 7);
    }
  }, []);

  // Gerar cronograma de parcelas
  const gerarCronograma = useCallback(() => {
    if (quantidadeParcelas < 1 || saldo <= 0) return;

    const dataBase = new Date(dataPrimeiraParcela + "T00:00:00");
    
    // Validar se a data da 1ª parcela é >= data de início
    const dataInicioObj = new Date(dataInicio + "T00:00:00");
    if (dataBase < dataInicioObj) {
      return; // Não gerar se data inválida
    }

    // Preservar parcelas marcadas como manual
    const parcelasManual = parcelas.filter(p => p.origem === "manual");
    const numerosManual = new Set(parcelasManual.map(p => p.numero));
    
    // Calcular valor das parcelas auto
    const valorManualTotal = parcelasManual.reduce((sum, p) => sum + p.valor, 0);
    const qtdAuto = quantidadeParcelas - parcelasManual.length;
    const valorAutoRestante = saldo - valorManualTotal;
    const valorParcelaAuto = qtdAuto > 0 ? valorAutoRestante / qtdAuto : 0;

    // Gerar novas parcelas
    const novasParcelas: ParcelaPreview[] = [];
    let contadorAuto = 0;

    for (let i = 0; i < quantidadeParcelas; i++) {
      const numero = i + 1;
      
      // Se essa parcela foi editada manualmente, manter
      const parcelaManual = parcelasManual.find(p => p.numero === numero);
      if (parcelaManual) {
        novasParcelas.push(parcelaManual);
        continue;
      }

      // Gerar parcela automática
      const vencimento = calcularProximaData(dataBase, contadorAuto, periodicidade);
      contadorAuto++;

      // Última parcela auto recebe ajuste de centavos
      const isUltimaAuto = contadorAuto === qtdAuto;
      let valorFinal = valorParcelaAuto;
      
      if (isUltimaAuto) {
        const somaAtual = novasParcelas.reduce((sum, p) => sum + p.valor, 0);
        valorFinal = saldo - somaAtual;
      }

      novasParcelas.push({
        numero,
        vencimento: formatDateToLocal(vencimento),
        valor: Math.max(0, valorFinal),
        origem: "auto",
      });
    }

    // Ordenar por data de vencimento
    novasParcelas.sort((a, b) => a.vencimento.localeCompare(b.vencimento));

    // Renumerar
    novasParcelas.forEach((p, idx) => {
      p.numero = idx + 1;
    });

    onChange(novasParcelas);
  }, [quantidadeParcelas, dataPrimeiraParcela, periodicidade, saldo, dataInicio, parcelas, calcularProximaData, onChange]);

  // Editar vencimento de uma parcela
  const handleVencimentoChange = (numero: number, novaData: string) => {
    const novasParcelas = parcelas.map(p => 
      p.numero === numero 
        ? { ...p, vencimento: novaData, origem: "manual" as ParcelaOrigem }
        : p
    );
    onChange(novasParcelas);
  };

  // Editar valor de uma parcela
  const handleValorChange = (numero: number, novoValor: number) => {
    const novasParcelas = parcelas.map(p => 
      p.numero === numero 
        ? { ...p, valor: novoValor, origem: "manual" as ParcelaOrigem }
        : p
    );
    onChange(novasParcelas);
  };

  // Remover parcela
  const handleRemoverParcela = (numero: number) => {
    const novasParcelas = parcelas
      .filter(p => p.numero !== numero)
      .map((p, idx) => ({ ...p, numero: idx + 1 }));
    setQuantidadeParcelas(novasParcelas.length);
    onChange(novasParcelas);
  };

  // Adicionar parcela
  const handleAdicionarParcela = () => {
    const ultimaParcela = parcelas[parcelas.length - 1];
    const novaData = ultimaParcela 
      ? calcularProximaData(new Date(ultimaParcela.vencimento + "T00:00:00"), 1, periodicidade)
      : new Date(dataPrimeiraParcela + "T00:00:00");
    
    const novasParcelas = [
      ...parcelas,
      {
        numero: parcelas.length + 1,
        vencimento: formatDateToLocal(novaData),
        valor: 0,
        origem: "manual" as ParcelaOrigem,
      }
    ];
    setQuantidadeParcelas(novasParcelas.length);
    onChange(novasParcelas);
  };

  // Distribuir saldo entre parcelas auto
  const handleDistribuirSaldo = () => {
    const parcelasManual = parcelas.filter(p => p.origem === "manual");
    const parcelasAuto = parcelas.filter(p => p.origem === "auto");
    
    const valorManualTotal = parcelasManual.reduce((sum, p) => sum + p.valor, 0);
    const valorAutoRestante = saldo - valorManualTotal;
    const valorParcelaAuto = parcelasAuto.length > 0 ? valorAutoRestante / parcelasAuto.length : 0;

    let contadorAuto = 0;
    const novasParcelas = parcelas.map(p => {
      if (p.origem === "manual") return p;
      
      contadorAuto++;
      const isUltima = contadorAuto === parcelasAuto.length;
      
      if (isUltima) {
        const somaAte = parcelas
          .filter(px => px.origem === "auto" && px.numero < p.numero)
          .reduce((sum, px) => sum + valorParcelaAuto, 0);
        return { ...p, valor: valorAutoRestante - somaAte };
      }
      
      return { ...p, valor: valorParcelaAuto };
    });

    onChange(novasParcelas);
  };

  // Cálculos de totais
  const totais = useMemo(() => {
    const somaParcelas = parcelas.reduce((sum, p) => sum + p.valor, 0);
    const diferenca = saldo - somaParcelas;
    return {
      somaParcelas,
      diferenca,
      temErro: Math.abs(diferenca) > 0.01,
    };
  }, [parcelas, saldo]);

  // Verificar datas duplicadas
  const datasRepetidas = useMemo(() => {
    const datas = parcelas.map(p => p.vencimento);
    return datas.filter((data, idx) => datas.indexOf(data) !== idx);
  }, [parcelas]);

  // Validar data da primeira parcela
  const dataInvalida = useMemo(() => {
    if (!dataPrimeiraParcela || !dataInicio) return false;
    return dataPrimeiraParcela < dataInicio;
  }, [dataPrimeiraParcela, dataInicio]);

  return (
    <div className="space-y-4">
      {/* Configurações de geração */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
        <h4 className="font-medium text-sm">Configuração das Parcelas</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Data da 1ª parcela */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Data da 1ª Parcela *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataPrimeiraParcela && "text-muted-foreground",
                    dataInvalida && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataPrimeiraParcela
                    ? format(new Date(dataPrimeiraParcela + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
                    : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataPrimeiraParcela ? new Date(dataPrimeiraParcela + "T00:00:00") : undefined}
                  onSelect={(date) => date && setDataPrimeiraParcela(formatDateToLocal(date))}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {dataInvalida && (
              <p className="text-xs text-destructive">Data não pode ser anterior à data de início</p>
            )}
          </div>

          {/* Quantidade de parcelas */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quantidade de Parcelas *</label>
            <Input
              type="number"
              min={1}
              max={120}
              value={quantidadeParcelas}
              onChange={(e) => setQuantidadeParcelas(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))}
            />
          </div>

          {/* Periodicidade */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Periodicidade</label>
            <Select value={periodicidade} onValueChange={(v) => setPeriodicidade(v as Periodicidade)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="quinzenal">Quinzenal</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={gerarCronograma}
            disabled={dataInvalida || saldo <= 0}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Gerar Cronograma
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleDistribuirSaldo}
            disabled={parcelas.length === 0}
          >
            <Scale className="mr-2 h-4 w-4" />
            Distribuir Saldo
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleAdicionarParcela}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Parcela
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {datasRepetidas.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Existem datas de vencimento duplicadas: {datasRepetidas.map(d => format(new Date(d + "T00:00:00"), "dd/MM/yyyy")).join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {totais.temErro && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            A soma das parcelas ({formatCurrency(totais.somaParcelas)}) não corresponde ao saldo ({formatCurrency(saldo)}). 
            Diferença: {formatCurrency(totais.diferenca)}
          </AlertDescription>
        </Alert>
      )}

      {errors.map((err, idx) => (
        <Alert key={idx} variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ))}

      {/* Tabela de parcelas */}
      {parcelas.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor (R$)</TableHead>
                <TableHead className="w-20">Origem</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((parcela) => (
                <TableRow 
                  key={parcela.numero}
                  className={cn(
                    datasRepetidas.includes(parcela.vencimento) && "bg-destructive/10"
                  )}
                >
                  <TableCell className="font-medium">{parcela.numero}</TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-8 justify-start px-2 font-normal",
                            datasRepetidas.includes(parcela.vencimento) && "text-destructive"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(new Date(parcela.vencimento + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={new Date(parcela.vencimento + "T00:00:00")}
                          onSelect={(date) => date && handleVencimentoChange(parcela.numero, formatDateToLocal(date))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8 w-32"
                      value={parcela.valor}
                      onChange={(e) => handleValorChange(parcela.numero, parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={parcela.origem === "manual" ? "default" : "secondary"}>
                      {parcela.origem === "manual" ? "Manual" : "Auto"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoverParcela(parcela.numero)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Rodapé com totais */}
          <div className="border-t bg-muted/30 p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Saldo a Parcelar:</span>
                <span className="font-semibold">{formatCurrency(saldo)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Soma das Parcelas:</span>
                <span className={cn("font-semibold", totais.temErro && "text-destructive")}>
                  {formatCurrency(totais.somaParcelas)}
                </span>
              </div>
              {totais.temErro && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Diferença:</span>
                  <span className="font-semibold text-destructive">
                    {formatCurrency(totais.diferenca)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {parcelas.length === 0 && saldo > 0 && (
        <div className="text-center p-8 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground mb-4">
            Configure os parâmetros acima e clique em "Gerar Cronograma" para criar as parcelas.
          </p>
        </div>
      )}
    </div>
  );
}
