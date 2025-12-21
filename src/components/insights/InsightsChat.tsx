import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface InsightsChatProps {
  onSendMessage: (message: string) => void;
  onSelectSuggestion: (key: string) => void;
  isLoading: boolean;
  suggestions: { key: string; label: string }[];
  nextSteps?: string[];
}

const QUICK_SUGGESTIONS = [
  "Vendas do mês por cliente",
  "Margem % nos últimos 3 meses",
  "Melhor canal de vendas",
  "Serviços mais vendidos em m²",
  "Taxa de conversão por canal",
];

export function InsightsChat({
  onSendMessage,
  onSelectSuggestion,
  isLoading,
  suggestions,
  nextSteps = [],
}: InsightsChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Check if it's a fallback key
    const fallback = suggestions.find((s) => s.label === suggestion);
    if (fallback) {
      onSelectSuggestion(fallback.key);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "user",
          content: suggestion,
          timestamp: new Date(),
        },
      ]);
    } else {
      setInput(suggestion);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-foreground">Assistente de Insights</h2>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <div className="text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Como posso ajudar?</p>
              <p className="text-sm mt-1">
                Faça perguntas sobre seus dados ou escolha uma sugestão abaixo
              </p>
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors px-3 py-1.5"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>

            {/* Fallback Reports */}
            <div className="mt-6">
              <p className="text-xs text-muted-foreground mb-3">Relatórios prontos:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((s) => (
                  <Badge
                    key={s.key}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => handleSuggestionClick(s.label)}
                  >
                    {s.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.type === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2",
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Analisando...</span>
                </div>
              </div>
            )}

            {/* Next Steps */}
            {nextSteps.length > 0 && !isLoading && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Próximos passos sugeridos:</p>
                <div className="flex flex-wrap gap-2">
                  {nextSteps.map((step, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors"
                      onClick={() => {
                        setInput(step);
                        textareaRef.current?.focus();
                      }}
                    >
                      {step}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre seus dados... (ex: Qual a margem do último trimestre?)"
            className="min-h-[44px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
