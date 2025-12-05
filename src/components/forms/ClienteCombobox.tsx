import { useState, useEffect, useMemo, useCallback } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Cliente } from "@/hooks/useClientes";
import { fuzzyMatch, findMatchPosition, calculateRelevanceScore, normalizeText } from "@/lib/fuzzySearch";

interface ClienteComboboxProps {
  clientes: Cliente[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

interface ScoredCliente extends Cliente {
  score: number;
}

// Cache simples com 60s de TTL
const searchCache = new Map<string, { results: Cliente[]; timestamp: number }>();
const CACHE_TTL = 60000; // 60 segundos

function getCachedResults(key: string): Cliente[] | null {
  const cached = searchCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  
  return cached.results;
}

function setCachedResults(key: string, results: Cliente[]) {
  searchCache.set(key, { results, timestamp: Date.now() });
}

export default function ClienteCombobox({
  clientes,
  value,
  onChange,
  disabled = false,
  isLoading = false,
}: ClienteComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce de 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Cliente selecionado
  const selectedCliente = useMemo(
    () => clientes.find((c) => c.id === value),
    [clientes, value]
  );

  // Função de busca e ordenação com cache
  const filteredAndSortedClientes = useMemo(() => {
    const cacheKey = `${debouncedSearch}-${clientes.length}`;
    
    // Verificar cache
    const cached = getCachedResults(cacheKey);
    if (cached) return cached.slice(0, 15);

    let results: ScoredCliente[] = clientes.map((cliente) => ({
      ...cliente,
      score: 0,
    }));

    // Aplicar busca fuzzy se houver termo
    if (debouncedSearch) {
      results = results.filter((cliente) => {
        // Buscar em nome (peso 100)
        const nameMatch = fuzzyMatch(cliente.nome || "", debouncedSearch);
        if (nameMatch) {
          cliente.score += calculateRelevanceScore(cliente.nome || "", debouncedSearch, 100);
        }

        // Buscar em bairro (peso 50)
        const bairroMatch = fuzzyMatch(cliente.bairro || "", debouncedSearch);
        if (bairroMatch) {
          cliente.score += calculateRelevanceScore(cliente.bairro || "", debouncedSearch, 50);
        }

        // Buscar em CPF/CNPJ se a busca for numérica (peso 30)
        const isNumeric = /^\d+$/.test(debouncedSearch);
        const cpfCnpjMatch = isNumeric && fuzzyMatch(cliente.cpf_cnpj || "", debouncedSearch);
        if (cpfCnpjMatch) {
          cliente.score += calculateRelevanceScore(cliente.cpf_cnpj || "", debouncedSearch, 30);
        }

        return nameMatch || bairroMatch || cpfCnpjMatch;
      });
    }

    // Ordenar por score (se houver busca) e depois alfabeticamente
    results.sort((a, b) => {
      if (debouncedSearch) {
        // Primeiro por relevância
        if (b.score !== a.score) {
          return b.score - a.score;
        }
      }
      
      // Depois por ordem alfabética
      return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
    });

    // Armazenar em cache
    const finalResults = results.slice(0, 15);
    setCachedResults(cacheKey, finalResults);

    return finalResults;
  }, [clientes, debouncedSearch]);

  // Função para highlight do texto
  const highlightMatch = useCallback((text: string, search: string) => {
    if (!search) return <span>{text}</span>;

    const position = findMatchPosition(text, search);
    if (!position) return <span>{text}</span>;

    const before = text.slice(0, position.start);
    const match = text.slice(position.start, position.end);
    const after = text.slice(position.end);

    return (
      <span>
        {before}
        <mark className="bg-primary/20 font-semibold">{match}</mark>
        {after}
      </span>
    );
  }, []);

  // Label do cliente selecionado
  const selectedLabel = selectedCliente
    ? `${selectedCliente.nome}${selectedCliente.bairro ? ` — ${selectedCliente.bairro}` : " — Bairro não informado"}`
    : "Selecione um cliente";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          <span className="truncate">
            {isLoading ? "Carregando clientes..." : selectedLabel}
          </span>
          <ChevronsUpDown className="ml-2 icon-md shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 icon-md shrink-0 opacity-50" />
            <CommandInput
              placeholder="Buscar por nome, bairro ou CPF/CNPJ..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="flex h-11 w-full"
            />
          </div>
          <CommandList>
            <CommandEmpty>
              {debouncedSearch
                ? `Nenhum cliente encontrado para '${debouncedSearch}'`
                : "Nenhum cliente cadastrado"}
            </CommandEmpty>
            <CommandGroup>
              {filteredAndSortedClientes.map((cliente) => {
                const displayBairro = cliente.bairro || "Bairro não informado";
                
                return (
                  <CommandItem
                    key={cliente.id}
                    value={cliente.id}
                    onSelect={() => {
                      onChange(cliente.id);
                      setOpen(false);
                      setSearchTerm("");
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex-1 truncate">
                      <span className="font-medium">
                        {highlightMatch(cliente.nome, debouncedSearch)}
                      </span>
                      <span className="text-muted-foreground"> — </span>
                      <span className="text-muted-foreground text-sm">
                        {highlightMatch(displayBairro, debouncedSearch)}
                      </span>
                    </div>
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4 shrink-0",
                        value === cliente.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
