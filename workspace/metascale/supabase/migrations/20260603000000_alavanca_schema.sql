-- Alavanca AI Command Center Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Mineração
CREATE TABLE IF NOT EXISTS mineracao_produtos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  price text,
  score integer default 0,
  image_url text,
  status text default 'pendente',
  criado_em timestamptz default now()
);

-- Copywriting
CREATE TABLE IF NOT EXISTS producao_copywriting (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mineracao_id uuid REFERENCES mineracao_produtos(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text default 'NORMAL',
  status text default 'AGUARDANDO',
  copy_gancho text,
  copy_mecanismo text,
  copy_cta text,
  atributos_json jsonb default '{}'::jsonb,
  criado_em timestamptz default now()
);

-- Design
CREATE TABLE IF NOT EXISTS design_lps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  producao_id uuid REFERENCES producao_copywriting(id) ON DELETE CASCADE,
  title text NOT NULL,
  niche text,
  preview_url text,
  status text default 'Em Desenvolvimento',
  health_score_json jsonb default '{}'::jsonb,
  assets_json jsonb default '[]'::jsonb,
  criado_em timestamptz default now()
);

-- Video Maker
CREATE TABLE IF NOT EXISTS video_assets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  producao_id uuid REFERENCES producao_copywriting(id) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text,
  duration text,
  status text default 'Aguardando Aprovação',
  thumbnail_url text,
  criado_em timestamptz default now()
);

-- Realtime Setup
-- Habilitar a replicação para essas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE mineracao_produtos;
ALTER PUBLICATION supabase_realtime ADD TABLE producao_copywriting;
ALTER PUBLICATION supabase_realtime ADD TABLE design_lps;
ALTER PUBLICATION supabase_realtime ADD TABLE video_assets;

-- RLS (Row Level Security)
ALTER TABLE mineracao_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE producao_copywriting ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_lps ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_assets ENABLE ROW LEVEL SECURITY;

-- Policies para visualização (Como é um dashboard administrativo e estamos usando keys anon por enquanto, permitimos select para anon/authenticated)
CREATE POLICY "Public Read Access mineracao_produtos" ON mineracao_produtos FOR SELECT USING (true);
CREATE POLICY "Public Read Access producao_copywriting" ON producao_copywriting FOR SELECT USING (true);
CREATE POLICY "Public Read Access design_lps" ON design_lps FOR SELECT USING (true);
CREATE POLICY "Public Read Access video_assets" ON video_assets FOR SELECT USING (true);

-- Policies temporárias de escrita para o Seed Script poder rodar via Data API (se necessário)
CREATE POLICY "Public Insert Access mineracao_produtos" ON mineracao_produtos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Insert Access producao_copywriting" ON producao_copywriting FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Insert Access design_lps" ON design_lps FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Insert Access video_assets" ON video_assets FOR INSERT WITH CHECK (true);
