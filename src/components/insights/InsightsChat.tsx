import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
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
  lastResponse?: string;
}

const QUICK_SUGGESTIONS = [
  "Qual o total de vendas este mês?",
  "Qual a margem média dos últimos 3 meses?",
  "Quantas propostas estão em aberto?",
  "Top 5 clientes por receita",
  "Qual o ticket médio de vendas?",
];

export function InsightsChat({
  onSendMessage,
  onSelectSuggestion,
  isLoading,
  suggestions,
  nextSteps = [],
  lastResponse,
}: InsightsChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Adicionar resposta da IA quando chegar
  useEffect(() => {
    if (lastResponse && !isLoading) {
      const lastUserMessage = messages.filter(m => m.type === "user").slice(-1)[0];
      const lastAssistantMessage = messages.filter(m => m.type === "assistant").slice(-1)[0];
      
      // Só adiciona se for uma nova resposta (diferente da última)
      if (lastUserMessage && (!lastAssistantMessage || lastAssistantMessage.content !== lastResponse)) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: "assistant",
          content: lastResponse,
          timestamp: new Date(),
        }]);
      }
    }
  }, [lastResponse, isLoading]);

  // Scroll para o final quando novas mensagens chegarem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
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
    const fallback = suggestions.find((s) => s.label === suggestion);
    if (fallback) {
      onSelectSuggestion(fallback.key);
      setMessages(prev => [
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

  const handleQuickSuggestion = (suggestion: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "user",
        content: suggestion,
        timestamp: new Date(),
      },
    ]);
    onSendMessage(suggestion);
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
          <div className="text-center py-6 space-y-4">
            <div className="text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-base font-medium">Como posso ajudar?</p>
              <p className="text-sm mt-1">
                Pergunte sobre vendas, propostas, leads, margem...
              </p>
            </div>

            {/* Sugestões rápidas */}
            <div className="space-y-2 mt-4">
              <p className="text-xs text-muted-foreground">Perguntas frequentes:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_SUGGESTIONS.slice(0, 3).map((suggestion) => (
                  <Badge
                    key={suggestion}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors px-3 py-1.5 text-xs"
                    onClick={() => handleQuickSuggestion(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Relatórios prontos */}
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Relatórios prontos:</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {suggestions.slice(0, 6).map((s) => (
                  <Badge
                    key={s.key}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 transition-colors text-xs"
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
                    "max-w-[90%] rounded-lg px-3 py-2",
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Analisando...</span>
                </div>
              </div>
            )}

            {/* Próximos passos */}
            {nextSteps.length > 0 && !isLoading && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Continuar explorando:</p>
                <div className="flex flex-wrap gap-1.5">
                  {nextSteps.map((step, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors text-xs"
                      onClick={() => handleQuickSuggestion(step)}
                    >
                      {step}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
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
            placeholder="Pergunte sobre seus dados..."
            className="min-h-[44px] max-h-[100px] resize-none text-sm"
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
