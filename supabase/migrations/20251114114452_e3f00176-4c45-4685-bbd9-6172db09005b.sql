-- Corrigir search_path da função update_status_changed_at
CREATE OR REPLACE FUNCTION update_status_changed_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.estagio IS DISTINCT FROM NEW.estagio) THEN
    NEW.status_changed_at = NOW();
  ELSIF (TG_OP = 'INSERT') THEN
    NEW.status_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;