-- Recriar a função com validação mais permissiva
CREATE OR REPLACE FUNCTION public.exec_readonly_sql(query_text text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  normalized_query TEXT;
  final_query TEXT;
BEGIN
  normalized_query := UPPER(TRIM(query_text));
  final_query := query_text;
  
  -- Bloquear DDL/DML perigosas
  IF normalized_query ~ '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|EXECUTE|EXEC)\b' THEN
    RAISE EXCEPTION 'Operação não permitida. Apenas SELECT é aceito.';
  END IF;
  
  -- Verificar se começa com SELECT
  IF NOT normalized_query LIKE 'SELECT%' THEN
    RAISE EXCEPTION 'Apenas consultas SELECT são permitidas.';
  END IF;
  
  -- Bloquear múltiplas instruções (exceto se for apenas espaço/ponto-vírgula final)
  IF query_text ~ ';[^;\s]+' THEN
    RAISE EXCEPTION 'Múltiplas instruções não são permitidas.';
  END IF;
  
  -- Verificar se referencia pelo menos uma view permitida
  IF NOT (
    normalized_query ~ '\bVW_VENDAS\b' OR
    normalized_query ~ '\bVW_PROPOSTAS\b' OR
    normalized_query ~ '\bVW_LEADS\b' OR
    normalized_query ~ '\bVW_VISITAS\b' OR
    normalized_query ~ '\bVW_OBRAS\b' OR
    normalized_query ~ '\bVW_FINANCEIRO\b' OR
    normalized_query ~ '\bVW_CLIENTES\b'
  ) THEN
    RAISE EXCEPTION 'Use uma das views analíticas: vw_vendas, vw_propostas, vw_leads, vw_visitas, vw_obras, vw_financeiro, vw_clientes.';
  END IF;
  
  -- Adicionar filtro de user_id automaticamente
  IF final_query ~* '\bWHERE\b' THEN
    final_query := regexp_replace(
      final_query, 
      '\bWHERE\b', 
      format('WHERE user_id = %L AND ', p_user_id), 
      'i'
    );
  ELSIF final_query ~* '\bGROUP BY\b' THEN
    final_query := regexp_replace(
      final_query, 
      '\bGROUP BY\b', 
      format('WHERE user_id = %L GROUP BY', p_user_id), 
      'i'
    );
  ELSIF final_query ~* '\bORDER BY\b' THEN
    final_query := regexp_replace(
      final_query, 
      '\bORDER BY\b', 
      format('WHERE user_id = %L ORDER BY', p_user_id), 
      'i'
    );
  ELSIF final_query ~* '\bLIMIT\b' THEN
    final_query := regexp_replace(
      final_query, 
      '\bLIMIT\b', 
      format('WHERE user_id = %L LIMIT', p_user_id), 
      'i'
    );
  ELSE
    final_query := final_query || format(' WHERE user_id = %L', p_user_id);
  END IF;
  
  -- Garantir LIMIT
  IF NOT final_query ~* '\bLIMIT\b' THEN
    final_query := final_query || ' LIMIT 500';
  END IF;
  
  -- Executar query e retornar como JSONB
  EXECUTE format('SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t', final_query) INTO result;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro: %', SQLERRM;
END;
$function$;