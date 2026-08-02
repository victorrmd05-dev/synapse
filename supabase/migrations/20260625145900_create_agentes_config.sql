-- Cria a tabela `agentes_config` — o cache local do "cérebro" dos agentes
-- (AGENTS.md, SOUL.md, TOOLS.md, SKILL.md), populado pelo syncAgentsFromFolder()
-- a partir da pasta agentes/. É a tabela que o Sistema A consulta em
-- getAgentConfig(slug) + buildSystemPrompt(config).
--
-- 🚨 POR QUE ESTA MIGRATION NASCEU EM 02/08/2026, DEPOIS DAS QUE DEPENDEM DELA:
-- a tabela existia no banco de produção desde o começo, mas NUNCA foi versionada.
-- Ela tinha sido criada à mão, rodando um `setup_agentes_config_v2.sql` que o
-- CLAUDE.md citava e que não existe mais no repositório. O buraco só apareceu ao
-- montar um banco NOVO do zero: a migration 20260625150000 (add template_md)
-- morria com `42P01 relation "public.agentes_config" does not exist`, porque
-- nada antes dela criava a tabela. Ou seja: as migrations não conseguiam
-- reconstruir o próprio banco de origem.
--
-- O timestamp é 20260625145900 de propósito — um minuto antes da 20260625150000,
-- para a ordem alfabética (que é a ordem de execução) colocar a criação antes do
-- ALTER que depende dela. O schema abaixo foi extraído do banco real em
-- 02/08/2026, coluna por coluna, e NÃO inclui `template_md`: essa coluna é
-- justamente o que a 20260625150000 adiciona, e duplicar aqui quebraria a cadeia.

CREATE TABLE IF NOT EXISTS public.agentes_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  nome              TEXT NOT NULL,
  github_agent_path TEXT,
  github_skill_path TEXT,
  agents_md         TEXT,
  soul_md           TEXT,
  heartbeat_md      TEXT,
  tools_md          TEXT,
  skill_md          TEXT,
  modelo            TEXT    DEFAULT 'claude-sonnet-4-6',
  max_tokens        INTEGER DEFAULT 4000,
  ativo             BOOLEAN DEFAULT true,
  ultimo_sync_em    TIMESTAMPTZ,
  ultimo_commit_sha TEXT,
  data_atualizacao  TIMESTAMPTZ DEFAULT NOW()
);

-- Mantém `data_atualizacao` em dia sozinho, para o painel conseguir mostrar
-- há quanto tempo cada agente não é sincronizado.
--
-- O `SET search_path` não estava no original e foi acrescentado aqui: sem ele o
-- linter de segurança do Supabase acusa `function_search_path_mutable`, porque
-- uma função SECURITY-sensível sem search_path fixo pode ser induzida a chamar
-- um objeto plantado noutro schema.
CREATE OR REPLACE FUNCTION public.update_agentes_config_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agentes_config_updated ON public.agentes_config;
CREATE TRIGGER trg_agentes_config_updated
  BEFORE UPDATE ON public.agentes_config
  FOR EACH ROW EXECUTE FUNCTION public.update_agentes_config_timestamp();

-- RLS ligado + policy permissiva, pelo mesmo motivo das outras tabelas do
-- pipeline: sem policy nenhuma, o default-deny do Postgres bloqueia 100% das
-- leituras feitas pelo frontend com a anon key, e a tela abre VAZIA sem erro.
-- DÍVIDA DE SEGURANÇA conhecida: trocar por checagem real quando houver login.
ALTER TABLE public.agentes_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'agentes_config'
      AND policyname = 'Service full access on agentes_config'
  ) THEN
    CREATE POLICY "Service full access on agentes_config"
      ON public.agentes_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
