-- Adiciona o campo TEMPLATE.md ao "cérebro" dos agentes.
-- É opcional (só faz sentido para agentes que produzem um artefato com estrutura
-- fixa — ex.: Copywriter segue um esqueleto de página de vendas; Designer segue
-- um template de LP). Entra no system prompt logo depois da SKILL (ver
-- buildSystemPrompt.ts) e é editável como aba própria em /agents.
ALTER TABLE public.agentes_config
  ADD COLUMN IF NOT EXISTS template_md TEXT;
