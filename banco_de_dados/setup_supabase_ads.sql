-- ============================================================
-- TABELA: ads_minerados
-- Projeto Alavanca AI Core — Minerador de Anúncios Escalados
-- Baseada na resposta REAL da API ScrapeCreators (Jun/2026)
-- Endpoints: /v1/facebook/adLibrary/search/ads
--            /v1/facebook/adLibrary/ad
-- ============================================================

DROP TABLE IF EXISTS ads_minerados;

CREATE TABLE ads_minerados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- ═══════════════════════════════════════════════
    -- Identificação do Anúncio (Nível Raiz da API)
    -- ═══════════════════════════════════════════════
    ad_archive_id TEXT UNIQUE NOT NULL,      -- ID único do anúncio na Meta Ad Library
    page_id TEXT,                             -- ID da página do Facebook
    page_name TEXT,                           -- Nome da página anunciante
    is_active BOOLEAN DEFAULT true,           -- Status ativo (API retorna boolean)
    start_date TIMESTAMP WITH TIME ZONE,     -- Converter de Unix timestamp no INSERT
    end_date TIMESTAMP WITH TIME ZONE,       -- Converter de Unix timestamp no INSERT
    collation_count INTEGER DEFAULT 1,       -- Nº de duplicações (indicador de escala)
    publisher_platform TEXT[],               -- Ex: {'FACEBOOK', 'INSTAGRAM'}
    ad_library_url TEXT,                     -- Link direto na Ad Library
    
    -- ═══════════════════════════════════════════════
    -- Conteúdo do Anúncio (snapshot.*)
    -- ═══════════════════════════════════════════════
    ad_title TEXT,                            -- snapshot.title (headline do anúncio)
    ad_copy TEXT,                             -- snapshot.body.text (search) OU snapshot.body (ad)
    caption TEXT,                             -- snapshot.caption (domínio exibido, ex: "ghemshop.com")
    link_description TEXT,                    -- snapshot.link_description
    cta_text TEXT,                            -- snapshot.cta_text (ex: "Shop now")
    cta_type TEXT,                            -- snapshot.cta_type (ex: "SHOP_NOW", "LEARN_MORE")
    display_format TEXT,                      -- snapshot.display_format (IMAGE / VIDEO / CAROUSEL)
    
    -- ═══════════════════════════════════════════════
    -- Links e Mídia
    -- ═══════════════════════════════════════════════
    link_url TEXT,                            -- snapshot.link_url (página de destino / vendas)
    image_url TEXT,                           -- snapshot.images[0].original_image_url
    image_resized_url TEXT,                   -- snapshot.images[0].resized_image_url
    video_urls TEXT[],                        -- snapshot.videos[*] URLs
    extra_image_urls TEXT[],                  -- snapshot.extra_images[*]
    cards_json JSONB,                         -- snapshot.cards (para carrosséis / multi-versão)
    
    -- ═══════════════════════════════════════════════
    -- Dados da Página Anunciante
    -- ═══════════════════════════════════════════════
    page_profile_pic_url TEXT,               -- snapshot.page_profile_picture_url
    page_like_count INTEGER,                 -- snapshot.page_like_count (indica autoridade)
    page_categories TEXT[],                  -- snapshot.page_categories
    brazil_tax_id TEXT,                      -- snapshot.brazil_tax_id (CNPJ/CPF para anúncios BR)
    
    -- ═══════════════════════════════════════════════
    -- Metadados de Mineração (campos nossos)
    -- ═══════════════════════════════════════════════
    pais_codigo TEXT DEFAULT 'BR',           -- País filtrado na busca
    query_busca TEXT,                        -- Qual keyword encontrou esse anúncio
    data_mineracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_json JSONB,                          -- JSON completo da API (backup/debug)
    
    -- ═══════════════════════════════════════════════
    -- Campos de IA (classificação do Minerador)
    -- ═══════════════════════════════════════════════
    categoria_ia TEXT,                       -- Categoria classificada pela IA (ex: "moda", "suplemento")
    score_escala FLOAT,                      -- Score calculado pela IA (0-100)
    notas_ia TEXT                             -- Observações da IA sobre o anúncio
);

-- ═══════════════════════════════════════════════
-- Índices para Performance
-- ═══════════════════════════════════════════════
CREATE INDEX idx_ad_archive_id ON ads_minerados(ad_archive_id);
CREATE INDEX idx_page_id ON ads_minerados(page_id);
CREATE INDEX idx_collation_count ON ads_minerados(collation_count DESC);
CREATE INDEX idx_is_active ON ads_minerados(is_active);
CREATE INDEX idx_score_escala ON ads_minerados(score_escala DESC NULLS LAST);
CREATE INDEX idx_data_mineracao ON ads_minerados(data_mineracao DESC);
CREATE INDEX idx_display_format ON ads_minerados(display_format);
CREATE INDEX idx_query_busca ON ads_minerados(query_busca);

-- ═══════════════════════════════════════════════
-- Row Level Security (RLS) para Supabase
-- ═══════════════════════════════════════════════
ALTER TABLE ads_minerados ENABLE ROW LEVEL SECURITY;

-- Policy: service_role pode ler/escrever tudo (API key do backend)
CREATE POLICY "Service full access" ON ads_minerados
    FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════
-- Documentação inline
-- ═══════════════════════════════════════════════
COMMENT ON TABLE ads_minerados IS 'Anúncios escalados minerados via ScrapeCreators API — Projeto Alavanca AI Core';
COMMENT ON COLUMN ads_minerados.collation_count IS 'Número de duplicações do anúncio. >10 = forte indicador de escala. >50 = altamente escalado';
COMMENT ON COLUMN ads_minerados.score_escala IS 'Score 0-100 calculado pela IA baseado em collation_count, tempo ativo, formato e engajamento';
COMMENT ON COLUMN ads_minerados.raw_json IS 'JSON completo retornado pela API ScrapeCreators para referência futura e reprocessamento';
COMMENT ON COLUMN ads_minerados.query_busca IS 'Keyword usada na busca que encontrou este anúncio (ex: "oferta", "frete grátis")';
COMMENT ON COLUMN ads_minerados.brazil_tax_id IS 'CNPJ/CPF do anunciante (disponível para anúncios veiculados no Brasil)';
COMMENT ON COLUMN ads_minerados.cards_json IS 'Array JSON de cards para anúncios carrossel ou com múltiplas versões';
COMMENT ON COLUMN ads_minerados.ad_copy IS 'Texto principal do anúncio. Extraído de snapshot.body.text (search) ou snapshot.body (ad detail)';
