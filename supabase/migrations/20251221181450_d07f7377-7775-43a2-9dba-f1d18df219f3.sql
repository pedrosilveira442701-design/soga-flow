-- Função RPC para executar SQL de forma segura (somente SELECT)
CREATE OR REPLACE FUNCTION public.exec_readonly_sql(query_text TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  normalized_query TEXT;
BEGIN
  -- Normalizar query
  normalized_query := UPPER(TRIM(query_text));
  
  -- Bloquear DDL/DML
  IF normalized_query ~ '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|EXECUTE|EXEC|CALL)\b' THEN
    RAISE EXCEPTION 'Operação não permitida. Apenas SELECT é aceito.';
  END IF;
  
  -- Verificar se começa com SELECT
  IF NOT normalized_query LIKE 'SELECT%' THEN
    RAISE EXCEPTION 'Apenas consultas SELECT são permitidas.';
  END IF;
  
  -- Bloquear múltiplas instruções
  IF query_text LIKE '%;%' AND POSITION(';' IN query_text) < LENGTH(query_text) - 1 THEN
    RAISE EXCEPTION 'Múltiplas instruções não são permitidas.';
  END IF;
  
  -- Bloquear comentários
  IF query_text LIKE '%--%' OR query_text LIKE '%/*%' THEN
    RAISE EXCEPTION 'Comentários não são permitidos.';
  END IF;
  
  -- Verificar se usa apenas views permitidas
  IF NOT (
    normalized_query ~ '\bVW_VENDAS\b' OR
    normalized_query ~ '\bVW_PROPOSTAS\b' OR
    normalized_query ~ '\bVW_LEADS\b' OR
    normalized_query ~ '\bVW_VISITAS\b' OR
    normalized_query ~ '\bVW_OBRAS\b' OR
    normalized_query ~ '\bVW_FINANCEIRO\b' OR
    normalized_query ~ '\bVW_CLIENTES\b'
  ) THEN
    RAISE EXCEPTION 'Apenas views analíticas são permitidas (vw_vendas, vw_propostas, vw_leads, vw_visitas, vw_obras, vw_financeiro, vw_clientes).';
  END IF;
  
  -- Adicionar filtro de user_id automaticamente para segurança
  -- Substituir WHERE existente ou adicionar novo
  IF query_text ~* '\bWHERE\b' THEN
    query_text := regexp_replace(
      query_text, 
      '\bWHERE\b', 
      format('WHERE user_id = %L AND ', p_user_id), 
      'i'
    );
  ELSIF query_text ~* '\bGROUP BY\b' THEN
    query_text := regexp_replace(
      query_text, 
      '\bGROUP BY\b', 
      format('WHERE user_id = %L GROUP BY', p_user_id), 
      'i'
    );
  ELSIF query_text ~* '\bORDER BY\b' THEN
    query_text := regexp_replace(
      query_text, 
      '\bORDER BY\b', 
      format('WHERE user_id = %L ORDER BY', p_user_id), 
      'i'
    );
  ELSIF query_text ~* '\bLIMIT\b' THEN
    query_text := regexp_replace(
      query_text, 
      '\bLIMIT\b', 
      format('WHERE user_id = %L LIMIT', p_user_id), 
      'i'
    );
  ELSE
    query_text := query_text || format(' WHERE user_id = %L', p_user_id);
  END IF;
  
  -- Garantir LIMIT
  IF NOT query_text ~* '\bLIMIT\b' THEN
    query_text := query_text || ' LIMIT 5000';
  END IF;
  
  -- Executar query e retornar como JSONB
  EXECUTE format('SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t', query_text) INTO result;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao executar consulta: %', SQLERRM;
END;
$$;

-- Conceder permissão para authenticated users
GRANT EXECUTE ON FUNCTION public.exec_readonly_sql(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_readonly_sql(TEXT, UUID) TO service_role;