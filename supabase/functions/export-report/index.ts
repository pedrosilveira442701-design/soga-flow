import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportConfig {
  dataset: string;
  scope: "global" | "periodo";
  dateRange?: { start: string; end: string };
  filters: Record<string, any>;
  columns: string[];
  orderBy?: { field: string; direction: "asc" | "desc" };
  format: "excel" | "pdf" | "csv";
  userId: string;
}

const VIEW_MAP: Record<string, string> = {
  clientes: "vw_clientes",
  propostas: "vw_propostas",
  contratos: "vw_vendas",
  vendas: "vw_vendas",
  financeiro: "vw_financeiro",
  leads: "vw_leads",
  visitas: "vw_visitas",
  obras: "vw_obras",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const config: ReportConfig = await req.json();
    console.log("Export config received:", JSON.stringify(config));

    if (!config.dataset || !config.userId) {
      throw new Error("Dataset e userId são obrigatórios");
    }

    const viewName = VIEW_MAP[config.dataset];
    if (!viewName) {
      throw new Error(`Dataset inválido: ${config.dataset}`);
    }

    // Build query
    let query = supabase.from(viewName).select("*").eq("user_id", config.userId);

    // Apply date range filter
    if (config.scope === "periodo" && config.dateRange) {
      if (config.dateRange.start) {
        query = query.gte("periodo_dia", config.dateRange.start);
      }
      if (config.dateRange.end) {
        query = query.lte("periodo_dia", config.dateRange.end);
      }
    }

    // Apply filters
    if (config.filters) {
      if (config.filters.status?.length) {
        query = query.in("status", config.filters.status);
      }
      if (config.filters.canal?.length) {
        query = query.in("canal", config.filters.canal);
      }
      if (config.filters.servico?.length) {
        query = query.in("servico", config.filters.servico);
      }
      if (config.filters.cidade?.length) {
        query = query.in("cidade", config.filters.cidade);
      }
      if (config.filters.bairro?.length) {
        query = query.in("bairro", config.filters.bairro);
      }
      if (config.filters.cliente) {
        query = query.ilike("cliente", `%${config.filters.cliente}%`);
      }
      if (config.filters.responsavel) {
        query = query.ilike("responsavel", `%${config.filters.responsavel}%`);
      }
    }

    // Apply ordering
    if (config.orderBy) {
      query = query.order(config.orderBy.field, { ascending: config.orderBy.direction === "asc" });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Limit to prevent huge exports
    query = query.limit(5000);

    const { data, error } = await query;

    if (error) {
      console.error("Query error:", error);
      throw new Error(`Erro na consulta: ${error.message}`);
    }

    console.log(`Fetched ${data?.length || 0} records`);

    // Filter columns if specified
    let exportData = data || [];
    if (config.columns?.length) {
      exportData = (data || []).map((row: any) => {
        const filtered: any = {};
        config.columns.forEach((col) => {
          if (col in row) {
            filtered[col] = row[col];
          }
        });
        return filtered;
      });
    }

    // Generate CSV (works for both Excel and basic export)
    const generateCSV = (rows: any[]): string => {
      if (!rows.length) return "";
      
      const headers = Object.keys(rows[0]);
      const csvRows = [headers.join(";")]; // Use semicolon for Brazilian Excel compatibility
      
      for (const row of rows) {
        const values = headers.map((header) => {
          let val = row[header];
          if (val === null || val === undefined) val = "";
          if (typeof val === "number") {
            // Format numbers for Brazilian locale
            val = val.toString().replace(".", ",");
          }
          // Escape quotes and wrap in quotes if contains separator
          val = String(val).replace(/"/g, '""');
          if (val.includes(";") || val.includes("\n") || val.includes('"')) {
            val = `"${val}"`;
          }
          return val;
        });
        csvRows.push(values.join(";"));
      }
      
      return "\uFEFF" + csvRows.join("\n"); // BOM for UTF-8
    };

    const csv = generateCSV(exportData);
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `relatorio_${config.dataset}_${timestamp}`;

    // Return CSV data directly for client-side download
    // (For full Excel/PDF generation, would need additional libraries)
    return new Response(
      JSON.stringify({
        success: true,
        csv,
        filename: `${filename}.csv`,
        rowCount: exportData.length,
        message: `Exportados ${exportData.length} registros`,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
        success: false,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
