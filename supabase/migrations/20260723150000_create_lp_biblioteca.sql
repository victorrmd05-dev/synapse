-- Biblioteca de landing pages: toda página (do pipeline ou manual) vive aqui
-- para servir de modelo e registrar qual validou (ROAS ok).
-- Aplicada via MCP em 23/07/2026.
CREATE TABLE IF NOT EXISTS lp_biblioteca (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  origem TEXT NOT NULL DEFAULT 'pipeline', -- 'pipeline' (Designer) | 'manual'
  design_id UUID UNIQUE,                   -- workflow_design.id quando veio do pipeline
  codigo_html TEXT NOT NULL,
  url_publicada TEXT,
  validada BOOLEAN NOT NULL DEFAULT false, -- página que provou ROAS
  notas TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convenção do projeto (sem auth ainda): RLS ligado com policies públicas.
ALTER TABLE lp_biblioteca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_biblioteca_select" ON lp_biblioteca FOR SELECT USING (true);
CREATE POLICY "lp_biblioteca_insert" ON lp_biblioteca FOR INSERT WITH CHECK (true);
CREATE POLICY "lp_biblioteca_update" ON lp_biblioteca FOR UPDATE USING (true);
CREATE POLICY "lp_biblioteca_delete" ON lp_biblioteca FOR DELETE USING (true);

-- Realtime (padrão das telas do painel)
ALTER PUBLICATION supabase_realtime ADD TABLE lp_biblioteca;
