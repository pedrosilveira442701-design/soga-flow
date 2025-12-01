import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import { useAnotacoes } from "@/hooks/useAnotacoes";
import { parseAnotacaoInput } from "@/lib/anotacaoParser";
import { Card } from "@/components/ui/card";

interface QuickAddAnotacaoProps {
  onSuccess?: () => void;
}

export function QuickAddAnotacao({ onSuccess }: QuickAddAnotacaoProps) {
  const [input, setInput] = useState("");
  const { createAnotacao, isCreating } = useAnotacoes();

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      handleCreate();
    }
  };

  const handleCreate = () => {
    if (!input.trim()) return;

    const parsed = parseAnotacaoInput(input);
    
    createAnotacao({
      title: parsed.title,
      priority: parsed.priority || "media",
      type: parsed.type || "outro",
      tags: parsed.tags || [],
      reminder_datetime: parsed.reminderDatetime?.toISOString(),
      notify_push: true, // Default to browser notifications
      status: "aberta",
    });

    setInput("");
    onSuccess?.();
  };

  return (
    <Card className="p-4 bg-accent/30 border-accent">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
        <Input
          placeholder='Ex: "Ligar para João amanhã 9h #orçamento @alta"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isCreating}
          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2 ml-8">
        Use <strong>#tags</strong> para categorizar, <strong>@alta/@media/@baixa</strong> para prioridade,
        e palavras como "amanhã", "9h", "hoje" para horários
      </p>
    </Card>
  );
}
