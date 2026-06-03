-- ============================================================
-- TABELAS DE WORKFLOW: Alavanca AI
-- Organização da linha de produção (Copy, Design, Video, Ads)
-- ============================================================

-- 1. Tabela central de Campanhas
CREATE TABLE IF NOT EXISTS campanhas_producao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ad_minerado_id UUID REFERENCES ads_minerados(id) ON DELETE SET NULL,
    nome_projeto TEXT NOT NULL,
    status_geral TEXT DEFAULT 'Planejamento',
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Workflow Copywriting
CREATE TABLE IF NOT EXISTS workflow_copywriting (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campanha_id UUID REFERENCES campanhas_producao(id) ON DELETE CASCADE,
    tipo_copy TEXT NOT NULL, -- Ex: 'Texto do Anuncio', 'Pagina de Vendas', 'Advertorial'
    conteudo_texto TEXT,
    revisor_ok BOOLEAN DEFAULT false,
    notas_revisao TEXT,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_aprovacao TIMESTAMP WITH TIME ZONE
);

-- 3. Workflow Design
CREATE TABLE IF NOT EXISTS workflow_design (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campanha_id UUID REFERENCES campanhas_producao(id) ON DELETE CASCADE,
    tipo_design TEXT NOT NULL, -- Ex: 'Landing Page', 'Imagem Ad'
    url_recurso TEXT,
    revisor_ok BOOLEAN DEFAULT false,
    notas_revisao TEXT,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_aprovacao TIMESTAMP WITH TIME ZONE
);

-- 4. Workflow Video
CREATE TABLE IF NOT EXISTS workflow_video (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campanha_id UUID REFERENCES campanhas_producao(id) ON DELETE CASCADE,
    tipo_video TEXT NOT NULL, -- Ex: 'Criativo Video Ad', 'Shorts', 'TikTok'
    url_video_download TEXT,
    revisor_ok BOOLEAN DEFAULT false,
    notas_revisao TEXT,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_aprovacao TIMESTAMP WITH TIME ZONE
);

-- 5. Workflow Relatorios de Trafego (Para inteligencia da IA)
CREATE TABLE IF NOT EXISTS workflow_relatorios_trafego (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campanha_id UUID REFERENCES campanhas_producao(id) ON DELETE CASCADE,
    dados_relatorio JSONB NOT NULL,
    insights_ia TEXT,
    data_relatorio TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS) para Supabase
-- ============================================================
ALTER TABLE campanhas_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_copywriting ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_design ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_video ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_relatorios_trafego ENABLE ROW LEVEL SECURITY;

-- Policy: service_role pode ler/escrever tudo (API key do backend)
CREATE POLICY "Service full access on campanhas_producao" ON campanhas_producao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access on workflow_copywriting" ON workflow_copywriting FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access on workflow_design" ON workflow_design FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access on workflow_video" ON workflow_video FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access on workflow_relatorios_trafego" ON workflow_relatorios_trafego FOR ALL USING (true) WITH CHECK (true);
