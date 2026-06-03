-- Migrations para o MetaScale

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  role text default 'admin',
  criado_em timestamptz default now()
);

-- Meta Ad Accounts
CREATE TABLE IF NOT EXISTS meta_ad_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  account_name text NOT NULL,
  access_token text NOT NULL,
  token_expires_at timestamptz,
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_account_id uuid REFERENCES meta_ad_accounts(id) ON DELETE CASCADE,
  meta_campaign_id text NOT NULL,
  nome text NOT NULL,
  status text,
  objetivo text,
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- Campaign Metrics
CREATE TABLE IF NOT EXISTS campaign_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  data date NOT NULL,
  impressoes bigint default 0,
  alcance bigint default 0,
  frequencia numeric(6,2) default 0,
  cliques_link integer default 0,
  ctr numeric(8,4) default 0,
  cpc numeric(10,2) default 0,
  cpm numeric(10,2) default 0,
  valor_gasto numeric(12,2) default 0,
  landing_page_views integer default 0,
  checkouts_iniciados integer default 0,
  compras integer default 0,
  valor_conversao numeric(12,2) default 0,
  roas numeric(8,4) default 0,
  cpa numeric(10,2) default 0,
  connect_rate numeric(8,4),
  conversao_lp numeric(8,4),
  conversao_checkout numeric(8,4),
  conversao_global numeric(8,4),
  escala_status text,
  criado_em timestamptz default now()
);

-- AI Diagnostics
CREATE TABLE IF NOT EXISTS ai_diagnostics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  metrics_id uuid REFERENCES campaign_metrics(id) ON DELETE CASCADE,
  data date NOT NULL,
  gargalo text,
  diagnostico text,
  recomendacoes jsonb,
  prioridade text,
  criado_em timestamptz default now()
);

-- Scale Simulations
CREATE TABLE IF NOT EXISTS scale_simulations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  orcamento numeric(12,2),
  ctr_sim numeric(8,4),
  connect_rate_sim numeric(8,4),
  conversao_lp_sim numeric(8,4),
  conversao_checkout_sim numeric(8,4),
  ticket_medio numeric(10,2),
  margem_produto numeric(6,4),
  cliques_est integer,
  visitas_lp_est integer,
  checkouts_est integer,
  vendas_est integer,
  faturamento_est numeric(12,2),
  cpa_est numeric(10,2),
  roas_est numeric(8,4),
  lucro_est numeric(12,2),
  margem_lucro_est numeric(6,4),
  criado_em timestamptz default now()
);

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scale_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can access their own ad accounts" ON meta_ad_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access campaigns for their ad accounts" ON campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM meta_ad_accounts WHERE id = campaigns.ad_account_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can access metrics for their campaigns" ON campaign_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      JOIN meta_ad_accounts ON campaigns.ad_account_id = meta_ad_accounts.id
      WHERE campaigns.id = campaign_metrics.campaign_id AND meta_ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access diagnostics for their campaigns" ON ai_diagnostics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      JOIN meta_ad_accounts ON campaigns.ad_account_id = meta_ad_accounts.id
      WHERE campaigns.id = ai_diagnostics.campaign_id AND meta_ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their own simulations" ON scale_simulations
  FOR ALL USING (auth.uid() = user_id);
