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
const FALLBACK_REPORTS: Record<string, { sql: string; chart: string; x: string; y: string[] }> = {
  vendas_mes_cliente: {
    sql: `SELECT cliente, SUM(valor_total) as valor_total, SUM(valor_liquido) as valor_liquido, AVG(margem_pct) as margem_pct, SUM(m2) as m2 FROM vw_vendas WHERE periodo_mes = TO_CHAR(CURRENT_DATE, 'YYYY-MM') GROUP BY cliente ORDER BY valor_total DESC LIMIT 10`,
    chart: "bar",
    x: "cliente",
    y: ["valor_total", "valor_liquido"],
  },
  margem_ultimos_6_meses: {
    sql: `SELECT periodo_mes, AVG(margem_pct) as margem_pct, SUM(valor_total) as valor_total FROM vw_vendas WHERE periodo_dia >= CURRENT_DATE - INTERVAL '6 months' GROUP BY periodo_mes ORDER BY periodo_mes`,
    chart: "line",
    x: "periodo_mes",
    y: ["margem_pct"],
  },
  melhor_canal: {
    sql: `SELECT canal, COUNT(*) as total, SUM(valor_total) as receita FROM vw_vendas WHERE canal IS NOT NULL GROUP BY canal ORDER BY receita DESC LIMIT 10`,
    chart: "bar",
    x: "canal",
    y: ["receita", "total"],
  },
  funil_por_estagio: {
    sql: `SELECT estagio, COUNT(*) as total FROM vw_leads GROUP BY estagio ORDER BY CASE estagio WHEN 'contato' THEN 1 WHEN 'visita_agendada' THEN 2 WHEN 'visita_realizada' THEN 3 WHEN 'proposta_pendente' THEN 4 WHEN 'proposta' THEN 5 WHEN 'contrato' THEN 6 WHEN 'execucao' THEN 7 WHEN 'finalizado' THEN 8 ELSE 9 END`,
    chart: "bar",
    x: "estagio",
    y: ["total"],
  },
  servicos_mais_vendidos: {
    sql: `SELECT servico, SUM(m2) as m2_total, SUM(valor_total) as receita, COUNT(*) as total FROM vw_vendas WHERE servico IS NOT NULL GROUP BY servico ORDER BY receita DESC LIMIT 10`,
    chart: "bar",
    x: "servico",
    y: ["receita", "m2_total"],
  },
  geografia_vendas: {
    sql: `SELECT COALESCE(bairro, cidade, 'Não informado') as regiao, COUNT(*) as total, SUM(valor_total) as receita, AVG(valor_total) as ticket_medio FROM vw_vendas GROUP BY COALESCE(bairro, cidade, 'Não informado') ORDER BY receita DESC LIMIT 15`,
    chart: "bar",
    x: "regiao",
    y: ["receita", "ticket_medio"],
  },
  aging_propostas: {
    sql: `SELECT CASE WHEN dias_aberta <= 7 THEN '0-7 dias' WHEN dias_aberta <= 15 THEN '8-15 dias' WHEN dias_aberta <= 30 THEN '16-30 dias' WHEN dias_aberta <= 60 THEN '31-60 dias' ELSE '60+ dias' END as faixa, COUNT(*) as total, SUM(valor_total) as valor FROM vw_propostas WHERE status IN ('aberta', 'repouso') GROUP BY faixa ORDER BY MIN(dias_aberta)`,
    chart: "bar",
    x: "faixa",
    y: ["total", "valor"],
  },
  previsao_recebiveis: {
    sql: `SELECT CASE WHEN periodo_dia <= CURRENT_DATE + INTERVAL '30 days' THEN '0-30 dias' WHEN periodo_dia <= CURRENT_DATE + INTERVAL '60 days' THEN '31-60 dias' WHEN periodo_dia <= CURRENT_DATE + INTERVAL '90 days' THEN '61-90 dias' ELSE '90+ dias' END as faixa, SUM(valor) as valor, COUNT(*) as parcelas FROM vw_financeiro WHERE status = 'pendente' GROUP BY faixa`,
    chart: "bar",
    x: "faixa",
    y: ["valor", "parcelas"],
  },
};

// Função para validar e sanitizar SQL
function validateSQL(sql: string): { valid: boolean; error?: string } {
  const normalizedSQL = sql.toUpperCase().trim();

  // Bloquear DDL/DML - NOT including END (used in CASE WHEN...END) or SET/BEGIN in valid SQL contexts
  const blockedKeywords = [
    "INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "TRUNCATE",
    "GRANT", "REVOKE", "EXECUTE", "EXEC", "CALL", "COMMIT", "ROLLBACK",
    "SAVEPOINT", "DECLARE", "FETCH", "OPEN", "CLOSE", "DEALLOCATE"
  ];

  // Block dangerous BEGIN/SET patterns specifically
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

  // Bloquear múltiplas instruções
  if (sql.includes(";") && sql.indexOf(";") < sql.length - 1) {
    return { valid: false, error: "Múltiplas instruções não são permitidas" };
  }

  // Bloquear comentários
  if (sql.includes("--") || sql.includes("/*")) {
    return { valid: false, error: "Comentários não são permitidos" };
  }

  // Verificar se usa apenas views permitidas
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

  // Verificar se tem SELECT
  if (!normalizedSQL.startsWith("SELECT")) {
    return { valid: false, error: "Apenas consultas SELECT são permitidas" };
  }

  return { valid: true };
}

// Função para garantir LIMIT
function ensureLimit(sql: string, maxLimit: number = 5000): string {
  const hasLimit = /LIMIT\s+\d+/i.test(sql);
  if (!hasLimit) {
    return sql.replace(/;?\s*$/, ` LIMIT ${maxLimit}`);
  }
  // Reduzir limit se maior que o máximo
  return sql.replace(/LIMIT\s+(\d+)/i, (match, num) => {
    const limit = Math.min(parseInt(num), maxLimit);
    return `LIMIT ${limit}`;
  });
}

// Função para gerar hash do cache
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

    // Cliente com token do usuário para RLS
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verificar usuário
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pergunta, filtros = {}, useFallback = false, fallbackKey } = await req.json();

    if (!pergunta && !fallbackKey) {
      return new Response(JSON.stringify({ error: "Pergunta é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar cache
    const cacheHash = generateCacheHash(pergunta || fallbackKey, filtros);
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
    let chartType = "bar";
    let xAxis = "";
    let yAxis: string[] = [];
    let confidence = 0.9;
    let explanation = "";
    let usedFallback = false;

    // Se usar fallback diretamente
    if (fallbackKey && FALLBACK_REPORTS[fallbackKey]) {
      const fb = FALLBACK_REPORTS[fallbackKey];
      sqlQuery = fb.sql;
      chartType = fb.chart;
      xAxis = fb.x;
      yAxis = fb.y;
      explanation = `Relatório padrão: ${fallbackKey.replace(/_/g, " ")}`;
      usedFallback = true;
    } else if (lovableApiKey) {
      // Gerar SQL via IA
      const systemPrompt = `Você é um assistente de análise de dados especializado em gerar consultas SQL seguras.
Você tem acesso às seguintes views analíticas:

${Object.entries(VIEW_SCHEMAS).map(([view, cols]) => `- ${view}: ${cols}`).join("\n")}

REGRAS CRÍTICAS:
1. Use APENAS as views listadas acima (vw_vendas, vw_propostas, vw_leads, vw_visitas, vw_obras, vw_financeiro, vw_clientes)
2. Gere APENAS SELECT statements
3. SEMPRE inclua LIMIT (máximo 5000)
4. NUNCA use subqueries com tabelas brutas
5. Para filtrar por período, use as colunas periodo_dia, periodo_mes ou periodo_ano
6. Para margem %, use margem_pct que já está calculada
7. Valores monetários estão em valor_total e valor_liquido

Responda APENAS com um JSON válido no formato:
{
  "sql": "SELECT ...",
  "chart_type": "bar|line|pie|table",
  "x_axis": "nome_coluna_eixo_x",
  "y_axis": ["coluna1", "coluna2"],
  "confidence": 0.0 a 1.0,
  "explanation": "Explicação em 2-3 frases do que a consulta faz"
}`;

      const userPrompt = `Pergunta do usuário: "${pergunta}"
Filtros aplicados: ${JSON.stringify(filtros)}

Gere uma consulta SQL segura para responder esta pergunta.`;

      try {
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

        // Extrair JSON da resposta
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Resposta da IA inválida");
        }

        const parsed = JSON.parse(jsonMatch[0]);
        sqlQuery = parsed.sql;
        chartType = parsed.chart_type || "bar";
        xAxis = parsed.x_axis || "";
        yAxis = parsed.y_axis || [];
        confidence = parsed.confidence || 0.5;
        explanation = parsed.explanation || "";

      } catch (aiError) {
        console.error("Erro na IA, usando fallback:", aiError);
        // Fallback para relatório padrão
        const fb = FALLBACK_REPORTS.vendas_mes_cliente;
        sqlQuery = fb.sql;
        chartType = fb.chart;
        xAxis = fb.x;
        yAxis = fb.y;
        confidence = 0.4;
        explanation = "Não foi possível processar a pergunta. Mostrando vendas do mês por cliente.";
        usedFallback = true;
      }
    } else {
      // Sem API key, usar fallback
      const fb = FALLBACK_REPORTS.vendas_mes_cliente;
      sqlQuery = fb.sql;
      chartType = fb.chart;
      xAxis = fb.x;
      yAxis = fb.y;
      confidence = 0.4;
      explanation = "IA não configurada. Mostrando relatório padrão de vendas.";
      usedFallback = true;
    }

    // Validar SQL
    const validation = validateSQL(sqlQuery);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: validation.error,
        sql: sqlQuery,
        suggestion: "Tente reformular sua pergunta de forma mais específica.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Garantir LIMIT
    sqlQuery = ensureLimit(sqlQuery);

    // Aplicar filtros de período se fornecidos
    if (filtros.startDate || filtros.endDate) {
      const whereClause = [];
      if (filtros.startDate) {
        whereClause.push(`periodo_dia >= '${filtros.startDate}'`);
      }
      if (filtros.endDate) {
        whereClause.push(`periodo_dia <= '${filtros.endDate}'`);
      }
      
      if (whereClause.length > 0) {
        if (sqlQuery.toUpperCase().includes("WHERE")) {
          sqlQuery = sqlQuery.replace(/WHERE/i, `WHERE ${whereClause.join(" AND ")} AND`);
        } else if (sqlQuery.toUpperCase().includes("GROUP BY")) {
          sqlQuery = sqlQuery.replace(/GROUP BY/i, `WHERE ${whereClause.join(" AND ")} GROUP BY`);
        } else if (sqlQuery.toUpperCase().includes("ORDER BY")) {
          sqlQuery = sqlQuery.replace(/ORDER BY/i, `WHERE ${whereClause.join(" AND ")} ORDER BY`);
        } else if (sqlQuery.toUpperCase().includes("LIMIT")) {
          sqlQuery = sqlQuery.replace(/LIMIT/i, `WHERE ${whereClause.join(" AND ")} LIMIT`);
        }
      }
    }

    // Executar query via RPC (usando service role para execução mas RLS das views protege os dados)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log("Executando SQL:", sqlQuery);
    
    // Usar from() diretamente para consultar a view
    // Precisamos extrair a view principal e executar
    const viewMatch = sqlQuery.match(/FROM\s+(\w+)/i);
    const mainView = viewMatch ? viewMatch[1] : null;

    if (!mainView) {
      return new Response(JSON.stringify({ error: "Não foi possível identificar a view" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Para queries complexas, usar raw SQL via rpc
    // Primeiro, criar uma função que executa SQL de forma segura
    const { data: queryResult, error: queryError } = await supabaseAdmin.rpc("exec_readonly_sql", {
      query_text: sqlQuery,
      p_user_id: user.id,
    });

    let rows: Record<string, unknown>[] = [];
    
    if (queryError) {
      // Se a função não existir, tentar query direta na view
      console.log("RPC não disponível, tentando query direta:", queryError);
      
      const { data: directResult, error: directError } = await supabaseUser
        .from(mainView)
        .select("*")
        .limit(100);
        
      if (directError) {
        throw directError;
      }
      rows = directResult || [];
    } else {
      rows = queryResult || [];
    }

    const executionTime = Date.now() - startTime;

    // Calcular KPIs do resultado
    const kpis: Record<string, number | string> = {};
    if (rows.length > 0) {
      const firstRow = rows[0];
      if ("valor_total" in firstRow) {
        kpis.valor_total = rows.reduce((sum, r) => sum + (Number(r.valor_total) || 0), 0);
      }
      if ("valor_liquido" in firstRow) {
        kpis.valor_liquido = rows.reduce((sum, r) => sum + (Number(r.valor_liquido) || 0), 0);
      }
      if ("m2" in firstRow) {
        kpis.m2_total = rows.reduce((sum, r) => sum + (Number(r.m2) || 0), 0);
      }
      if ("margem_pct" in firstRow) {
        const validMargins = rows.filter(r => Number(r.margem_pct) > 0);
        kpis.margem_media = validMargins.length > 0
          ? validMargins.reduce((sum, r) => sum + Number(r.margem_pct), 0) / validMargins.length
          : 0;
      }
      kpis.total_registros = rows.length;
      if (kpis.valor_total && rows.length > 0) {
        kpis.ticket_medio = Number(kpis.valor_total) / rows.length;
      }
    }

    // Salvar no cache
    const resultado = {
      data: rows,
      kpis,
      sql: sqlQuery,
      chartType,
      xAxis,
      yAxis,
      confidence,
      explanation,
      usedFallback,
      rowCount: rows.length,
      executionTimeMs: executionTime,
    };

    await supabaseUser.from("insights_cache").upsert({
      user_id: user.id,
      hash: cacheHash,
      pergunta: pergunta || fallbackKey,
      resultado,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    }, { onConflict: "hash" });

    // Log de auditoria
    await supabaseUser.from("insights_audit_logs").insert({
      user_id: user.id,
      pergunta: pergunta || fallbackKey,
      sql_executado: sqlQuery,
      filtros,
      tempo_execucao_ms: executionTime,
      linhas_retornadas: rows.length,
      confianca: confidence,
      sucesso: true,
    });

    return new Response(JSON.stringify({
      ...resultado,
      cached: false,
      cacheHash,
      nextSteps: generateNextSteps(pergunta, chartType),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função insights-query:", error);
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erro desconhecido",
      suggestion: "Tente reformular sua pergunta ou use um dos relatórios sugeridos.",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Gerar sugestões de próximos passos
function generateNextSteps(pergunta: string, chartType: string): string[] {
  const steps: string[] = [];
  
  if (pergunta?.toLowerCase().includes("cliente")) {
    steps.push("Deseja ver a evolução mensal deste cliente?");
    steps.push("Quer comparar com outros clientes?");
  }
  if (pergunta?.toLowerCase().includes("vendas") || pergunta?.toLowerCase().includes("receita")) {
    steps.push("Deseja ver por canal de vendas?");
    steps.push("Quer analisar a margem de lucro?");
  }
  if (pergunta?.toLowerCase().includes("margem")) {
    steps.push("Deseja ver quais serviços têm melhor margem?");
    steps.push("Quer comparar margem por período?");
  }
  if (chartType === "bar") {
    steps.push("Deseja ver em formato de linha do tempo?");
  }
  if (chartType === "line") {
    steps.push("Deseja ver a comparação em barras?");
  }
  
  return steps.slice(0, 3);
}
