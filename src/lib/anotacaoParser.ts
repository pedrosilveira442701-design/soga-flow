import { AnotacaoPriority, AnotacaoType } from "@/hooks/useAnotacoes";
import { addHours, addDays, addWeeks, startOfDay, setHours, setMinutes } from "date-fns";

export interface ParsedAnotacao {
  title: string;
  priority?: AnotacaoPriority;
  type?: AnotacaoType;
  tags?: string[];
  reminderDatetime?: Date;
}

const priorityKeywords: Record<string, AnotacaoPriority> = {
  "@alta": "alta",
  "@urgente": "alta",
  "@high": "alta",
  "@media": "media",
  "@normal": "media",
  "@medium": "media",
  "@baixa": "baixa",
  "@low": "baixa",
};

const typeKeywords: Record<string, AnotacaoType> = {
  "ligar": "ligacao",
  "telefonar": "ligacao",
  "call": "ligacao",
  "orçamento": "orcamento",
  "orcamento": "orcamento",
  "cotação": "orcamento",
  "quote": "orcamento",
  "follow": "follow_up",
  "followup": "follow_up",
  "acompanhar": "follow_up",
  "visita": "visita",
  "visit": "visita",
  "reunião": "reuniao",
  "reuniao": "reuniao",
  "meeting": "reuniao",
};

const timeKeywords: Record<string, (now: Date) => Date> = {
  "agora": (now) => addMinutes(now, 10),
  "daqui 1h": (now) => addHours(now, 1),
  "daqui 2h": (now) => addHours(now, 2),
  "hoje": (now) => setHours(setMinutes(now, 0), 18),
  "amanhã": (now) => setHours(startOfDay(addDays(now, 1)), 9),
  "amanha": (now) => setHours(startOfDay(addDays(now, 1)), 9),
  "próxima semana": (now) => setHours(startOfDay(addWeeks(now, 1)), 9),
  "proxima semana": (now) => setHours(startOfDay(addWeeks(now, 1)), 9),
  "semana que vem": (now) => setHours(startOfDay(addWeeks(now, 1)), 9),
};

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

export function parseAnotacaoInput(input: string): ParsedAnotacao {
  const now = new Date();
  let cleanedTitle = input;
  const result: ParsedAnotacao = {
    title: input,
    tags: [],
  };

  // Extract priority (@alta, @media, @baixa)
  Object.entries(priorityKeywords).forEach(([keyword, priority]) => {
    if (input.toLowerCase().includes(keyword)) {
      result.priority = priority;
      cleanedTitle = cleanedTitle.replace(new RegExp(keyword, "gi"), "").trim();
    }
  });

  // Extract type (ligar, orçamento, etc.)
  Object.entries(typeKeywords).forEach(([keyword, type]) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    if (regex.test(input.toLowerCase())) {
      result.type = type;
      // Don't remove type keywords from title as they're part of the description
    }
  });

  // Extract tags (#tag)
  const tagMatches = input.match(/#[\wáàâãéèêíïóôõöúçñ]+/gi);
  if (tagMatches) {
    result.tags = tagMatches.map((tag) => tag.substring(1).toLowerCase());
    tagMatches.forEach((tag) => {
      cleanedTitle = cleanedTitle.replace(tag, "").trim();
    });
  }

  // Extract time references
  Object.entries(timeKeywords).forEach(([keyword, dateFunc]) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    if (regex.test(input.toLowerCase())) {
      result.reminderDatetime = dateFunc(now);
      cleanedTitle = cleanedTitle.replace(regex, "").trim();
    }
  });

  // Extract specific time patterns (9h, 14h30, 09:00)
  const timePattern = /(\d{1,2})(?::(\d{2}))?h?/i;
  const timeMatch = input.match(timePattern);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      // If we already have a date from keywords, use it
      const baseDate = result.reminderDatetime || setHours(startOfDay(addDays(now, 1)), 0);
      result.reminderDatetime = setMinutes(setHours(baseDate, hour), minute);
      cleanedTitle = cleanedTitle.replace(timeMatch[0], "").trim();
    }
  }

  // Clean up multiple spaces
  result.title = cleanedTitle.replace(/\s+/g, " ").trim();

  // Default to "agora + 10min" if no time specified
  if (!result.reminderDatetime) {
    result.reminderDatetime = addMinutes(now, 10);
  }

  return result;
}
