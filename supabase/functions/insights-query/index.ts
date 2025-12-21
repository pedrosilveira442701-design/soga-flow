import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// DEFINIÇÕES DE NEGÓCIO - Status canônicos (alinhados com as telas)
// ============================================================================
const STATUS_DEFINITIONS = {
  // Propostas
  proposta_aberta: ["aberta"],
  proposta_fechada: ["fechada"],
  proposta_perdida: ["perdida"],
  proposta_repouso: ["repouso"],
  // Vendas/Contratos
  venda_ativa: ["ativo"],
  venda_concluida: ["concluido"],
  venda_cancelada: ["cancelado"],
  // Financeiro
  financeiro_pendente: ["pendente"],
  financeiro_pago: ["pago"],
  financeiro_atrasado: ["atrasado"],
  financeiro_aberto: ["pendente", "atrasado"], // A receber
  // Leads
  lead_aberto: ["contato", "visita_agendada", "visita_realizada", "proposta_pendente", "proposta", "em_analise"],
  lead_ganho: ["contrato", "execucao", "finalizado"],
  lead_perdido: ["perdido"],
  lead_repouso: ["repouso"],
  // Obras
  obra_andamento: ["mobilizacao", "execucao", "acabamento"],
  obra_concluida: ["concluida"],
  obra_pausada: ["pausada"],
  // Visitas
  visita_pendente: ["agendar", "marcada"],
  visita_atrasada: ["atrasada"],
  visita_concluida: ["concluida"],
};

// Mapeamento de entidade para view
const ENTITY_TO_VIEW: Record<string, string> = {
  propostas: "vw_propostas",
  vendas: "vw_vendas",
  contratos: "vw_vendas",
  financeiro: "vw_financeiro",
  parcelas: "vw_financeiro",
  leads: "vw_leads",
  obras: "vw_obras",
  visitas: "vw_visitas",
  clientes: "vw_clientes",
  pool: "vw_insights_pool",
};

// Mapeamento de métrica para SQL
const METRIC_TO_SQL: Record<string, { select: string; field: string }> = {
  count: { select: "COUNT(*)", field: "quantidade" },
  sum_valor_total: { select: "SUM(valor_total)", field: "valor_total" },
  sum_valor_liquido: { select: "SUM(valor_liquido)", field: "valor_liquido" },
  sum_valor: { select: "SUM(valor)", field: "valor" },
  sum_m2: { select: "SUM(m2)", field: "m2_total" },
  avg_margem: { select: "AVG(margem_pct)", field: "margem_media" },
  avg_dias_aberta: { select: "AVG(dias_aberta)", field: "dias_aberta_media" },
};

// Interface para o JSON estruturado retornado pela IA
interface InsightIntent {
  intent: "snapshot" | "aggregate" | "breakdown" | "time_series";
  entity: string;
  metric: string;
  filters: {
    status?: string;
    cliente?: string;
    canal?: string;
    servico?: string;
    tipo?: string;
  };
  dateRange: {
    start: string | null;
    end: string | null;
  };
  groupBy: string | null;
  wantsChart: boolean;
  textTemplate: string;
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat("pt-BR", { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  }).format(value);
}

// Resolver termos relativos de data para datas reais
function resolveRelativeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  
  const lowered = String(dateStr).toLowerCase().trim();
  
  // Termos relativos comuns que a IA pode retornar
  if (lowered.includes("start_of_current_month") || lowered.includes("início do mês") || lowered === "inicio_mes_atual") {
    return new Date(year, month, 1).toISOString().split('T')[0];
  }
  if (lowered.includes("end_of_current_month") || lowered.includes("fim do mês") || lowered === "fim_mes_atual") {
    return new Date(year, month + 1, 0).toISOString().split('T')[0];
  }
  if (lowered.includes("start_of_year") || lowered === "inicio_ano") {
    return new Date(year, 0, 1).toISOString().split('T')[0];
  }
  if (lowered.includes("end_of_year") || lowered === "fim_ano") {
    return new Date(year, 11, 31).toISOString().split('T')[0];
  }
  if (lowered === "today" || lowered === "hoje") {
    return today.toISOString().split('T')[0];
  }
  if (lowered === "yesterday" || lowered === "ontem") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  
  // Se já é uma data válida no formato YYYY-MM-DD, retornar como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(lowered)) {
    return lowered;
  }
  
  // Se não é um termo reconhecido nem uma data válida, retornar null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lowered)) {
    console.log(`Data inválida ou termo não reconhecido: ${dateStr}, ignorando`);
    return null;
  }
  
  return dateStr;
}

// Normalizar datas inválidas (ex: 31/06 -> 30/06)
function normalizeDate(day: number, month: number, year: number): Date {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)) {
    daysInMonth[1] = 29;
  }
  const maxDay = daysInMonth[month - 1] || 31;
  return new Date(year, month - 1, Math.min(day, maxDay));
}


function parseDateString(dateStr: string): { date: string; corrected: boolean; original: string } {
  const original = dateStr;
  
  let match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    const correctedDate = normalizeDate(parseInt(day), parseInt(month), parseInt(year));
    const formatted = correctedDate.toISOString().split('T')[0];
    return { date: formatted, corrected: correctedDate.getDate() !== parseInt(day), original };
  }
  
  match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    const correctedDate = normalizeDate(parseInt(day), parseInt(month), parseInt(year));
    const formatted = correctedDate.toISOString().split('T')[0];
    return { date: formatted, corrected: correctedDate.getDate() !== parseInt(day), original };
  }
  
  return { date: dateStr, corrected: false, original };
}

// Extrair datas da pergunta
function extractDatesFromQuestion(pergunta: string): { startDate?: string; endDate?: string; corrections: string[] } {
  const corrections: string[] = [];
  let startDate: string | undefined;
  let endDate: string | undefined;
  
  const datePatterns = [
    /de\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(?:a|até|ate)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /entre\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+e\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(?:a|até|ate|-)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /de\s+(\d{4}-\d{2}-\d{2})\s+(?:a|até|ate)\s+(\d{4}-\d{2}-\d{2})/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = pergunta.match(pattern);
    if (match) {
      const start = parseDateString(match[1]);
      const end = parseDateString(match[2]);
      
      if (start.corrected) corrections.push(`Ajustei ${start.original} para ${start.date}`);
      if (end.corrected) corrections.push(`Ajustei ${end.original} para ${end.date}`);
      
      startDate = start.date;
      endDate = end.date;
      break;
    }
  }
  
  return { startDate, endDate, corrections };
}

// Validar SQL básico
function validateSQL(sql: string): { valid: boolean; error?: string } {
  const normalizedSQL = sql.toUpperCase().trim();
  
  const blockedKeywords = [
    "INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "TRUNCATE",
    "GRANT", "REVOKE", "EXECUTE", "EXEC", "CALL", "COMMIT", "ROLLBACK"
  ];

  for (const keyword of blockedKeywords) {
    if (new RegExp(`\\b${keyword}\\b`, "i").test(normalizedSQL)) {
      return { valid: false, error: `Operação '${keyword}' não permitida` };
    }
  }

  if (!normalizedSQL.startsWith("SELECT")) {
    return { valid: false, error: "Apenas consultas SELECT são permitidas" };
  }

  return { valid: true };
}

// ============================================================================
// SQL BUILDER DETERMINÍSTICO
// ============================================================================

function buildSQL(intent: InsightIntent, userId: string): string {
  const view = ENTITY_TO_VIEW[intent.entity] || "vw_propostas";
  const metricInfo = METRIC_TO_SQL[intent.metric] || METRIC_TO_SQL.count;
  
  let selectClause = "";
  let groupByClause = "";
  let orderByClause = "";
  
  // Construir SELECT baseado no intent
  if (intent.intent === "snapshot" || intent.intent === "aggregate") {
    // Agregação simples
    selectClause = `${metricInfo.select} AS ${metricInfo.field}`;
  } else if (intent.intent === "breakdown" && intent.groupBy) {
    // Breakdown por categoria
    selectClause = `${intent.groupBy}, ${metricInfo.select} AS ${metricInfo.field}`;
    groupByClause = `GROUP BY ${intent.groupBy}`;
    orderByClause = `ORDER BY ${metricInfo.field} DESC`;
  } else if (intent.intent === "time_series" && intent.groupBy) {
    // Série temporal
    selectClause = `${intent.groupBy}, ${metricInfo.select} AS ${metricInfo.field}`;
    groupByClause = `GROUP BY ${intent.groupBy}`;
    orderByClause = `ORDER BY ${intent.groupBy}`;
  } else {
    selectClause = "*";
  }
  
  // Construir WHERE
  const whereConditions: string[] = [];
  
  // Garantir que filters e dateRange existam
  const filters = intent.filters || {};
  const dateRange = intent.dateRange || { start: null, end: null };
  
  // Filtro de status
  if (filters.status) {
    const statusKey = `${intent.entity.replace(/s$/, '')}_${filters.status}`;
    const statusList = STATUS_DEFINITIONS[statusKey as keyof typeof STATUS_DEFINITIONS];
    
    if (statusList && statusList.length > 0) {
      if (statusList.length === 1) {
        whereConditions.push(`status = '${statusList[0]}'`);
      } else {
        whereConditions.push(`status IN (${statusList.map(s => `'${s}'`).join(", ")})`);
      }
    } else {
      // Fallback: usar o valor diretamente
      whereConditions.push(`status = '${filters.status}'`);
    }
  }
  
  // Filtro de tipo (para pool)
  if (filters.tipo) {
    whereConditions.push(`tipo = '${filters.tipo}'`);
  }
  
  // Filtro de cliente
  if (filters.cliente) {
    whereConditions.push(`cliente ILIKE '%${filters.cliente}%'`);
  }
  
  // Filtro de canal
  if (filters.canal) {
    whereConditions.push(`canal ILIKE '%${filters.canal}%'`);
  }
  
  // Filtro de serviço
  if (filters.servico) {
    whereConditions.push(`servico ILIKE '%${filters.servico}%'`);
  }
  
  // Filtro de período (APENAS se não é snapshot OU se usuário especificou datas)
  if (dateRange.start && dateRange.end) {
    whereConditions.push(`periodo_dia >= '${dateRange.start}'`);
    whereConditions.push(`periodo_dia <= '${dateRange.end}'`);
  }
  
  // Montar SQL final
  let sql = `SELECT ${selectClause} FROM ${view}`;
  
  if (whereConditions.length > 0) {
    sql += ` WHERE ${whereConditions.join(" AND ")}`;
  }
  
  if (groupByClause) sql += ` ${groupByClause}`;
  if (orderByClause) sql += ` ${orderByClause}`;
  
  sql += " LIMIT 100";
  
  return sql;
}

// ============================================================================
// GERAR TEXTO DE RESPOSTA PÓS-QUERY
// ============================================================================

function generateTextResponse(
  rows: Record<string, unknown>[],
  intent: InsightIntent,
  metricField: string
): string {
  const criterios: string[] = [];
  
  // Critério: entidade
  criterios.push(`Entidade: ${intent.entity}`);
  
  // Critério: status
  if (intent.filters?.status) {
    criterios.push(`Status: ${intent.filters.status}`);
  }
  
  // Critério: período
  if (intent.dateRange?.start && intent.dateRange?.end) {
    criterios.push(`Período: ${intent.dateRange.start} a ${intent.dateRange.end}`);
  } else {
    criterios.push(`Período: sem filtro de data`);
  }
  
  const criteriosStr = `\n\nCritérios: ${criterios.join(" | ")}`;
  
  if (rows.length === 0) {
    return `Não encontrei registros para esses critérios.${criteriosStr}`;
  }
  
  const firstRow = rows[0];
  
  // Para agregações simples (1 linha)
  if (rows.length === 1 && metricField in firstRow) {
    const value = Number(firstRow[metricField]) || 0;
    
    if (metricField === "quantidade" || intent.metric === "count") {
      const singular = intent.entity.replace(/s$/, '');
      const label = value === 1 ? singular : intent.entity;
      return `Há ${formatNumber(value)} ${label}.${criteriosStr}`;
    }
    
    if (metricField.includes("valor") || metricField === "valor_total" || metricField === "valor_liquido") {
      return `Total: ${formatCurrency(value)}.${criteriosStr}`;
    }
    
    if (metricField === "m2_total") {
      return `Total: ${formatNumber(value)} m².${criteriosStr}`;
    }
    
    if (metricField === "margem_media") {
      return `Margem média: ${formatNumber(value, 1)}%.${criteriosStr}`;
    }
    
    return `Resultado: ${formatNumber(value, 2)}.${criteriosStr}`;
  }
  
  // Para breakdowns/time series (múltiplas linhas)
  if (rows.length > 1) {
    // Calcular total se houver campo numérico
    let total = 0;
    const numericFields = ["valor_total", "valor_liquido", "valor", "quantidade", "m2_total"];
    const foundField = numericFields.find(f => f in firstRow);
    
    if (foundField) {
      total = rows.reduce((sum, r) => sum + (Number(r[foundField]) || 0), 0);
      
      if (foundField.includes("valor")) {
        return `${rows.length} registros encontrados. Total: ${formatCurrency(total)}.${criteriosStr}`;
      }
      return `${rows.length} registros encontrados. Total: ${formatNumber(total)}.${criteriosStr}`;
    }
    
    return `${rows.length} registros encontrados.${criteriosStr}`;
  }
  
  return `Resultado encontrado.${criteriosStr}`;
}

// ============================================================================
// RELATÓRIOS FALLBACK
// ============================================================================

const FALLBACK_REPORTS: Record<string, { intent: InsightIntent; description: string }> = {
  vendas_mes_cliente: {
    intent: {
      intent: "breakdown",
      entity: "vendas",
      metric: "sum_valor_total",
      filters: {},
      dateRange: { start: null, end: null },
      groupBy: "cliente",
      wantsChart: true,
      textTemplate: "Top clientes por valor de vendas",
    },
    description: "Top 10 clientes por valor total de vendas",
  },
  funil_por_estagio: {
    intent: {
      intent: "breakdown",
      entity: "leads",
      metric: "count",
      filters: {},
      dateRange: { start: null, end: null },
      groupBy: "status",
      wantsChart: true,
      textTemplate: "Distribuição de leads por estágio",
    },
    description: "Distribuição de leads por estágio do funil",
  },
  propostas_abertas: {
    intent: {
      intent: "snapshot",
      entity: "propostas",
      metric: "count",
      filters: { status: "aberta" },
      dateRange: { start: null, end: null },
      groupBy: null,
      wantsChart: false,
      textTemplate: "Contagem de propostas em aberto",
    },
    description: "Quantas propostas estão em aberto",
  },
  recebiveis_pendentes: {
    intent: {
      intent: "snapshot",
      entity: "financeiro",
      metric: "sum_valor",
      filters: { status: "aberta" },
      dateRange: { start: null, end: null },
      groupBy: null,
      wantsChart: false,
      textTemplate: "Total a receber",
    },
    description: "Valor total a receber (pendente + atrasado)",
  },
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pergunta, fallbackKey } = await req.json();

    if (!pergunta && !fallbackKey) {
      return new Response(JSON.stringify({ error: "Pergunta é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let intent: InsightIntent;
    let usedFallback = false;
    let confidence = 0.9;
    let explanation = "";
    let dateCorrections: string[] = [];

    // ========================================================================
    // PASSO 1: Obter intent estruturado da IA (ou usar fallback)
    // ========================================================================
    
    if (fallbackKey && FALLBACK_REPORTS[fallbackKey]) {
      intent = { ...FALLBACK_REPORTS[fallbackKey].intent };
      explanation = FALLBACK_REPORTS[fallbackKey].description;
      usedFallback = true;
      console.log(`Usando fallback: ${fallbackKey}`);
    } else if (lovableApiKey && pergunta) {
      // Extrair datas da pergunta ANTES de chamar a IA
      const extractedDates = extractDatesFromQuestion(pergunta);
      dateCorrections = extractedDates.corrections;
      
      const systemPrompt = `Você é um roteador de consultas analíticas. Analise a pergunta e retorne APENAS um JSON estruturado.

REGRAS CRÍTICAS:
1. Para perguntas de ESTADO ATUAL (em aberto, pendentes, atrasadas, etc.): intent = "snapshot", NÃO inclua datas
2. Para perguntas com PERÍODO (em dezembro, últimos 30 dias, de X a Y): intent = "aggregate" ou "time_series", inclua as datas
3. Para "quantas/quantos": metric = "count"
4. Para "valor total" ou "quanto": metric = "sum_valor_total" (propostas/vendas) ou "sum_valor" (financeiro)
5. Para "evolução" ou "gráfico por mês": intent = "time_series", groupBy = "periodo_mes", wantsChart = true

ENTIDADES DISPONÍVEIS:
- propostas: status pode ser "aberta", "fechada", "perdida", "repouso"
- vendas/contratos: status pode ser "ativo", "concluido", "cancelado"
- financeiro/parcelas: status pode ser "pendente", "pago", "atrasado", "aberta" (para a receber)
- leads: status = estágio do funil
- obras: status pode ser "andamento", "concluida", "pausada"
- visitas: status pode ser "pendente", "atrasada", "concluida"

RETORNE APENAS JSON (sem markdown):
{
  "intent": "snapshot|aggregate|breakdown|time_series",
  "entity": "propostas|vendas|financeiro|leads|obras|visitas",
  "metric": "count|sum_valor_total|sum_valor_liquido|sum_valor|sum_m2|avg_margem",
  "filters": {
    "status": "valor_do_status_ou_null",
    "cliente": "nome_cliente_ou_null",
    "canal": "canal_ou_null",
    "servico": "servico_ou_null"
  },
  "dateRange": {
    "start": "YYYY-MM-DD_ou_null",
    "end": "YYYY-MM-DD_ou_null"
  },
  "groupBy": "periodo_mes|periodo_dia|cliente|canal|servico|null",
  "wantsChart": true_ou_false,
  "textTemplate": "descrição_curta_do_que_será_respondido"
}

EXEMPLOS:
- "Quantas propostas estão em aberto?" → intent="snapshot", entity="propostas", metric="count", filters.status="aberta", dateRange={start:null,end:null}
- "Qual o valor total das propostas em aberto?" → intent="snapshot", entity="propostas", metric="sum_valor_total", filters.status="aberta"
- "Vendas de dezembro/2025" → intent="aggregate", entity="vendas", metric="sum_valor_total", dateRange={start:"2025-12-01",end:"2025-12-31"}
- "Evolução de vendas por mês em 2025" → intent="time_series", entity="vendas", metric="sum_valor_total", groupBy="periodo_mes", wantsChart=true`;

      const userPrompt = `Pergunta: "${pergunta}"
${dateCorrections.length > 0 ? `Correções de data aplicadas: ${dateCorrections.join(', ')}` : ''}
${extractedDates.startDate ? `Datas detectadas: ${extractedDates.startDate} a ${extractedDates.endDate}` : 'Nenhuma data explícita detectada'}`;

      try {
        console.log("Chamando Lovable AI para extrair intent...");
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });

        if (!aiResponse.ok) {
          throw new Error(`AI API error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        console.log("Resposta da IA:", content);

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Resposta da IA inválida");
        }

        const parsedIntent = JSON.parse(jsonMatch[0]);
        
        // Garantir que filters e dateRange existam com defaults
        intent = {
          intent: parsedIntent.intent || "snapshot",
          entity: parsedIntent.entity || "propostas",
          metric: parsedIntent.metric || "count",
          filters: {
            status: parsedIntent.filters?.status || null,
            cliente: parsedIntent.filters?.cliente || null,
            canal: parsedIntent.filters?.canal || null,
            servico: parsedIntent.filters?.servico || null,
            tipo: parsedIntent.filters?.tipo || null,
          },
          dateRange: {
            start: resolveRelativeDate(parsedIntent.dateRange?.start),
            end: resolveRelativeDate(parsedIntent.dateRange?.end),
          },
          groupBy: parsedIntent.groupBy || null,
          wantsChart: parsedIntent.wantsChart || false,
          textTemplate: parsedIntent.textTemplate || "",
        };
        
        // Se IA retornou datas mas a pergunta é claramente snapshot, remover datas
        if (intent.intent === "snapshot") {
          intent.dateRange = { start: null, end: null };
        }
        
        // Se usuário especificou datas na pergunta, usar essas
        if (extractedDates.startDate && extractedDates.endDate) {
          intent.dateRange = {
            start: extractedDates.startDate,
            end: extractedDates.endDate,
          };
        }
        
        console.log("Intent extraído:", JSON.stringify(intent));

      } catch (aiError) {
        console.error("Erro na IA, usando fallback:", aiError);
        intent = { ...FALLBACK_REPORTS.propostas_abertas.intent };
        confidence = 0.4;
        explanation = "Não foi possível processar a pergunta. Mostrando propostas em aberto.";
        usedFallback = true;
      }
    } else {
      intent = { ...FALLBACK_REPORTS.propostas_abertas.intent };
      confidence = 0.4;
      explanation = "IA não configurada. Mostrando relatório padrão.";
      usedFallback = true;
    }

    // ========================================================================
    // PASSO 2: Gerar SQL determinístico a partir do intent
    // ========================================================================
    
    const sqlQuery = buildSQL(intent, user.id);
    console.log("SQL gerado:", sqlQuery);

    // Validar SQL
    const validation = validateSQL(sqlQuery);
    if (!validation.valid) {
      console.error("SQL inválido:", validation.error);
      return new Response(JSON.stringify({
        error: validation.error,
        textResponse: "Erro na geração da consulta. Tente reformular sua pergunta.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================================
    // PASSO 3: Executar SQL via RPC
    // ========================================================================
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: queryResult, error: queryError } = await supabaseAdmin.rpc("exec_readonly_sql", {
      query_text: sqlQuery,
      p_user_id: user.id,
    });

    let rows: Record<string, unknown>[] = [];
    
    if (queryError) {
      console.error("Erro RPC:", queryError);
      
      // Fallback: query direta
      const view = ENTITY_TO_VIEW[intent.entity] || "vw_propostas";
      let query = supabaseUser.from(view).select("*");
      
      // Aplicar filtro de status
      if (intent.filters.status) {
        const statusKey = `${intent.entity.replace(/s$/, '')}_${intent.filters.status}`;
        const statusList = STATUS_DEFINITIONS[statusKey as keyof typeof STATUS_DEFINITIONS];
        
        if (statusList && statusList.length === 1) {
          query = query.eq("status", statusList[0]);
        } else if (statusList && statusList.length > 1) {
          query = query.in("status", statusList);
        } else {
          query = query.eq("status", intent.filters.status);
        }
      }
      
      // Aplicar período apenas se não for snapshot
      if (intent.intent !== "snapshot" && intent.dateRange.start && intent.dateRange.end) {
        query = query.gte("periodo_dia", intent.dateRange.start).lte("periodo_dia", intent.dateRange.end);
      }
      
      const { data: directResult, error: directError } = await query.limit(100);
      
      if (directError) {
        console.error("Erro fallback:", directError);
        throw directError;
      }
      
      rows = directResult || [];
      console.log(`Fallback retornou ${rows.length} registros`);
    } else {
      rows = queryResult || [];
    }

    const executionTime = Date.now() - startTime;

    // ========================================================================
    // PASSO 4: Gerar resposta textual PÓS-QUERY
    // ========================================================================
    
    const metricInfo = METRIC_TO_SQL[intent.metric] || METRIC_TO_SQL.count;
    let textResponse = generateTextResponse(rows, intent, metricInfo.field);
    
    // Adicionar correções de data se houver
    if (dateCorrections.length > 0) {
      textResponse = dateCorrections.join('. ') + '. ' + textResponse;
    }

    // Calcular KPIs
    const kpis: Record<string, number> = {};
    if (rows.length > 0) {
      const firstRow = rows[0];
      
      if (metricInfo.field in firstRow) {
        kpis[metricInfo.field] = Number(firstRow[metricInfo.field]) || 0;
      }
      
      // Para múltiplas linhas, calcular totais
      if (rows.length > 1) {
        ["valor_total", "valor_liquido", "valor", "m2_total", "quantidade"].forEach(field => {
          if (field in firstRow) {
            kpis[field] = rows.reduce((sum, r) => sum + (Number(r[field]) || 0), 0);
          }
        });
      }
      
      kpis.total_registros = rows.length;
    }

    // Determinar se deve mostrar gráfico
    const shouldShowChart = intent.wantsChart && rows.length > 1 && intent.groupBy;
    
    // Determinar tipo de gráfico e eixos
    let chartType = "table";
    let xAxis = "";
    let yAxis: string[] = [];
    
    if (shouldShowChart && intent.groupBy) {
      chartType = intent.intent === "time_series" ? "line" : "bar";
      xAxis = intent.groupBy;
      yAxis = [metricInfo.field];
    }

    // Período usado
    const periodDescription = intent.dateRange.start && intent.dateRange.end
      ? `${intent.dateRange.start} a ${intent.dateRange.end}`
      : "sem filtro de data";

    const resultado = {
      data: rows,
      kpis,
      sql: sqlQuery,
      chartType,
      xAxis,
      yAxis,
      confidence,
      explanation,
      textResponse,
      usedFallback,
      rowCount: rows.length,
      executionTimeMs: executionTime,
      wantsChart: shouldShowChart,
      periodUsed: periodDescription,
      isSnapshot: intent.intent === "snapshot",
      statusUsed: intent.filters.status ? `status = '${intent.filters.status}'` : null,
      viewUsed: ENTITY_TO_VIEW[intent.entity] || "vw_propostas",
      intent, // Incluir intent para debug
    };

    // Salvar no cache
    const cacheHash = Math.random().toString(36).substring(2);
    try {
      await supabaseUser.from("insights_cache").upsert({
        user_id: user.id,
        hash: cacheHash,
        pergunta: pergunta || fallbackKey,
        resultado,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }, { onConflict: "hash" });
    } catch (e) {
      console.log("Cache save error:", e);
    }

    // Log de auditoria
    try {
      await supabaseUser.from("insights_audit_logs").insert({
        user_id: user.id,
        pergunta: pergunta || fallbackKey,
        sql_executado: sqlQuery,
        filtros: { intent, dateCorrections },
        tempo_execucao_ms: executionTime,
        linhas_retornadas: rows.length,
        confianca: confidence,
        sucesso: true,
      });
    } catch (e) {
      console.log("Audit log error:", e);
    }

    return new Response(JSON.stringify({
      ...resultado,
      cached: false,
      cacheHash,
      nextSteps: generateNextSteps(pergunta, intent),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função insights-query:", error);
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erro desconhecido",
      textResponse: "Ocorreu um erro ao processar sua pergunta. Tente novamente.",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateNextSteps(pergunta: string | null, intent: InsightIntent): string[] {
  const steps: string[] = [];
  
  if (!pergunta) return steps;
  
  const lowerPergunta = pergunta.toLowerCase();
  
  if (intent.entity === "propostas") {
    if (intent.filters.status === "aberta") {
      steps.push("Qual o valor total das propostas em aberto?");
      steps.push("Quais propostas estão há mais de 30 dias abertas?");
    } else {
      steps.push("Quantas propostas estão em aberto?");
    }
  }
  
  if (intent.entity === "vendas") {
    steps.push("Qual a evolução de vendas por mês?");
    steps.push("Quais os melhores canais de vendas?");
  }
  
  if (intent.entity === "financeiro") {
    steps.push("Quanto tenho a receber?");
    steps.push("Quais parcelas estão atrasadas?");
  }
  
  if (!intent.wantsChart && intent.intent !== "snapshot") {
    steps.push("Mostre em gráfico");
  }
  
  return steps.slice(0, 3);
}
