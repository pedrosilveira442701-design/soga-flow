import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Views permitidas para consulta
const ALLOWED_VIEWS = [
  "vw_vendas",
  "vw_propostas",
  "vw_leads",
  "vw_visitas",
  "vw_obras",
  "vw_financeiro",
  "vw_clientes",
];

// Schema das views para contexto da IA
const VIEW_SCHEMAS = {
  vw_vendas: "id, user_id, created_at, periodo_dia, periodo_mes, periodo_ano, cliente, cidade, bairro, canal, servico, m2, valor_total, valor_liquido, margem_pct, status, forma_pagamento",
  vw_propostas: "id, user_id, created_at, periodo_dia, periodo_mes, periodo_ano, cliente, cidade, bairro, canal, servico, m2, valor_total, valor_liquido, margem_pct, status, forma_pagamento, desconto, dias_aberta",
  vw_leads: "id, user_id, created_at, periodo_dia, periodo_mes, periodo_ano, cliente, cidade, bairro, canal, servico, m2, valor_potencial, estagio, motivo_perda, responsavel, dias_no_funil, first_response_minutes",
  vw_visitas: "id, user_id, created_at, periodo_dia, periodo_mes, periodo_ano, cliente, cidade, bairro, canal, servico, m2, status, realizada, responsavel",
  vw_obras: "id, user_id, created_at, periodo_dia, periodo_mes, periodo_ano, cliente, cidade, bairro, servico, m2, valor_total, status, progresso_pct, responsavel_obra",
  vw_financeiro: "id, user_id, created_at, periodo_dia, periodo_mes, periodo_ano, cliente, cidade, bairro, valor, status, numero_parcela, forma, data_pagamento, dias_atraso",
  vw_clientes: "id, user_id, created_at, cliente, cidade, bairro, status, total_contratos, valor_total_contratos, total_propostas",
};

// Relatórios prontos (fallback)
const FALLBACK_REPORTS: Record<string, { sql: string; chart: string; x: string; y: string[]; description: string }> = {
  vendas_mes_cliente: {
    sql: `SELECT cliente, SUM(valor_total) as valor_total, SUM(valor_liquido) as valor_liquido, AVG(margem_pct) as margem_pct, SUM(m2) as m2, COUNT(*) as qtd FROM vw_vendas GROUP BY cliente ORDER BY valor_total DESC LIMIT 10`,
    chart: "bar",
    x: "cliente",
    y: ["valor_total", "valor_liquido"],
    description: "Top 10 clientes por valor total de vendas",
  },
  margem_ultimos_6_meses: {
    sql: `SELECT periodo_mes, AVG(margem_pct) as margem_pct, SUM(valor_total) as valor_total, COUNT(*) as qtd FROM vw_vendas WHERE periodo_dia >= CURRENT_DATE - INTERVAL '6 months' GROUP BY periodo_mes ORDER BY periodo_mes`,
    chart: "line",
    x: "periodo_mes",
    y: ["margem_pct"],
    description: "Evolução da margem média nos últimos 6 meses",
  },
  melhor_canal: {
    sql: `SELECT canal, COUNT(*) as total, SUM(valor_total) as receita FROM vw_vendas WHERE canal IS NOT NULL GROUP BY canal ORDER BY receita DESC LIMIT 10`,
    chart: "bar",
    x: "canal",
    y: ["receita", "total"],
    description: "Canais de vendas ordenados por receita",
  },
  funil_por_estagio: {
    sql: `SELECT estagio, COUNT(*) as total, SUM(valor_potencial) as valor_potencial FROM vw_leads GROUP BY estagio ORDER BY CASE estagio WHEN 'contato' THEN 1 WHEN 'visita_agendada' THEN 2 WHEN 'visita_realizada' THEN 3 WHEN 'proposta_pendente' THEN 4 WHEN 'proposta' THEN 5 WHEN 'contrato' THEN 6 WHEN 'execucao' THEN 7 WHEN 'finalizado' THEN 8 ELSE 9 END`,
    chart: "bar",
    x: "estagio",
    y: ["total"],
    description: "Distribuição de leads por estágio do funil",
  },
  servicos_mais_vendidos: {
    sql: `SELECT servico, SUM(m2) as m2_total, SUM(valor_total) as receita, COUNT(*) as total FROM vw_vendas WHERE servico IS NOT NULL GROUP BY servico ORDER BY receita DESC LIMIT 10`,
    chart: "bar",
    x: "servico",
    y: ["receita", "m2_total"],
    description: "Serviços mais vendidos por receita",
  },
  geografia_vendas: {
    sql: `SELECT COALESCE(bairro, cidade, 'Não informado') as regiao, COUNT(*) as total, SUM(valor_total) as receita, AVG(valor_total) as ticket_medio FROM vw_vendas GROUP BY COALESCE(bairro, cidade, 'Não informado') ORDER BY receita DESC LIMIT 15`,
    chart: "bar",
    x: "regiao",
    y: ["receita", "ticket_medio"],
    description: "Vendas por região geográfica",
  },
  aging_propostas: {
    sql: `SELECT CASE WHEN dias_aberta <= 7 THEN '0-7 dias' WHEN dias_aberta <= 15 THEN '8-15 dias' WHEN dias_aberta <= 30 THEN '16-30 dias' WHEN dias_aberta <= 60 THEN '31-60 dias' ELSE '60+ dias' END as faixa, COUNT(*) as total, SUM(valor_total) as valor FROM vw_propostas WHERE status IN ('aberta', 'repouso') GROUP BY faixa ORDER BY MIN(dias_aberta)`,
    chart: "bar",
    x: "faixa",
    y: ["total", "valor"],
    description: "Aging de propostas abertas por tempo",
  },
  previsao_recebiveis: {
    sql: `SELECT CASE WHEN periodo_dia <= CURRENT_DATE + INTERVAL '30 days' THEN '0-30 dias' WHEN periodo_dia <= CURRENT_DATE + INTERVAL '60 days' THEN '31-60 dias' WHEN periodo_dia <= CURRENT_DATE + INTERVAL '90 days' THEN '61-90 dias' ELSE '90+ dias' END as faixa, SUM(valor) as valor, COUNT(*) as parcelas FROM vw_financeiro WHERE status = 'pendente' GROUP BY faixa`,
    chart: "bar",
    x: "faixa",
    y: ["valor", "parcelas"],
    description: "Previsão de recebíveis por período",
  },
};

// Função para validar e sanitizar SQL
function validateSQL(sql: string): { valid: boolean; error?: string } {
  const normalizedSQL = sql.toUpperCase().trim();

  const blockedKeywords = [
    "INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "TRUNCATE",
    "GRANT", "REVOKE", "EXECUTE", "EXEC", "CALL", "COMMIT", "ROLLBACK",
    "SAVEPOINT", "DECLARE", "FETCH", "OPEN", "CLOSE", "DEALLOCATE"
  ];

  if (/\bBEGIN\s+(TRANSACTION|WORK|ATOMIC)\b/i.test(sql)) {
    return { valid: false, error: "Operação 'BEGIN TRANSACTION' não permitida" };
  }
  if (/\bSET\s+(ROLE|SESSION|LOCAL|TIME\s+ZONE|TRANSACTION)\b/i.test(sql)) {
    return { valid: false, error: "Operação 'SET' não permitida" };
  }

  for (const keyword of blockedKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(normalizedSQL)) {
      return { valid: false, error: `Operação '${keyword}' não permitida` };
    }
  }

  if (sql.includes(";") && sql.indexOf(";") < sql.length - 1) {
    return { valid: false, error: "Múltiplas instruções não são permitidas" };
  }

  if (sql.includes("--") || sql.includes("/*")) {
    return { valid: false, error: "Comentários não são permitidos" };
  }

  const fromMatches = sql.match(/FROM\s+(\w+)/gi) || [];
  const joinMatches = sql.match(/JOIN\s+(\w+)/gi) || [];
  const allTables = [...fromMatches, ...joinMatches].map(m =>
    m.replace(/FROM\s+/i, "").replace(/JOIN\s+/i, "").toLowerCase()
  );

  for (const table of allTables) {
    if (!ALLOWED_VIEWS.includes(table)) {
      return { valid: false, error: `View '${table}' não permitida. Use apenas: ${ALLOWED_VIEWS.join(", ")}` };
    }
  }

  if (!normalizedSQL.startsWith("SELECT")) {
    return { valid: false, error: "Apenas consultas SELECT são permitidas" };
  }

  return { valid: true };
}

// Função para garantir LIMIT
function ensureLimit(sql: string, maxLimit: number = 500): string {
  const hasLimit = /LIMIT\s+\d+/i.test(sql);
  if (!hasLimit) {
    return sql.replace(/;?\s*$/, ` LIMIT ${maxLimit}`);
  }
  return sql.replace(/LIMIT\s+(\d+)/i, (match, num) => {
    const limit = Math.min(parseInt(num), maxLimit);
    return `LIMIT ${limit}`;
  });
}

// Função para normalizar datas inválidas (ex: 31/06 -> 30/06)
function normalizeDateString(dateStr: string): { date: string; corrected: boolean; original: string } {
  const original = dateStr;
  
  // Tentar parsear formatos comuns: DD/MM/YYYY, YYYY-MM-DD
  let match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    const correctedDate = normalizeDate(parseInt(day), parseInt(month), parseInt(year));
    return { date: correctedDate.toISOString().split('T')[0], corrected: correctedDate.getDate() !== parseInt(day), original };
  }
  
  match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    const correctedDate = normalizeDate(parseInt(day), parseInt(month), parseInt(year));
    return { date: correctedDate.toISOString().split('T')[0], corrected: correctedDate.getDate() !== parseInt(day), original };
  }
  
  return { date: dateStr, corrected: false, original };
}

function normalizeDate(day: number, month: number, year: number): Date {
  // Dias máximos por mês
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Verificar ano bissexto
  if ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)) {
    daysInMonth[1] = 29;
  }
  
  const maxDay = daysInMonth[month - 1] || 31;
  const correctedDay = Math.min(day, maxDay);
  
  return new Date(year, month - 1, correctedDay);
}

// Detectar se a pergunta pede gráfico/evolução
function shouldGenerateChart(pergunta: string): boolean {
  const chartKeywords = [
    "gráfico", "grafico", "evolução", "evolucao", "linha do tempo",
    "por mês", "por mes", "por dia", "mensal", "diário", "diario",
    "semana a semana", "mês a mês", "mes a mes", "tendência", "tendencia",
    "timeline", "chart", "nos últimos", "nos ultimos", "histórico", "historico"
  ];
  
  const lowerPergunta = pergunta.toLowerCase();
  return chartKeywords.some(kw => lowerPergunta.includes(kw));
}

// Extrair datas da pergunta do usuário
function extractDatesFromQuestion(pergunta: string): { startDate?: string; endDate?: string; corrections: string[] } {
  const corrections: string[] = [];
  let startDate: string | undefined;
  let endDate: string | undefined;
  
  // Padrões de data: DD/MM/YYYY ou YYYY-MM-DD
  const datePatterns = [
    /de\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(?:a|até|ate)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /entre\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+e\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(?:a|até|ate|-)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /de\s+(\d{4}-\d{2}-\d{2})\s+(?:a|até|ate)\s+(\d{4}-\d{2}-\d{2})/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = pergunta.match(pattern);
    if (match) {
      const start = normalizeDateString(match[1]);
      const end = normalizeDateString(match[2]);
      
      if (start.corrected) {
        corrections.push(`Ajustei ${start.original} para ${start.date}`);
      }
      if (end.corrected) {
        corrections.push(`Ajustei ${end.original} para ${end.date}`);
      }
      
      startDate = start.date;
      endDate = end.date;
      break;
    }
  }
  
  return { startDate, endDate, corrections };
}

// Gerar hash do cache
function generateCacheHash(pergunta: string, filtros: Record<string, unknown>): string {
  const content = JSON.stringify({ pergunta: pergunta.toLowerCase().trim(), filtros });
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Formatar valor monetário
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// Formatar número
function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat("pt-BR", { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  }).format(value);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
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

    const { pergunta, filtros = {}, fallbackKey } = await req.json();

    if (!pergunta && !fallbackKey) {
      return new Response(JSON.stringify({ error: "Pergunta é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extrair datas da pergunta (PRIORIDADE sobre filtros globais)
    const extractedDates = pergunta ? extractDatesFromQuestion(pergunta) : { corrections: [] };
    const dateCorrections = extractedDates.corrections;
    
    // Determinar datas finais: pergunta tem prioridade sobre filtros globais
    const finalStartDate = extractedDates.startDate || filtros.startDate;
    const finalEndDate = extractedDates.endDate || filtros.endDate;
    const usedQuestionDates = !!extractedDates.startDate || !!extractedDates.endDate;

    // Verificar cache
    const cacheHash = generateCacheHash(pergunta || fallbackKey, { startDate: finalStartDate, endDate: finalEndDate });
    const { data: cachedResult } = await supabaseUser
      .from("insights_cache")
      .select("resultado")
      .eq("hash", cacheHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cachedResult) {
      return new Response(JSON.stringify({
        ...cachedResult.resultado,
        cached: true,
        cacheHash,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sqlQuery: string;
    let chartType = "table";
    let xAxis = "";
    let yAxis: string[] = [];
    let confidence = 0.9;
    let explanation = "";
    let usedFallback = false;
    let wantsChart = false;
    let textResponse = "";

    // Se usar fallback diretamente
    if (fallbackKey && FALLBACK_REPORTS[fallbackKey]) {
      const fb = FALLBACK_REPORTS[fallbackKey];
      sqlQuery = fb.sql;
      chartType = fb.chart;
      xAxis = fb.x;
      yAxis = fb.y;
      explanation = fb.description;
      usedFallback = true;
      wantsChart = true; // Fallbacks sempre mostram gráfico
    } else if (lovableApiKey && pergunta) {
      // Detectar se quer gráfico
      wantsChart = shouldGenerateChart(pergunta);
      
      // Gerar SQL via IA
      const systemPrompt = `Você é um assistente de análise de dados de uma empresa de pisos (porcelanato líquido, epóxi, etc).
Sua tarefa é interpretar perguntas em português e gerar SQL para responder.

VIEWS DISPONÍVEIS (use APENAS estas):
${Object.entries(VIEW_SCHEMAS).map(([view, cols]) => `• ${view}: ${cols}`).join("\n")}

REGRAS OBRIGATÓRIAS DE SQL:
1. Use SOMENTE as views listadas acima
2. Gere APENAS SELECT (sem INSERT, UPDATE, DELETE, CREATE, etc)
3. SEMPRE adicione LIMIT (máximo 100)
4. Para valores monetários, use: valor_total (bruto), valor_liquido (líquido)
5. Margem: margem_pct (já em percentual)
6. Para filtrar por período, use APENAS: periodo_dia >= 'YYYY-MM-DD' AND periodo_dia <= 'YYYY-MM-DD'
7. NÃO use filtro created_at - use SOMENTE periodo_dia para datas
8. Para agrupar por mês: GROUP BY periodo_mes
9. Para totais, use: SUM(), COUNT(), AVG()
10. NÃO use CASE WHEN complexos desnecessariamente
11. NÃO use aspas duplas em alias
12. Para "total de propostas", use: SELECT SUM(valor_total) as valor_total, SUM(valor_liquido) as valor_liquido, COUNT(*) as qtd FROM vw_propostas

${wantsChart ? 'O usuário QUER um gráfico - inclua GROUP BY para série temporal ou categórica.' : 'O usuário NÃO pediu gráfico - retorne apenas agregação/totais com SUM, COUNT.'}

PERÍODO A USAR: ${finalStartDate && finalEndDate ? `De ${finalStartDate} até ${finalEndDate}. Use: periodo_dia >= '${finalStartDate}' AND periodo_dia <= '${finalEndDate}'` : 'Sem filtro de período específico'}

Responda APENAS com JSON válido (sem markdown):
{
  "sql": "SELECT ...",
  "chart_type": "${wantsChart ? 'bar|line|pie' : 'table'}",
  "x_axis": "coluna_x",
  "y_axis": ["coluna1"],
  "confidence": 0.9
}`;

      const userPrompt = `Pergunta: "${pergunta}"
${dateCorrections.length > 0 ? `Correções de data aplicadas: ${dateCorrections.join(', ')}` : ''}

Gere o SQL. NÃO use created_at, use periodo_dia para filtros de data.`;

      try {
        console.log("Chamando Lovable AI para gerar SQL...");
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
          const errorText = await aiResponse.text();
          console.error("AI API error:", aiResponse.status, errorText);
          throw new Error(`AI API error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        console.log("Resposta da IA:", content);

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Resposta da IA inválida");
        }

        const parsed = JSON.parse(jsonMatch[0]);
        sqlQuery = parsed.sql;
        chartType = wantsChart ? (parsed.chart_type || "bar") : "table";
        xAxis = parsed.x_axis || "";
        yAxis = parsed.y_axis || [];
        confidence = parsed.confidence || 0.7;
        // textResponse será gerado APÓS execução do SQL com valores reais

      } catch (aiError) {
        console.error("Erro na IA, usando fallback:", aiError);
        const fb = FALLBACK_REPORTS.vendas_mes_cliente;
        sqlQuery = fb.sql;
        chartType = "bar";
        xAxis = fb.x;
        yAxis = fb.y;
        confidence = 0.4;
        explanation = "Não foi possível processar a pergunta. Mostrando vendas por cliente.";
        usedFallback = true;
        wantsChart = true;
      }
    } else {
      // Sem API key, usar fallback
      const fb = FALLBACK_REPORTS.vendas_mes_cliente;
      sqlQuery = fb.sql;
      chartType = "bar";
      xAxis = fb.x;
      yAxis = fb.y;
      confidence = 0.4;
      explanation = "IA não configurada. Mostrando relatório padrão de vendas.";
      usedFallback = true;
      wantsChart = true;
    }

    // Validar SQL
    const validation = validateSQL(sqlQuery);
    if (!validation.valid) {
      console.error("SQL inválido:", sqlQuery, validation.error);
      // Tentar fallback automático
      const fb = FALLBACK_REPORTS.vendas_mes_cliente;
      sqlQuery = fb.sql;
      chartType = "bar";
      xAxis = fb.x;
      yAxis = fb.y;
      confidence = 0.3;
      explanation = `Erro na consulta: ${validation.error}. Mostrando relatório padrão.`;
      usedFallback = true;
      wantsChart = true;
    }

    // Garantir LIMIT
    sqlQuery = ensureLimit(sqlQuery);

    // Aplicar filtros de período (APENAS se não estão já na query E temos datas)
    // Evitar ranges duplos verificando se já tem filtro de periodo_dia
    if (finalStartDate && finalEndDate && !sqlQuery.toLowerCase().includes("periodo_dia")) {
      const whereClause = `periodo_dia >= '${finalStartDate}' AND periodo_dia <= '${finalEndDate}'`;
      
      if (sqlQuery.toUpperCase().includes("WHERE")) {
        sqlQuery = sqlQuery.replace(/WHERE/i, `WHERE ${whereClause} AND`);
      } else if (sqlQuery.toUpperCase().includes("GROUP BY")) {
        sqlQuery = sqlQuery.replace(/GROUP BY/i, `WHERE ${whereClause} GROUP BY`);
      } else if (sqlQuery.toUpperCase().includes("ORDER BY")) {
        sqlQuery = sqlQuery.replace(/ORDER BY/i, `WHERE ${whereClause} ORDER BY`);
      } else if (sqlQuery.toUpperCase().includes("LIMIT")) {
        sqlQuery = sqlQuery.replace(/LIMIT/i, `WHERE ${whereClause} LIMIT`);
      }
    }

    // Executar query
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log("Executando SQL:", sqlQuery);
    
    const { data: queryResult, error: queryError } = await supabaseAdmin.rpc("exec_readonly_sql", {
      query_text: sqlQuery,
      p_user_id: user.id,
    });

    let rows: Record<string, unknown>[] = [];
    
    if (queryError) {
      console.error("Erro RPC:", queryError);
      // Fallback para query direta COM FILTROS DE DATA
      const viewMatch = sqlQuery.match(/FROM\s+(\w+)/i);
      const mainView = viewMatch ? viewMatch[1] : "vw_vendas";
      
      let query = supabaseUser
        .from(mainView)
        .select("*");
      
      // Aplicar filtros de período no fallback
      if (finalStartDate) {
        query = query.gte("periodo_dia", finalStartDate);
      }
      if (finalEndDate) {
        query = query.lte("periodo_dia", finalEndDate);
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

    // Calcular KPIs do resultado
    const kpis: Record<string, number | string> = {};
    if (rows.length > 0) {
      const firstRow = rows[0];
      
      // Somar valores totais
      if ("valor_total" in firstRow || "receita" in firstRow || "valor" in firstRow) {
        const key = "valor_total" in firstRow ? "valor_total" : ("receita" in firstRow ? "receita" : "valor");
        kpis.valor_total = rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);
      }
      if ("valor_liquido" in firstRow) {
        kpis.valor_liquido = rows.reduce((sum, r) => sum + (Number(r.valor_liquido) || 0), 0);
      }
      if ("m2" in firstRow || "m2_total" in firstRow) {
        const key = "m2" in firstRow ? "m2" : "m2_total";
        kpis.m2_total = rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);
      }
      if ("margem_pct" in firstRow) {
        const validMargins = rows.filter(r => Number(r.margem_pct) > 0);
        kpis.margem_media = validMargins.length > 0
          ? validMargins.reduce((sum, r) => sum + Number(r.margem_pct), 0) / validMargins.length
          : 0;
      }
      if ("qtd" in firstRow || "total" in firstRow) {
        const key = "qtd" in firstRow ? "qtd" : "total";
        kpis.quantidade = rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);
      }
      
      kpis.total_registros = rows.length;
      
      if (kpis.valor_total && rows.length > 0) {
        kpis.ticket_medio = Number(kpis.valor_total) / rows.length;
      }
    }

    // Gerar resposta em texto se não tiver
    if (!textResponse) {
      const periodoStr = finalStartDate && finalEndDate 
        ? `Período: ${finalStartDate} a ${finalEndDate}`
        : usedQuestionDates ? 'Período da pergunta' : 'Período: conforme filtros do dashboard';
      
      if (rows.length === 0) {
        textResponse = `Não encontrei registros para esses filtros/período. ${periodoStr}. Sugestão: tente ampliar o período ou remover filtros.`;
      } else if (kpis.valor_total !== undefined) {
        const valorFormatado = formatCurrency(Number(kpis.valor_total));
        const liquidoStr = kpis.valor_liquido !== undefined ? ` (líquido: ${formatCurrency(Number(kpis.valor_liquido))})` : '';
        const qtdStr = kpis.quantidade !== undefined ? ` em ${formatNumber(Number(kpis.quantidade))} registros` : ` em ${rows.length} registros`;
        textResponse = `Total: ${valorFormatado}${liquidoStr}${qtdStr}. ${periodoStr}.`;
        
        if (kpis.margem_media !== undefined && Number(kpis.margem_media) > 0) {
          textResponse += ` Margem média: ${formatNumber(Number(kpis.margem_media), 1)}%.`;
        }
      } else if (kpis.quantidade !== undefined) {
        textResponse = `Total: ${formatNumber(Number(kpis.quantidade))} registros. ${periodoStr}.`;
      } else {
        textResponse = `Encontrados ${rows.length} registros. ${periodoStr}.`;
      }
      
      if (dateCorrections.length > 0) {
        textResponse = dateCorrections.join('. ') + '. ' + textResponse;
      }
    }

    // Adicionar explicação se houver correções
    if (dateCorrections.length > 0 && !explanation) {
      explanation = dateCorrections.join('. ');
    }

    // Determinar se deve mostrar gráfico
    const shouldShowChart = wantsChart && rows.length > 1 && xAxis && yAxis.length > 0;

    // Montar resultado
    const resultado = {
      data: rows,
      kpis,
      sql: sqlQuery,
      chartType: shouldShowChart ? chartType : "table",
      xAxis,
      yAxis,
      confidence,
      explanation,
      textResponse,
      usedFallback,
      rowCount: rows.length,
      executionTimeMs: executionTime,
      wantsChart: shouldShowChart,
      periodUsed: finalStartDate && finalEndDate ? `${finalStartDate} a ${finalEndDate}` : null,
      usedQuestionDates,
    };

    // Salvar no cache
    await supabaseUser.from("insights_cache").upsert({
      user_id: user.id,
      hash: cacheHash,
      pergunta: pergunta || fallbackKey,
      resultado,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }, { onConflict: "hash" });

    // Log de auditoria
    await supabaseUser.from("insights_audit_logs").insert({
      user_id: user.id,
      pergunta: pergunta || fallbackKey,
      sql_executado: sqlQuery,
      filtros: { startDate: finalStartDate, endDate: finalEndDate },
      tempo_execucao_ms: executionTime,
      linhas_retornadas: rows.length,
      confianca: confidence,
      sucesso: true,
    });

    return new Response(JSON.stringify({
      ...resultado,
      cached: false,
      cacheHash,
      nextSteps: generateNextSteps(pergunta, chartType, wantsChart),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função insights-query:", error);
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erro desconhecido",
      suggestion: "Tente reformular sua pergunta ou use um dos relatórios sugeridos.",
      textResponse: "Ocorreu um erro ao processar sua pergunta. Tente novamente ou selecione um relatório pronto.",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Gerar sugestões de próximos passos
function generateNextSteps(pergunta: string, chartType: string, wantsChart: boolean): string[] {
  const steps: string[] = [];
  
  if (!pergunta) return steps;
  
  const lowerPergunta = pergunta.toLowerCase();
  
  if (lowerPergunta.includes("cliente")) {
    steps.push("Mostre a evolução mensal deste cliente");
    steps.push("Compare com outros clientes");
  }
  if (lowerPergunta.includes("vendas") || lowerPergunta.includes("receita")) {
    steps.push("Qual o total por canal de vendas?");
    steps.push("Qual a margem de lucro média?");
  }
  if (lowerPergunta.includes("margem")) {
    steps.push("Quais serviços têm melhor margem?");
    steps.push("Mostre gráfico de margem por mês");
  }
  if (lowerPergunta.includes("proposta")) {
    steps.push("Quantas propostas estão em aberto?");
    steps.push("Qual o valor total das propostas abertas?");
  }
  if (!wantsChart) {
    steps.push("Mostre em gráfico");
  }
  
  return steps.slice(0, 3);
}
