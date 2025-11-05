-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'comercial', 'financeiro', 'visualizador');

-- Create enum for lead stages
CREATE TYPE public.lead_stage AS ENUM ('novo', 'contato', 'proposta_enviada', 'negociacao', 'fechado_ganho', 'perdido');

-- Create enum for contract status
CREATE TYPE public.contract_status AS ENUM ('ativo', 'concluido', 'cancelado');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pendente', 'pago', 'atrasado');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create clientes table
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  contato TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  bairro TEXT,
  cpf_cnpj TEXT,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  estagio lead_stage NOT NULL DEFAULT 'novo',
  responsavel TEXT,
  valor_potencial DECIMAL(10,2),
  origem TEXT,
  tipo_piso TEXT,
  ultima_interacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create propostas table
CREATE TABLE public.propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  m2 DECIMAL(10,2) NOT NULL,
  tipo_piso TEXT NOT NULL,
  valor_m2 DECIMAL(10,2) NOT NULL,
  custo_m2 DECIMAL(10,2) NOT NULL,
  valor_total DECIMAL(10,2) GENERATED ALWAYS AS (m2 * valor_m2) STORED,
  liquido DECIMAL(10,2) GENERATED ALWAYS AS (m2 * (valor_m2 - custo_m2)) STORED,
  margem_pct DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN (m2 * valor_m2) > 0 
      THEN ((m2 * (valor_m2 - custo_m2)) / (m2 * valor_m2) * 100)
      ELSE 0 
    END
  ) STORED,
  status TEXT DEFAULT 'aberta',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contratos table
CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  cpf_cnpj TEXT NOT NULL,
  valor_negociado DECIMAL(10,2) NOT NULL,
  data_inicio DATE NOT NULL,
  forma_pagamento TEXT NOT NULL,
  status contract_status DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create financeiro_parcelas table
CREATE TABLE public.financeiro_parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
  numero_parcela INTEGER NOT NULL,
  valor_liquido_parcela DECIMAL(10,2) NOT NULL,
  vencimento DATE NOT NULL,
  status payment_status DEFAULT 'pendente',
  forma TEXT,
  data_pagamento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create metas table
CREATE TABLE public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL,
  valor_alvo DECIMAL(10,2) NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  responsavel TEXT,
  progresso DECIMAL(5,2) DEFAULT 0,
  status TEXT DEFAULT 'ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create visitas table
CREATE TABLE public.visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  assunto TEXT NOT NULL,
  endereco TEXT,
  telefone TEXT,
  marcacao_tipo TEXT NOT NULL,
  data DATE,
  hora TIME,
  observacao TEXT,
  realizada BOOLEAN DEFAULT false,
  responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create arquivos table
CREATE TABLE public.arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arquivos ENABLE ROW LEVEL SECURITY;

-- Create function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_propostas_updated_at BEFORE UPDATE ON public.propostas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_financeiro_parcelas_updated_at BEFORE UPDATE ON public.financeiro_parcelas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON public.metas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_visitas_updated_at BEFORE UPDATE ON public.visitas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for clientes
CREATE POLICY "Users can view their own clientes" ON public.clientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own clientes" ON public.clientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clientes" ON public.clientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clientes" ON public.clientes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for leads
CREATE POLICY "Users can view their own leads" ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own leads" ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own leads" ON public.leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own leads" ON public.leads FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for propostas
CREATE POLICY "Users can view their own propostas" ON public.propostas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own propostas" ON public.propostas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own propostas" ON public.propostas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own propostas" ON public.propostas FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for contratos
CREATE POLICY "Users can view their own contratos" ON public.contratos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own contratos" ON public.contratos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contratos" ON public.contratos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contratos" ON public.contratos FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for financeiro_parcelas
CREATE POLICY "Users can view their own parcelas" ON public.financeiro_parcelas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own parcelas" ON public.financeiro_parcelas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own parcelas" ON public.financeiro_parcelas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own parcelas" ON public.financeiro_parcelas FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for metas
CREATE POLICY "Users can view their own metas" ON public.metas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own metas" ON public.metas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own metas" ON public.metas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own metas" ON public.metas FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for visitas
CREATE POLICY "Users can view their own visitas" ON public.visitas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own visitas" ON public.visitas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own visitas" ON public.visitas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own visitas" ON public.visitas FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for arquivos
CREATE POLICY "Users can view their own arquivos" ON public.arquivos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own arquivos" ON public.arquivos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own arquivos" ON public.arquivos FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX idx_leads_user_id ON public.leads(user_id);
CREATE INDEX idx_leads_cliente_id ON public.leads(cliente_id);
CREATE INDEX idx_propostas_user_id ON public.propostas(user_id);
CREATE INDEX idx_propostas_cliente_id ON public.propostas(cliente_id);
CREATE INDEX idx_contratos_user_id ON public.contratos(user_id);
CREATE INDEX idx_contratos_cliente_id ON public.contratos(cliente_id);
CREATE INDEX idx_financeiro_parcelas_user_id ON public.financeiro_parcelas(user_id);
CREATE INDEX idx_financeiro_parcelas_contrato_id ON public.financeiro_parcelas(contrato_id);
CREATE INDEX idx_metas_user_id ON public.metas(user_id);
CREATE INDEX idx_visitas_user_id ON public.visitas(user_id);
CREATE INDEX idx_visitas_cliente_id ON public.visitas(cliente_id);
CREATE INDEX idx_arquivos_user_id ON public.arquivos(user_id);
CREATE INDEX idx_arquivos_entidade ON public.arquivos(entidade, entidade_id);

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();