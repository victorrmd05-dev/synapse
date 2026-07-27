-- supabase/migrations/20260727120100_create_autopsia.sql
--
-- MODULO AUTOPSIA — disseca UM anunciante (a mineracao acha MUITOS anuncios).
--
-- Tres tabelas:
--   autopsias           uma analise de um anunciante numa data
--   autopsia_criativos  um criativo unico (pos-dedup) dentro da autopsia
--   autopsia_jobs       a FILA — e o que permite trocar o worker local por uma
--                       API de transcricao depois sem reescrever o modulo
--
-- Idempotente (IF NOT EXISTS). RLS com policy publica: convencao do projeto
-- enquanto nao ha autenticacao (mesma divida do resto do app).

create table if not exists autopsias (
  id uuid primary key default gen_random_uuid(),
  page_id text not null,
  page_name text,
  page_profile_pic_url text,
  status text not null default 'coletando',   -- coletando|processando|montando|pronta|erro
  progresso int not null default 0,           -- 0-100
  total_anuncios int default 0,               -- antes da dedup
  total_criativos int default 0,              -- depois da dedup
  total_transcritos int default 0,
  dossie_json jsonb,
  dossie_md text,
  dossie_html_url text,
  erro text,
  criado_em timestamptz default now(),
  concluido_em timestamptz
);

create table if not exists autopsia_criativos (
  id uuid primary key default gen_random_uuid(),
  autopsia_id uuid not null references autopsias(id) on delete cascade,
  ad_archive_id text,
  creative_key text not null,
  tipo text not null default 'video',         -- video|imagem
  duracao_s int,
  dias_no_ar int,
  is_active boolean,
  ad_copy text,
  ad_title text,
  cta_text text,
  link_url text,
  url_origem text,                            -- CDN do FB (expira ~5 dias)
  storage_path text,                          -- o arquivo de verdade
  transcricao text,
  transcricao_srt text,
  frames_paths text[],
  raw_json jsonb,
  criado_em timestamptz default now(),
  unique (autopsia_id, creative_key)
);

create table if not exists autopsia_jobs (
  id uuid primary key default gen_random_uuid(),
  autopsia_id uuid not null references autopsias(id) on delete cascade,
  criativo_id uuid references autopsia_criativos(id) on delete cascade,
  tipo text not null,                         -- download|frames|transcrever
  status text not null default 'pendente',    -- pendente|processando|concluido|erro
  tentativas int not null default 0,
  erro text,
  criado_em timestamptz default now(),
  iniciado_em timestamptz,
  concluido_em timestamptz
);

create index if not exists idx_autopsia_criativos_autopsia on autopsia_criativos (autopsia_id);
create index if not exists idx_autopsia_jobs_fila on autopsia_jobs (status, criado_em);
create index if not exists idx_autopsia_jobs_autopsia on autopsia_jobs (autopsia_id);

alter table autopsias enable row level security;
alter table autopsia_criativos enable row level security;
alter table autopsia_jobs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'autopsias' and policyname = 'autopsias_publico') then
    create policy autopsias_publico on autopsias for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'autopsia_criativos' and policyname = 'autopsia_criativos_publico') then
    create policy autopsia_criativos_publico on autopsia_criativos for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'autopsia_jobs' and policyname = 'autopsia_jobs_publico') then
    create policy autopsia_jobs_publico on autopsia_jobs for all using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'autopsias') then
    alter publication supabase_realtime add table autopsias;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'autopsia_criativos') then
    alter publication supabase_realtime add table autopsia_criativos;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'autopsia_jobs') then
    alter publication supabase_realtime add table autopsia_jobs;
  end if;
end $$;
