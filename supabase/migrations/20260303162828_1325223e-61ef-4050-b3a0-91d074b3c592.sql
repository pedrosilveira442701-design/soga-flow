CREATE TABLE public.contrato_recebiveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  numero integer NOT NULL,
  valor numeric NOT NULL,
  vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  data_recebimento date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contrato_recebiveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recebiveis" ON contrato_recebiveis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own recebiveis" ON contrato_recebiveis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recebiveis" ON contrato_recebiveis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recebiveis" ON contrato_recebiveis FOR DELETE USING (auth.uid() = user_id);