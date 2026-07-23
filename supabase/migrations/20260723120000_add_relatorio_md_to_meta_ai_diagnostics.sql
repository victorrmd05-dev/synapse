-- Relatório completo em markdown (métricas + funil + diagnóstico + Análise
-- Profunda + plano) — o mesmo conteúdo do .md salvo em analises-ia/.
-- Aplicada via MCP em 23/07/2026.
ALTER TABLE meta_ai_diagnostics ADD COLUMN IF NOT EXISTS relatorio_md TEXT;
