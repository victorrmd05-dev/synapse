-- supabase/migrations/20260731120000_add_prompts_imagens_workflow_copywriting.sql

-- DÍVIDA, não feature. A coluna `prompts_imagens` existe no banco de producao e e
-- usada pelo codigo (copywriting/generate/route.ts:241, /copywriting, /revisor),
-- mas foi criada direto no banco e NUNCA teve migration. Quem clona o repo hoje
-- nao consegue reconstruir o schema. Corrigido aqui, enquanto se mexe na tabela
-- vizinha. `if not exists` torna isto inofensivo no banco que ja tem a coluna.
alter table workflow_copywriting add column if not exists prompts_imagens text;
