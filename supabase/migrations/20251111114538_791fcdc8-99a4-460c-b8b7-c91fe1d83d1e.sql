
-- Popular tabela de contatos com dados existentes

-- Inserir contatos a partir de LEADS
INSERT INTO contatos (user_id, telefone, data_hora, origem, converteu_lead, lead_id, created_at, updated_at)
SELECT DISTINCT ON (l.user_id, COALESCE(c.telefone, 'Não informado'))
  l.user_id,
  COALESCE(c.telefone, 'Não informado') as telefone,
  l.created_at as data_hora,
  'Lead Direto' as origem,
  TRUE as converteu_lead,
  l.id as lead_id,
  l.created_at,
  l.created_at as updated_at
FROM leads l
JOIN clientes c ON c.id = l.cliente_id
WHERE NOT EXISTS (
  SELECT 1 FROM contatos ct
  WHERE ct.user_id = l.user_id
  AND ct.telefone = COALESCE(c.telefone, 'Não informado')
);

-- Inserir contatos a partir de VISITAS
INSERT INTO contatos (user_id, telefone, data_hora, origem, converteu_lead, lead_id, created_at, updated_at)
SELECT DISTINCT ON (v.user_id, COALESCE(c.telefone, 'Não informado'))
  v.user_id,
  COALESCE(c.telefone, 'Não informado') as telefone,
  v.created_at as data_hora,
  'Visita Agendada' as origem,
  TRUE as converteu_lead,
  v.lead_id,
  v.created_at,
  v.created_at as updated_at
FROM visitas v
JOIN clientes c ON c.id = v.cliente_id
WHERE NOT EXISTS (
  SELECT 1 FROM contatos ct
  WHERE ct.user_id = v.user_id
  AND ct.telefone = COALESCE(c.telefone, 'Não informado')
);

-- Inserir contatos a partir de PROPOSTAS
INSERT INTO contatos (user_id, telefone, data_hora, origem, converteu_lead, lead_id, created_at, updated_at)
SELECT DISTINCT ON (p.user_id, COALESCE(c.telefone, 'Não informado'))
  p.user_id,
  COALESCE(c.telefone, 'Não informado') as telefone,
  p.created_at as data_hora,
  'Proposta Direta' as origem,
  TRUE as converteu_lead,
  p.lead_id,
  p.created_at,
  p.created_at as updated_at
FROM propostas p
JOIN clientes c ON c.id = p.cliente_id
WHERE NOT EXISTS (
  SELECT 1 FROM contatos ct
  WHERE ct.user_id = p.user_id
  AND ct.telefone = COALESCE(c.telefone, 'Não informado')
);

-- Inserir contatos a partir de CONTRATOS
INSERT INTO contatos (user_id, telefone, data_hora, origem, converteu_lead, lead_id, created_at, updated_at)
SELECT DISTINCT ON (co.user_id, COALESCE(c.telefone, 'Não informado'))
  co.user_id,
  COALESCE(c.telefone, 'Não informado') as telefone,
  co.created_at as data_hora,
  'Contrato Direto' as origem,
  TRUE as converteu_lead,
  NULL as lead_id,
  co.created_at,
  co.created_at as updated_at
FROM contratos co
JOIN clientes c ON c.id = co.cliente_id
WHERE NOT EXISTS (
  SELECT 1 FROM contatos ct
  WHERE ct.user_id = co.user_id
  AND ct.telefone = COALESCE(c.telefone, 'Não informado')
);
